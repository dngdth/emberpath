from __future__ import annotations

from dataclasses import dataclass
from math import inf
from typing import Hashable, Iterable


NodeKey = Hashable


@dataclass(frozen=True)
class GradientEdge:
    """An undirected physical link between two routing nodes."""

    left: NodeKey
    right: NodeKey
    payload: object | None = None

    def other(self, node: NodeKey) -> NodeKey:
        if node == self.left:
            return self.right
        if node == self.right:
            return self.left
        raise KeyError(f"Node {node!r} is not an endpoint of this edge")


@dataclass(frozen=True)
class GradientRoute:
    nodes: list[NodeKey]
    edges: list[GradientEdge]
    costs: dict[NodeKey, float]
    iterations: int


class GradientFieldRouter:
    """
    Multi-exit Gradient Field routing adapted from EscapeMesh.

    Exits advertise cost 0. During every synchronous tick, each reachable node
    selects a neighbour from the previous tick with the lowest cost and adopts
    ``neighbour_cost + 1``. Following the resulting descending gradient always
    leads toward the nearest reachable exit by LED-wire hop count.
    """

    def __init__(
        self,
        nodes: Iterable[NodeKey],
        edges: Iterable[GradientEdge],
        exits: Iterable[NodeKey],
        blocked: Iterable[NodeKey] = (),
    ) -> None:
        self.nodes = set(nodes)
        self.edges = list(edges)
        self.exits = set(exits) & self.nodes
        self.blocked = (set(blocked) & self.nodes) - self.exits
        self.adjacency: dict[NodeKey, list[tuple[NodeKey, GradientEdge]]] = {
            node: [] for node in self.nodes
        }

        for edge in self.edges:
            if edge.left not in self.nodes or edge.right not in self.nodes:
                continue
            if edge.left in self.blocked or edge.right in self.blocked:
                continue
            self.adjacency[edge.left].append((edge.right, edge))
            self.adjacency[edge.right].append((edge.left, edge))

        for neighbours in self.adjacency.values():
            neighbours.sort(key=lambda item: str(item[0]))

    def converge(self) -> tuple[dict[NodeKey, float], dict[NodeKey, tuple[NodeKey, GradientEdge]], int]:
        if not self.exits:
            raise ValueError("Topology does not contain an exit node")

        costs = {node: (0.0 if node in self.exits else inf) for node in self.nodes}
        parents: dict[NodeKey, tuple[NodeKey, GradientEdge]] = {}
        max_iterations = max(1, len(self.nodes))

        for iteration in range(1, max_iterations + 1):
            previous = costs.copy()
            next_parents = parents.copy()
            changed = False

            for node in sorted(self.nodes, key=str):
                if node in self.exits or node in self.blocked:
                    continue

                candidates = [
                    (previous[neighbour], str(neighbour), neighbour, edge)
                    for neighbour, edge in self.adjacency[node]
                    if previous[neighbour] < inf
                ]
                if not candidates:
                    continue

                # Parallel LED wires may connect the same pair of nodes. Use
                # an explicit key so Python never tries to compare edge
                # objects when cost and neighbour id are identical.
                best_cost, _, best_neighbour, best_edge = min(
                    candidates,
                    key=lambda candidate: (
                        candidate[0],
                        candidate[1],
                        str(candidate[3].payload),
                    ),
                )
                new_cost = best_cost + 1.0
                new_parent = (best_neighbour, best_edge)
                if new_cost != costs[node] or parents.get(node) != new_parent:
                    costs[node] = new_cost
                    next_parents[node] = new_parent
                    changed = True

            parents = next_parents
            if not changed:
                return costs, parents, iteration

        return costs, parents, max_iterations

    def route(self, start: NodeKey) -> GradientRoute:
        if start not in self.nodes:
            raise ValueError("Start node does not exist in the topology")
        if start in self.blocked:
            raise ValueError("Start node is blocked")

        costs, parents, iterations = self.converge()
        if costs[start] == inf:
            raise ValueError("No LED-wire path from the start node to an exit")

        nodes = [start]
        edges: list[GradientEdge] = []
        current = start
        seen: set[NodeKey] = set()

        while current not in self.exits:
            if current in seen or current not in parents:
                raise ValueError("Gradient field did not converge to an exit")
            seen.add(current)
            next_node, edge = parents[current]
            if costs[next_node] >= costs[current]:
                raise ValueError("Gradient route is not strictly descending")
            edges.append(edge)
            nodes.append(next_node)
            current = next_node

        return GradientRoute(nodes=nodes, edges=edges, costs=costs, iterations=iterations)
