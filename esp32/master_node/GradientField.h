#ifndef GRADIENT_FIELD_H
#define GRADIENT_FIELD_H

#include <Arduino.h>

#define MAX_NODES 20
#define MAX_EDGES 30
#define INF_COST 999999.0f

enum NodeStatus {
    NODE_NORMAL = 0,
    NODE_DANGER = 1,
    NODE_EXIT   = 2
};

enum EdgeDirection {
    DIR_NONE = 0,
    DIR_A_TO_B = 1,  // Dòng chảy từ nodeA -> nodeB (cost A > cost B)
    DIR_B_TO_A = 2,  // Dòng chảy từ nodeB -> nodeA (cost B > cost A)
    DIR_BLOCKED = 3  // Đoạn LED chạm node nguy hiểm / cháy
};

struct GradientNode {
    int id;
    NodeStatus status;
    float cost;
};

struct GradientEdge {
    int id;
    int nodeA;
    int nodeB;
    int startLedIndex;
    int numLeds;
    EdgeDirection direction;
};

class GradientFieldRouter {
public:
    GradientFieldRouter();
    
    void addNode(int id, NodeStatus status = NODE_NORMAL);
    void addEdge(int id, int nodeA, int nodeB, int startLedIndex = 0, int numLeds = 0);
    
    void setNodeStatus(int id, NodeStatus status);
    NodeStatus getNodeStatus(int id);
    float getNodeCost(int id);
    
    bool converge();
    EdgeDirection getEdgeDirection(int edgeId);
    
    int getNodeCount() const { return _nodeCount; }
    int getEdgeCount() const { return _edgeCount; }
    const GradientNode& getNode(int index) const { return _nodes[index]; }
    const GradientEdge& getEdge(int index) const { return _edges[index]; }

private:
    GradientNode _nodes[MAX_NODES];
    GradientEdge _edges[MAX_EDGES];
    int _nodeCount;
    int _edgeCount;

    int findNodeIndex(int id);
    int findEdgeIndex(int id);
};

#endif
