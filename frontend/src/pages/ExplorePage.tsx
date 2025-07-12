import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactFlow, { Node, Edge, MarkerType, Position } from 'reactflow';
import dagre from 'dagre';
import RabbitFlow from '../components/RabbitFlow';
import MainNode from '../components/nodes/MainNode';
import { searchRabbitHole } from '../services/api';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 600;
const nodeHeight = 500;
const questionNodeWidth = 300;
const questionNodeHeight = 100;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({ 
    rankdir: 'LR', 
    nodesep: 800,
    ranksep: 500,
    marginx: 100,
    align: 'DL',
    ranker: 'tight-tree'
  });

  const allNodes = dagreGraph.nodes();
  allNodes.forEach(node => dagreGraph.removeNode(node));

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: node.id === 'main' ? nodeWidth : questionNodeWidth,
      height: node.id === 'main' ? nodeHeight : questionNodeHeight 
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - (node.id === 'main' ? nodeWidth / 2 : questionNodeWidth / 2),
        y: nodeWithPosition.y - (node.id === 'main' ? nodeHeight / 2 : questionNodeHeight / 2)
      },
      targetPosition: Position.Left,
      sourcePosition: Position.Right
    };
  });

  return { nodes: newNodes, edges };
};

interface Source {
  title: string;
  url: string;
  uri: string;
  author: string;
  image: string;
}

interface ImageData {
  url: string;
  thumbnail: string;
  description: string;
}

interface SearchResponse {
  response: string;
  followUpQuestions: string[];
  sources: Source[];
  images: ImageData[];
  contextualQuery: string;
}

interface ConversationMessage {
  user?: string;
  assistant?: string;
}

const nodeTypes = {
  mainNode: MainNode,
};

const ExplorePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [currentConcept, setCurrentConcept] = useState<string>('');
  const activeRequestRef = useRef<{ [key: string]: AbortController | null }>({});

  // Get search result from location state
  const searchResult = location.state?.searchResult as SearchResponse | null;
  const initialQuery = location.state?.query as string | '';

  useEffect(() => {
    // If no search result, redirect to home
    if (!searchResult) {
      navigate('/');
      return;
    }

    // Initialize flow with search result
    const mainNode: Node = {
      id: 'main',
      type: 'mainNode',
      data: {
        label: searchResult.contextualQuery || initialQuery,
        content: searchResult.response,
        images: searchResult.images?.map((img: ImageData) => img.url),
        sources: searchResult.sources,
        isExpanded: true
      },
      position: { x: 0, y: 0 },
      style: {
        width: nodeWidth,
        minHeight: '500px',
        background: '#1a1a1a',
        opacity: 1
      }
    };

    const followUpNodes: Node[] = searchResult.followUpQuestions.map((question: string, index: number) => ({
      id: `question-${index}`,
      type: 'default',
      data: { 
        label: question,
        isExpanded: false,
        content: '',
        images: [],
        sources: []
      },
      position: { x: 0, y: 0 },
      style: {
        width: questionNodeWidth,
        background: '#1a1a1a',
        color: '#fff',
        border: '1px solid #333',
        borderRadius: '8px',
        fontSize: '14px',
        textAlign: 'left',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer'
      }
    }));

    const followUpEdges: Edge[] = followUpNodes.map((_, index) => ({
      id: `edge-${index}`,
      source: 'main',
      target: `question-${index}`,
      style: { 
        stroke: 'rgba(248, 248, 248, 0.8)', 
        strokeWidth: 1.5
      },
      type: 'smoothstep',
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'rgba(248, 248, 248, 0.8)'
      }
    }));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      [mainNode, ...followUpNodes],
      followUpEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setCurrentConcept(searchResult.contextualQuery || initialQuery);
  }, [searchResult, initialQuery, navigate]);

  useEffect(() => {
    return () => {
      Object.values(activeRequestRef.current).forEach(controller => {
        if (controller) {
          controller.abort();
        }
      });
    };
  }, []);

  const handleNodeClick = async (node: Node) => {
    if (!node.id.startsWith('question-') || node.data.isExpanded) return;

    // Check if there are any active requests
    const hasActiveRequests = Object.values(activeRequestRef.current).some(controller => controller !== null);
    if (hasActiveRequests) return;

    if (activeRequestRef.current[node.id]) {
      activeRequestRef.current[node.id]?.abort();
    }

    const abortController = new AbortController();
    activeRequestRef.current[node.id] = abortController;

    const questionText = node.data.label;
    setIsLoading(true);

    try {
      const lastMainNode = nodes.find(n => n.type === 'mainNode');
      if (lastMainNode) {
        const newHistoryEntry: ConversationMessage = {
          user: lastMainNode.data.label,
          assistant: lastMainNode.data.content
        };
        setConversationHistory(prev => [...prev, newHistoryEntry]);
      }

      setNodes(prevNodes => prevNodes.map(n => {
        if (n.id === node.id) {
          return {
            ...n,
            type: 'mainNode',
            style: {
              ...n.style,
              width: nodeWidth,
              height: nodeHeight
            },
            data: { 
              ...n.data, 
              content: 'Loading...',
              isExpanded: true 
            }
          };
        }
        return n;
      }));

      const response = await searchRabbitHole({
        query: questionText,
        previousConversation: conversationHistory,
        concept: currentConcept,
        followUpMode: 'expansive'
      }, abortController.signal);

      if (activeRequestRef.current[node.id] === abortController) {
        setNodes(prevNodes => {
          const transformedNodes = prevNodes.map(n => {
            if (n.id === node.id) {
              return {
                ...n,
                type: 'mainNode',
                style: {
                  ...n.style,
                  width: nodeWidth,
                  minHeight: '500px',
                  background: '#1a1a1a',
                  opacity: 1,
                  cursor: 'default' 
                },
                data: {
                  label: response.contextualQuery || questionText,
                  content: response.response,
                  images: response.images?.map((img: ImageData) => img.url),
                  sources: response.sources,
                  isExpanded: true 
                }
              };
            }
            return n;
          });

          const newFollowUpNodes: Node[] = response.followUpQuestions.map((question: string, index: number) => {
            const uniqueId = `question-${node.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`;
            return {
              id: uniqueId,
              type: 'default',
              data: { 
                label: question,
                isExpanded: false,
                content: '',
                images: [],
                sources: []
              },
              position: { x: 0, y: 0 },
              style: {
                width: questionNodeWidth,
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #333',
                borderRadius: '8px',
                fontSize: '14px',
                textAlign: 'left',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer' 
              }
            };
          });

          const currentEdges = edges;
          const newEdges: Edge[] = newFollowUpNodes.map((followUpNode) => ({
            id: `edge-${followUpNode.id}`,
            source: node.id,
            target: followUpNode.id,
            style: {
              stroke: 'rgba(248, 248, 248, 0.8)',
              strokeWidth: 1.5
            },
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: 'rgba(248, 248, 248, 0.8)'
            }
          }));

          const { nodes: finalLayoutedNodes } = getLayoutedElements(
            [...transformedNodes, ...newFollowUpNodes],
            [...currentEdges, ...newEdges]
          );

          setEdges([...currentEdges, ...newEdges]);

          return finalLayoutedNodes;
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError' && activeRequestRef.current[node.id] === abortController) {
        console.error('Failed to process node click:', error);

        setNodes(prevNodes => prevNodes.map(n => {
          if (n.id === node.id) {
            return {
              ...node,
              data: {
                ...node.data,
                isExpanded: false
              },
              style: {
                ...node.style,
                opacity: 1
              }
            };
          }
          return n;
        }));
      }
    } finally {
      if (activeRequestRef.current[node.id] === abortController) {
        activeRequestRef.current[node.id] = null;
        setIsLoading(false);
      }
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  if (!searchResult) {
    return null; // This should not render since we redirect to home
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Back to Home Button */}
      <button
        onClick={handleBackToHome}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-[#111111] border border-white/10 rounded-full text-white/70 hover:text-white/90 hover:bg-white/5 transition-all duration-300 group"
      >
        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-sm font-light">Back to Search</span>
      </button>

      {/* GitHub Link */}
      <a
        href="https://github.com/AsyncFuncAI/rabbitholes"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed top-6 right-6 z-50 transform hover:scale-110 transition-transform duration-300 group"
      >
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-[#2c2c2c] via-[#3c3c3c] to-[#2c2c2c] rounded-full opacity-0 group-hover:opacity-30 transition duration-500 blur-sm animate-gradient-xy"></div>
          <svg
            className="w-8 h-8 text-white/70 hover:text-white/90 transition-colors duration-300"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </div>
      </a>

      <RabbitFlow 
        initialNodes={nodes} 
        initialEdges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
      />
    </div>
  );
};

export default ExplorePage; 