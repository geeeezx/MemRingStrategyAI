import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import PresetCard from '../components/PresetCard';
import FileUpload from '../components/FileUpload';
import { createMemo, getUserMemos, getConversationTree, uploadFileAndAnalyze } from '../services/api';
import { PresetCard as PresetCardType } from '../types/card';
import { createCardFromChatMessage } from '../utils/cardUtils';
import '../styles/search.css';

interface CreateMemoResponse {
  memoId: number;
  title: string;
  tags: string[];
  rootNodeId: string;
  answer: string;
  followUpQuestions: string[];
  newFollowUpNodeIds: string[];
  imageUrls: string[];
  sources: Array<{
    title: string;
    url: string;
    uri: string;
    author: string;
    image: string;
  }>;
  images: Array<{
    url: string;
    thumbnail: string;
    description: string;
  }>;
}

// 用户创建的卡片数据
const USER_CARDS: PresetCardType[] = [
  {
    id: 'consciousness',
    title: 'Consciousness & AI',
    date: 'Last updated Dec 15 at 2:30 pm',
    tags: ['AI', 'Philosophy', 'Consciousness'],
    query: 'How does artificial intelligence relate to human consciousness and what are the philosophical implications?',
    images: [
      'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=300&h=200&fit=crop'
    ],
    color: 'from-blue-500/20 to-cyan-500/20'
  },
  {
    id: 'quantum',
    title: 'Quantum Reality',
    date: 'Last updated Dec 14 at 11:45 am',
    tags: ['Physics', 'Quantum', 'Reality'],
    query: 'What are the implications of quantum mechanics for our understanding of reality and consciousness?',
    images: [
      'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=300&h=200&fit=crop'
    ],
    color: 'from-purple-500/20 to-pink-500/20'
  },
  {
    id: 'ancient-wisdom',
    title: 'Ancient Wisdom',
    date: 'Last updated Dec 13 at 4:20 pm',
    tags: ['History', 'Wisdom', 'Philosophy'],
    query: 'How do ancient philosophical and spiritual traditions provide insights for modern challenges?',
    images: [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=300&h=200&fit=crop'
    ],
    color: 'from-amber-500/20 to-orange-500/20'
  }
];

// 社区卡片数据
const COMMUNITY_CARDS: PresetCardType[] = [
  {
    id: 'climate-change',
    title: 'Climate Change Impact',
    date: 'Last updated Dec 12 at 9:15 am',
    tags: ['Environment', 'Science', 'Global'],
    query: 'What are the most significant impacts of climate change on global ecosystems and human societies?',
    images: [
      'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&h=200&fit=crop'
    ],
    color: 'from-green-500/20 to-emerald-500/20'
  },
  {
    id: 'blockchain-future',
    title: 'Blockchain Revolution',
    date: 'Last updated Dec 11 at 3:45 pm',
    tags: ['Technology', 'Blockchain', 'Future'],
    query: 'How will blockchain technology transform various industries in the next decade?',
    images: [
      'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=300&h=200&fit=crop'
    ],
    color: 'from-indigo-500/20 to-purple-500/20'
  },
  {
    id: 'space-exploration',
    title: 'Space Exploration',
    date: 'Last updated Dec 10 at 7:30 pm',
    tags: ['Space', 'Science', 'Exploration'],
    query: 'What are the latest developments in space exploration and their implications for humanity?',
    images: [
      'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&h=200&fit=crop'
    ],
    color: 'from-slate-500/20 to-gray-500/20'
  },
  {
    id: 'mental-health',
    title: 'Mental Health Awareness',
    date: 'Last updated Dec 9 at 2:20 pm',
    tags: ['Health', 'Psychology', 'Wellness'],
    query: 'How can we better understand and support mental health in modern society?',
    images: [
      'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=200&fit=crop'
    ],
    color: 'from-pink-500/20 to-rose-500/20'
  },
  {
    id: 'artificial-intelligence',
    title: 'AI Ethics & Future',
    date: 'Last updated Dec 8 at 11:10 am',
    tags: ['AI', 'Ethics', 'Technology'],
    query: 'What are the ethical considerations and future implications of artificial intelligence development?',
    images: [
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=300&h=200&fit=crop',
      'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=300&h=200&fit=crop'
    ],
    color: 'from-cyan-500/20 to-blue-500/20'
  }
];

const HomePage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userMemos, setUserMemos] = useState<PresetCardType[]>([]);
  const [dynamicCards, setDynamicCards] = useState<PresetCardType[]>([]);
  const [isLoadingMemos, setIsLoadingMemos] = useState(true);
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const navigate = useNavigate();
  const { logout, username } = useAuth();
  const { theme } = useTheme();

  // Load user memos from backend
  useEffect(() => {
    const loadUserMemos = async () => {
      try {
        setIsLoadingMemos(true);
        const memos = await getUserMemos(1); // Todo: Using userId 1 for now
        console.log('Loaded memos from backend:', memos);
        
        // Transform backend memo data to frontend card format
        const transformedMemos: PresetCardType[] = memos.map((memo: any) => ({
          id: memo.id.toString(),
          title: memo.title || 'Untitled Memo',
          date: `Last updated ${new Date(memo.updated_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          })} at ${new Date(memo.updated_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}`,
          tags: memo.tags || [],
          query: memo.title || 'Untitled Memo', // Using title as query for now
          images: memo.image_urls && memo.image_urls.length > 0 
            ? memo.image_urls.slice(0, 2) 
            : [
                'https://images.unsplash.com/photo-1516110833967-0b5656ca2673?w=300&h=200&fit=crop',
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop'
              ],
          color: 'from-indigo-500/20 to-blue-500/20'
        }));
        
        setUserMemos(transformedMemos);
      } catch (error) {
        console.error('Failed to load user memos:', error);
        // Fallback to hardcoded memos if API fails
        setUserMemos(USER_CARDS);
      } finally {
        setIsLoadingMemos(false);
      }
    };

    loadUserMemos();
  }, []);

  // 合并用户卡片和动态卡片
  const allUserCards = [...userMemos, ...dynamicCards];

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    
    try {
      console.log('HomePage: Starting createMemo with query:', query.trim());
      
      const response: CreateMemoResponse = await createMemo({
        query: query.trim(),
        userId: 1, // Default user ID for now
        provider: 'gemini'
      });

      console.log('HomePage: CreateMemo response:', response);

      // Navigate to explore page with search results (transform createMemo response to searchResult format)
      navigate('/explore', { 
        state: { 
          searchResult: {
            response: response.answer,
            followUpQuestions: response.followUpQuestions,
            contextualQuery: query.trim(),
            nodeId: response.rootNodeId,
            newFollowUpNodeIds: response.newFollowUpNodeIds,
            sources: response.sources,
            images: response.images,
          },
          query: query.trim(),
          memoId: response.memoId,
          memoTitle: response.title
        }
      });
    } catch (error) {
      console.error('CreateMemo failed:', error);
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    console.log('File selected for upload:', file);
    setSelectedFile(file);
    
    setIsLoading(true);
    try {
      // Use the real API when backend is ready, otherwise use mock
      let response;
      
      try {
        // Try to call the real API first
        response = await uploadFileAndAnalyze({
          file: file,
          userId: 1, // Default user ID for now
          provider: 'gemini'
        });
        console.log('File upload API response:', response);
      } catch (apiError) {
        console.log('Backend file upload API not available yet, using mock response');
        
        // Fallback to mock response when backend API is not ready
        response = {
          memoId: Date.now(),
          rootNodeId: `file-${Date.now()}`,
          title: `Analysis of ${file.name}`,
          answer: `File uploaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB). Analysis will be available once the backend file processing API is implemented.`,
          followUpQuestions: [
            "What are the key insights from this file?",
            "How can this information be applied?",
            "What patterns or trends are evident?"
          ],
          newFollowUpNodeIds: [],
          sources: [],
          images: []
        };
      }
      
      // Navigate to explore page with the file upload result (same format as search)
      navigate('/explore', { 
        state: { 
          searchResult: {
            response: response.answer,
            followUpQuestions: response.followUpQuestions,
            contextualQuery: `File: ${file.name}`,
            nodeId: response.rootNodeId,
            newFollowUpNodeIds: response.newFollowUpNodeIds,
            sources: response.sources,
            images: response.images,
          },
          query: `File: ${file.name}`,
          memoId: response.memoId,
          memoTitle: response.title
        }
      });
    } catch (error) {
      console.error('File upload failed:', error);
      setIsLoading(false);
    }
  };

  const handleCardClick = async (card: PresetCardType) => {
    try {
      setIsLoading(true);
      
      // Load the conversation tree for this memo
      const treeData = await getConversationTree(parseInt(card.id), 1); // Using userId 1 for now
      
      // Navigate to explore page with tree data
      navigate('/explore', { 
        state: { 
          treeData: treeData,
          memoTitle: card.title,
          memoId: parseInt(card.id)
        } 
      });
    } catch (error) {
      console.error('Failed to load conversation tree:', error);
      // Fallback: set the query and do a search
      setQuery(card.query);
    } finally {
      setIsLoading(false);
    }
  };

  // 示例：添加动态卡片的函数（用于演示）
  const addDynamicCard = (title: string, query: string) => {
    const newCard = createCardFromChatMessage(
      title,
      query,
      `conversation-${Date.now()}`,
      1
    );
    setDynamicCards(prev => [newCard, ...prev]);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background-light dark:bg-[#0A0A0A] transition-colors duration-300">
      {/* User Menu */}
      <div className="fixed top-6 left-6 z-50 flex items-center space-x-4">
        <div className="text-text-secondary-light dark:text-white/70 text-sm">
          Welcome, <span className="text-text-primary-light dark:text-white/90 font-medium">{username}</span>
        </div>
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="px-3 py-1 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800/30 rounded-md text-red-600 dark:text-red-400 text-sm hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
        >
          Logout
        </button>
      </div>

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

      <div className="w-full max-w-7xl mx-auto px-6 pt-20">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="mb-8 animate-float">
            <svg className="w-16 h-16 mx-auto animate-pulse-glow" viewBox="0 0 24 24" fill="none" stroke={theme === 'light' ? 'rgba(25, 118, 210, 0.8)' : 'rgba(255, 255, 255, 0.8)'} strokeWidth="1">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
              <path d="M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          </div>
          
          <h1 className="font-mystical text-3xl font-light mb-8 text-gray-800 dark:text-white opacity-90 tracking-[0.2em] uppercase">
            DISCOVER YOUR MEMORY
          </h1>
        </div>

        {/* Search Interface with Tabs */}
        <div className="w-full max-w-2xl mx-auto mb-16">
          {/* Tab Switcher */}
          <div className="flex justify-center mb-6">
            <div className="flex bg-gray-100 dark:bg-gray-800/50 rounded-full p-1">
              <button
                onClick={() => setActiveTab('text')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeTab === 'text'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Text Search</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('file')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeTab === 'file'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Upload File</span>
                </span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'text' ? (
            <div className="relative w-full group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-light/30 via-primary-light/50 to-primary-light/30 dark:from-[#2c2c2c] dark:via-[#3c3c3c] dark:to-[#2c2c2c] rounded-full opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-gradient-xy blur-sm"></div>
              <input
                type="text"
                className="w-full px-6 py-4 rounded-full bg-white dark:bg-[#111111] text-gray-800 dark:text-white/90 border border-gray-300 dark:border-white/10 focus:border-primary-light dark:focus:border-white/20 focus:outline-none placeholder-gray-500 dark:placeholder-white/30 shadow-lg backdrop-blur-sm font-light tracking-wide transition-colors duration-300"
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
                placeholder="Create a new memo with text"
                disabled={isLoading}
              />
              {isLoading ? (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="w-5 h-5 border border-gray-400 dark:border-white/20 rounded-full animate-spin border-t-primary-light dark:border-t-white/80"></div>
                </div>
              ) : (
                <button 
                  onClick={handleSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-200"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <div className="relative w-full">
              <FileUpload
                onFileSelect={handleFileUpload}
                disabled={isLoading}
                className="w-full"
              />
              {isLoading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-lg flex items-center justify-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 border border-gray-400 dark:border-white/20 rounded-full animate-spin border-t-primary-light dark:border-t-white/80"></div>
                    <span className="text-gray-600 dark:text-gray-400">Processing file...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 用户创建的卡片 */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Your Memos
            </h2>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded-full">
              {allUserCards.length}
            </span>
          </div>
          
          {isLoadingMemos ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((index) => (
                <div key={index} className="relative rounded-lg shadow-lg min-h-[320px] bg-gray-200 dark:bg-gray-800 animate-pulse">
                  <div className="p-4">
                    <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded mb-3"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {allUserCards.map((card, index) => (
                <PresetCard
                  key={card.id}
                  card={card}
                  onClick={handleCardClick}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>

        {/* 社区卡片 */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Community Memos
            </h2>
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs rounded-full">
              {COMMUNITY_CARDS.length}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {COMMUNITY_CARDS.map((card, index) => (
              <PresetCard
                key={card.id}
                card={card}
                onClick={handleCardClick}
                index={index}
              />
            ))}
          </div>
        </div>
        
        <div className="text-center text-gray-500 dark:text-white/40 text-sm font-light tracking-wider animate-pulse-glow mb-8">
          UNDERSTAND ANYTHING
        </div>
      </div>
    </div>
  );
};

export default HomePage; 