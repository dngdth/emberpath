#include "GradientField.h"

GradientFieldRouter::GradientFieldRouter() : _nodeCount(0), _edgeCount(0) {}

void GradientFieldRouter::addNode(int id, NodeStatus status) {
    if (_nodeCount >= MAX_NODES) return;
    _nodes[_nodeCount].id = id;
    _nodes[_nodeCount].status = status;
    _nodes[_nodeCount].cost = (status == NODE_EXIT) ? 0.0f : INF_COST;
    _nodeCount++;
}

void GradientFieldRouter::addEdge(int id, int nodeA, int nodeB, int startLedIndex, int numLeds) {
    if (_edgeCount >= MAX_EDGES) return;
    _edges[_edgeCount].id = id;
    _edges[_edgeCount].nodeA = nodeA;
    _edges[_edgeCount].nodeB = nodeB;
    _edges[_edgeCount].startLedIndex = startLedIndex;
    _edges[_edgeCount].numLeds = numLeds;
    _edges[_edgeCount].direction = DIR_NONE;
    _edgeCount++;
}

int GradientFieldRouter::findNodeIndex(int id) {
    for (int i = 0; i < _nodeCount; i++) {
        if (_nodes[i].id == id) return i;
    }
    return -1;
}

int GradientFieldRouter::findEdgeIndex(int id) {
    for (int i = 0; i < _edgeCount; i++) {
        if (_edges[i].id == id) return i;
    }
    return -1;
}

void GradientFieldRouter::setNodeStatus(int id, NodeStatus status) {
    int idx = findNodeIndex(id);
    if (idx != -1) {
        _nodes[idx].status = status;
    }
}

NodeStatus GradientFieldRouter::getNodeStatus(int id) {
    int idx = findNodeIndex(id);
    return (idx != -1) ? _nodes[idx].status : NODE_NORMAL;
}

float GradientFieldRouter::getNodeCost(int id) {
    int idx = findNodeIndex(id);
    return (idx != -1) ? _nodes[idx].cost : INF_COST;
}

bool GradientFieldRouter::converge() {
    // 1. Khởi tạo cost
    for (int i = 0; i < _nodeCount; i++) {
        if (_nodes[i].status == NODE_EXIT) {
            _nodes[i].cost = 0.0f;
        } else {
            _nodes[i].cost = INF_COST;
        }
    }

    // 2. Thuật toán quy hoạch động lan truyền Gradient Field
    bool changed = true;
    int iter = 0;
    while (changed && iter < _nodeCount) {
        changed = false;
        iter++;

        for (int e = 0; e < _edgeCount; e++) {
            int idxA = findNodeIndex(_edges[e].nodeA);
            int idxB = findNodeIndex(_edges[e].nodeB);

            if (idxA == -1 || idxB == -1) continue;

            // Thử cập nhật cost node A từ node B
            if (_nodes[idxA].status != NODE_DANGER && _nodes[idxA].status != NODE_EXIT && _nodes[idxB].status != NODE_DANGER) {
                if (_nodes[idxB].cost < INF_COST) {
                    float newCost = _nodes[idxB].cost + 1.0f;
                    if (newCost < _nodes[idxA].cost) {
                        _nodes[idxA].cost = newCost;
                        changed = true;
                    }
                }
            }

            // Thử cập nhật cost node B từ node A
            if (_nodes[idxB].status != NODE_DANGER && _nodes[idxB].status != NODE_EXIT && _nodes[idxA].status != NODE_DANGER) {
                if (_nodes[idxA].cost < INF_COST) {
                    float newCost = _nodes[idxA].cost + 1.0f;
                    if (newCost < _nodes[idxB].cost) {
                        _nodes[idxB].cost = newCost;
                        changed = true;
                    }
                }
            }
        }
    }

    // 3. Tính toán hướng mũi tên (EdgeDirection) cho từng đoạn dây LED
    for (int e = 0; e < _edgeCount; e++) {
        int idxA = findNodeIndex(_edges[e].nodeA);
        int idxB = findNodeIndex(_edges[e].nodeB);

        if (idxA == -1 || idxB == -1) {
            _edges[e].direction = DIR_NONE;
            continue;
        }

        if (_nodes[idxA].status == NODE_DANGER || _nodes[idxB].status == NODE_DANGER) {
            _edges[e].direction = DIR_BLOCKED;
        } else if (_nodes[idxA].cost > _nodes[idxB].cost && _nodes[idxB].cost < INF_COST) {
            _edges[e].direction = DIR_A_TO_B; // Cost A cao hơn B -> chảy từ A về B
        } else if (_nodes[idxB].cost > _nodes[idxA].cost && _nodes[idxA].cost < INF_COST) {
            _edges[e].direction = DIR_B_TO_A; // Cost B cao hơn A -> chảy từ B về A
        } else {
            _edges[e].direction = DIR_NONE;
        }
    }

    return true;
}

EdgeDirection GradientFieldRouter::getEdgeDirection(int edgeId) {
    int idx = findEdgeIndex(edgeId);
    return (idx != -1) ? _edges[idx].direction : DIR_NONE;
}
