import React, { useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  NodeTypes,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Connection,
  useNodesState,
  useEdgesState,
  Panel,
  Controls,
  Background,
  BackgroundVariant,
  addEdge,
  ConnectionLineType,
  Position,
  MiniMap,
} from 'reactflow';
import dagre from '@dagrejs/dagre';
import 'reactflow/dist/style.css';

import { usePostHog } from 'posthog-js/react';
import { useTheme } from '../contexts/ThemeContext';

interface RabbitFlowProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  nodeTypes: NodeTypes;
  onNodeClick?: (node: Node) => void;
}

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Check if any nodes are expanded
  const hasExpandedNodes = nodes.some(node => node.type === 'mainNode' && node.data.isExpanded);

  dagreGraph.setGraph({
    rankdir: 'LR',
    nodesep: 100,
    ranksep: hasExpandedNodes ? 200 : 100,  // Adjust vertical spacing based on expansion
    marginx: 200,
    marginy: hasExpandedNodes ? 200 : 100,
    align: 'UL',
    ranker: 'tight-tree'
  });

  // Add nodes to the graph with their actual dimensions
  nodes.forEach((node) => {
    const isMainNode = node.type === 'mainNode';
    dagreGraph.setNode(node.id, {
      width: isMainNode ? 600 : 300,
      height: isMainNode ? 500 : 100
    });
  });

  // Add edges to the graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Apply layout
  dagre.layout(dagreGraph);

  // Get the positioned nodes
  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const isMainNode = node.type === 'mainNode';
    const width = isMainNode ? 600 : 300;
    const height = isMainNode ? 500 : 100;
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
    };
  });

  return { nodes: newNodes, edges };
};

const RabbitFlow: React.FC<RabbitFlowProps> = ({
  initialNodes,
  initialEdges,
  nodeTypes,
  onNodeClick
}) => {
  const { theme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  React.useEffect(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [initialNodes, initialEdges]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: ConnectionLineType.SmoothStep,
            animated: true
          },
          eds
        )
      ),
    [setEdges]
  );

  const posthog = usePostHog();

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (posthog) {
        posthog.capture('node_clicked', {
          nodeId: node.id,
          nodeType: node.type,
          label: node.data?.label || '',
          position: node.position,
        });
      }

      if (onNodeClick) {
        onNodeClick(node);
      }
    },
    [onNodeClick, posthog]  // important: add posthog to dependency array
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)' }
        }}
        fitView
        zoomOnScroll={true}
        panOnScroll={false}
        zoomOnPinch={true}
        preventScrolling={false}
        style={{ backgroundColor: theme === 'dark' ? '#000000' : '#f8f9fa' }}
      >
        <Controls
          className={theme === 'dark' ? '!bg-[#111111] !border-gray-800' : '!bg-white !border-gray-300'}
        />
        <MiniMap
          style={{
            backgroundColor: theme === 'dark' ? '#111111' : '#ffffff',
            border: theme === 'dark' ? '1px solid #333333' : '1px solid #e5e5e5',
            borderRadius: '4px',
          }}
          nodeColor={theme === 'dark' ? '#666666' : '#cccccc'}
          maskColor={theme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
          className="!bottom-4 !right-4"
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={12}
          size={1}
          color={theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}
        />
      </ReactFlow>
    </div>
  );
};

export default RabbitFlow; 