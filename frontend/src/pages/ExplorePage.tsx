import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Node, Edge, MarkerType, Position } from 'reactflow';
import dagre from 'dagre';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import RabbitFlow from '../components/RabbitFlow';
import MainNode from '../components/nodes/MainNode';
import FollowUpInputNode from '../components/nodes/FollowUpInputNode';
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
    const isSmallNode = node.type === 'default';
    dagreGraph.setNode(node.id, { 
      width: isSmallNode ? questionNodeWidth : nodeWidth,
      height: isSmallNode ? questionNodeHeight : nodeHeight 
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  try {
    dagre.layout(dagreGraph);
  } catch (error) {
    console.error('Dagre layout failed:', error);
    // Return nodes with simple grid layout as fallback
    const gridNodes = nodes.map((node, index) => ({
      ...node,
      position: { 
        x: (index % 2) * 800, 
        y: Math.floor(index / 2) * 600 
      },
      targetPosition: Position.Left,
      sourcePosition: Position.Right
    }));
    return { nodes: gridNodes, edges };
  }

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const isSmallNode = node.type === 'default';
    const width = isSmallNode ? questionNodeWidth : nodeWidth;
    const height = isSmallNode ? questionNodeHeight : nodeHeight;
    
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2
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
  nodeId: string;
  newFollowUpNodeIds: string[];
}

interface ConversationMessage {
  user?: string;
  assistant?: string;
}

const nodeTypes = {
  mainNode: MainNode,
  followUpInputNode: FollowUpInputNode,
};

const ExplorePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, username } = useAuth();
  const { theme } = useTheme();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [currentConcept, setCurrentConcept] = useState<string>('');
  const activeRequestRef = useRef<{ [key: string]: AbortController | null }>({});

  // Function to load conversation tree from backend data
  const loadConversationTree = (treeData: any, memoTitle: string) => {
    try {
      // Transform tree data to nodes and edges
      const treeNodes: Node[] = [];
      const treeEdges: Edge[] = [];

      // Handle the actual backend response structure
      if (treeData.nodes && typeof treeData.nodes === 'object') {
        const nodesMap = treeData.nodes;
        
        // Process each node in the tree
        Object.values(nodesMap).forEach((nodeData: any) => {
          // Determine if this is a pending or completed node
          const isPending = nodeData.status === 'pending' || !nodeData.answer;
          
          const node: Node = {
            id: nodeData.id,
            type: isPending ? 'default' : 'mainNode',
            data: {
              label: nodeData.question || memoTitle || 'Node',
              content: isPending ? '' : nodeData.answer,
              images: nodeData.imageUrls || [],
              sources: [], // Backend doesn't provide sources in this format
              isExpanded: !isPending,
              onAskFollowUp: () => handleAskFollowUp(nodeData.id)
            },
            position: { x: 0, y: 0 },
                          style: isPending ? {
                width: questionNodeWidth,
                background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                color: theme === 'dark' ? '#fff' : '#000',
                border: theme === 'dark' ? '1px solid #333' : '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '14px',
                textAlign: 'left',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer'
              } : {
                width: nodeWidth,
                minHeight: '500px',
                background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                opacity: 1
              }
          };
          treeNodes.push(node);

          // Create edges based on parent-child relationships
          if (nodeData.parentId && Array.isArray(nodeData.parentId) && nodeData.parentId.length > 0) {
            nodeData.parentId.forEach((parentId: string) => {
              const edge: Edge = {
                id: `edge-${parentId}-${nodeData.id}`,
                source: parentId,
                target: nodeData.id,
                type: 'custom',
                animated: false,
                data: { isSuggestion: isPending }, // Mark pending nodes as suggestions
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: theme === 'dark' ? '#ffffff' : 'rgba(0, 0, 0, 0.6)'
                }
              };
              treeEdges.push(edge);
            });
          }
        });
      }

      // Layout the nodes and edges using dagre
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        treeNodes,
        treeEdges
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      
      setCurrentConcept(memoTitle || 'Conversation Tree');
    } catch (error) {
      console.error('Error loading conversation tree:', error);
      navigate('/home');
    }
  };

  // Get data from location state
  const searchResult = location.state?.searchResult as SearchResponse | null;
  const initialQuery = location.state?.query as string | '';
  const treeData = location.state?.treeData as any | null;
  const memoTitle = location.state?.memoTitle as string | '';
  const memoId = location.state?.memoId as number | null;

  useEffect(() => {
    // If no search result and no tree data, redirect to home
    if (!searchResult && !treeData) {
      navigate('/home');
      return;
    }

    // If we have tree data, load the conversation tree
    if (treeData) {
      loadConversationTree(treeData, memoTitle);
      return;
    }

    // Initialize flow with search result
    if (!searchResult) {
      navigate('/home');
      return;
    }

    const mainNode: Node = {
      id: searchResult.nodeId,
      type: 'mainNode',
      data: {
        label: searchResult.contextualQuery || initialQuery,
        content: searchResult.response,
        images: searchResult.images?.map((img: ImageData) => img.url),
        sources: searchResult.sources,
        isExpanded: true,
        onAskFollowUp: () => handleAskFollowUp(searchResult.nodeId)
      },
      position: { x: 0, y: 0 },
      style: {
        width: nodeWidth,
        minHeight: '500px',
        background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
        opacity: 1
      }
    };

    const followUpNodes: Node[] = searchResult.followUpQuestions.map((question: string, index: number) => ({
      id: searchResult.newFollowUpNodeIds[index],
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
        background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
        color: theme === 'dark' ? '#fff' : '#000',
        border: theme === 'dark' ? '1px solid #333' : '1px solid #e5e5e5',
        borderRadius: '8px',
        fontSize: '14px',
        textAlign: 'left',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer'
      }
    }));

    const followUpEdges: Edge[] = followUpNodes.map((node, index) => ({
      id: `edge-${searchResult.nodeId}-${node.id}`,
      source: searchResult.nodeId,
      target: node.id,
      type: 'custom',
      animated: false,
      data: { isSuggestion: true }, // These are suggestion nodes
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: theme === 'dark' ? '#ffffff' : 'rgba(0, 0, 0, 0.6)'
      }
    }));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      [mainNode, ...followUpNodes],
      followUpEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setCurrentConcept(searchResult.contextualQuery || initialQuery);
  }, [searchResult, initialQuery, navigate, treeData, memoTitle, memoId]);

  // Update existing nodes' styles when theme changes
  useEffect(() => {
    setNodes(prevNodes => 
      prevNodes.map(node => ({
        ...node,
        style: {
          ...node.style,
          background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
          color: theme === 'dark' ? '#fff' : '#000',
          border: theme === 'dark' ? '1px solid #333' : '1px solid #e5e5e5',
        }
      }))
    );
  }, [theme]);

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
    // Handle clicks on pending nodes (both search flow and tree flow use real backend IDs now)
    const isPendingNode = node.type === 'default' && !node.data.isExpanded;
    
    if (!isPendingNode || node.data.isExpanded) return;

    // Check if there are any active requests
    const hasActiveRequests = Object.values(activeRequestRef.current).some(controller => controller !== null);
    if (hasActiveRequests) return;

    if (activeRequestRef.current[node.id]) {
      activeRequestRef.current[node.id]?.abort();
    }

    const abortController = new AbortController();
    activeRequestRef.current[node.id] = abortController;

    const questionText = node.data.label;

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
        userId: 1, // Default user ID for now
        memoId: memoId || 1, // Use memoId from state or fallback to 1
        nodeId: node.id, // Use the node ID as the nodeId
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
                  background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                  opacity: 1,
                  cursor: 'default' 
                },
                data: {
                  label: response.contextualQuery || questionText,
                  content: response.response,
                  images: response.images?.map((img: ImageData) => img.url),
                  sources: response.sources,
                  isExpanded: true,
                  onAskFollowUp: () => handleAskFollowUp(node.id)
                }
              };
            }
            return n;
          });

          // Update the edge from main to this node to be solid (complete)
          setEdges(prevEdges => 
            prevEdges.map(edge => 
              edge.target === node.id 
                ? { ...edge, data: { isSuggestion: false } }
                : edge
            )
          );

          const newFollowUpNodes: Node[] = response.followUpQuestions.map((question: string, index: number) => {
            return {
              id: response.newFollowUpNodeIds[index],
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
                background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                color: theme === 'dark' ? '#fff' : '#000',
                border: theme === 'dark' ? '1px solid #333' : '1px solid #e5e5e5',
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
            type: 'custom',
            animated: false,
            data: { isSuggestion: true }, // These are new suggestion nodes
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: theme === 'dark' ? '#ffffff' : 'rgba(0, 0, 0, 0.6)'
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
      }
    }
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  // Add a ref to track the last click time per node to prevent rapid clicks
  const lastClickRef = useRef<Map<string, number>>(new Map());
  const CLICK_DEBOUNCE_MS = 500; // 500ms debounce

  const handleAskFollowUp = (nodeId: string) => {
    // Debounce: prevent clicks within 500ms
    const now = Date.now();
    const lastClick = lastClickRef.current.get(nodeId) || 0;
    if (now - lastClick < CLICK_DEBOUNCE_MS) {
      return;
    }
    lastClickRef.current.set(nodeId, now);
    
    // Check if there's already a follow-up input node for this parent
    const existingFollowUpNode = nodes.find(n => 
      n.type === 'followUpInputNode' && 
      n.data.parentNodeId === nodeId
    );
    
    if (existingFollowUpNode) {
      // Remove existing follow-up input node and its edge (toggle off)
      setNodes(prevNodes => prevNodes.filter(n => n.id !== existingFollowUpNode.id));
      setEdges(prevEdges => prevEdges.filter(e => e.target !== existingFollowUpNode.id));
      return;
    }
    
    // Always remove any existing follow-up input nodes first (ensure clean state)  
    setNodes(prevNodes => {
      const filteredNodes = prevNodes.filter(n => n.type !== 'followUpInputNode');
      return filteredNodes;
    });
    
    setEdges(prevEdges => {
      const filteredEdges = prevEdges.filter(e => 
        !e.target?.startsWith('followup-input-')
      );
      return filteredEdges;
    });
    
    // Use setTimeout to ensure state cleanup is complete before creating new node
    setTimeout(() => {
      // Create a new follow-up input node (toggle on)
      const followUpNodeId = `followup-input-${nodeId}-${Date.now()}`;
    
    // Find the parent node to position the input node relative to it
    const parentNode = nodes.find(n => n.id === nodeId);
    const parentPosition = parentNode?.position || { x: 0, y: 0 };
    
    const followUpNode: Node = {
      id: followUpNodeId,
      type: 'followUpInputNode',
      data: {
        parentNodeId: nodeId,
        onSubmit: (response: any) => {
          // Handle the follow-up response
          console.log('Follow-up response:', response);
          // TODO: Create the actual result node from the response
          // Remove the input node after successful submission
          setNodes(prevNodes => prevNodes.filter(n => n.id !== followUpNodeId));
          setEdges(prevEdges => prevEdges.filter(e => e.target !== followUpNodeId));
        },
        onCancel: () => {
          // Remove the follow-up input node and its edge
          setNodes(prevNodes => prevNodes.filter(n => n.id !== followUpNodeId));
          setEdges(prevEdges => prevEdges.filter(e => e.target !== followUpNodeId));
        }
      },
      position: { 
        x: parentPosition.x + 600, // Position to the right of parent
        y: parentPosition.y 
      },
      style: {
        width: 400,
        background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
        border: theme === 'dark' ? '1px solid #333' : '1px solid #e5e5e5',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }
    };

    // Add the follow-up input node
    setNodes(prevNodes => [...prevNodes, followUpNode]);

    // Create an edge from the parent node to the follow-up input node
    const newEdge: Edge = {
      id: `edge-${followUpNodeId}`,
      source: nodeId,
      target: followUpNodeId,
      type: 'custom',
      animated: false,
      data: { isSuggestion: false }, // This is a complete node (follow-up input)
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: theme === 'dark' ? '#ffffff' : 'rgba(0, 0, 0, 0.6)'
      }
    };

    setEdges(prevEdges => [...prevEdges, newEdge]);
    }, 50); // 50ms delay to ensure state cleanup
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!searchResult && !treeData) {
    return null; // This should not render since we redirect to home
  }

  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background relative transition-colors duration-300">
      {/* Back to Home Button */}
      <button
        onClick={handleBackToHome}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#111111] border border-gray-300 dark:border-white/10 rounded-full text-gray-600 dark:text-white/70 hover:text-gray-800 dark:hover:text-white/90 hover:bg-gray-100 dark:hover:bg-white/5 transition-all duration-300 group shadow-lg"
      >
        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-sm font-light">Back to Search</span>
      </button>

      {/* User Menu */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center space-x-4">
        <div className="text-light-text-secondary dark:text-dark-text-secondary text-sm">
          Welcome, <span className="text-light-text-primary dark:text-dark-text-primary font-medium">{username}</span>
        </div>
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="px-3 py-1 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800/30 rounded-md text-red-600 dark:text-red-400 text-sm hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
        >
          Logout
        </button>
      </div>

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
            className="w-8 h-8 text-gray-600 dark:text-white/70 hover:text-gray-800 dark:hover:text-white/90 transition-colors duration-300"
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