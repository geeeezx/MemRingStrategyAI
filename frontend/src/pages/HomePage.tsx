import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import PresetCard from '../components/PresetCard';
import { searchRabbitHole } from '../services/api';
import { PresetCard as PresetCardType } from '../types/card';
import { createCardFromChatMessage } from '../utils/cardUtils';
import '../styles/search.css';

// 预设卡片数据
const PRESET_CARDS: PresetCardType[] = [
  {
    id: 'consciousness',
    title: 'Consciousness & AI',
    date: 'Last updated Dec 15 at 2:30 pm',
    tags: ['AI', 'Philosophy', 'Consciousness'],
    query: 'How does artificial intelligence relate to human consciousness and what are the philosophical implications?',
    images: [
      'https://images.unsplash.com/photo-1676299081847-c0326a4e9b2b?w=300&h=200&fit=crop',
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

const transformStyles = [
  "rotate(-10deg) translate(-120px, -30px)",
  "rotate(0deg)",
  "rotate(10deg) translate(120px, -30px)"
];

const HomePage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dynamicCards, setDynamicCards] = useState<PresetCardType[]>([]);
  const navigate = useNavigate();
  const { logout, username } = useAuth();
  const { theme } = useTheme();

  // 合并预设卡片和动态卡片
  const allCards = [...PRESET_CARDS, ...dynamicCards];



  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    
    try {
      const response = await searchRabbitHole({
        query: query.trim(),
        previousConversation: [],
        concept: '',
        followUpMode: 'expansive'
      });

      // Navigate to explore page with search results
      navigate('/explore', { 
        state: { 
          searchResult: response,
          query: query.trim()
        } 
      });
    } catch (error) {
      console.error('Search failed:', error);
      setIsLoading(false);
    }
  };

  const handleCardClick = (cardQuery: string) => {
    setQuery(cardQuery);
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

  // 示例：从模拟的数据库/聊天记录添加卡片
  // 你可以在实际应用中从API调用或聊天历史中调用这个函数
  // useEffect(() => {
  //   // 模拟从数据库加载用户的历史卡片
  //   const simulatedDbData = [
  //     { title: "Who is Donald Trump", query: "Tell me about Donald Trump's political career" },
  //     { title: "Climate Change Effects", query: "What are the main effects of climate change?" }
  //   ];
  //   
  //   simulatedDbData.forEach(data => {
  //     addDynamicCard(data.title, data.query);
  //   });
  // }, []);

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

      <div className="w-full max-w-6xl mx-auto text-center relative px-6">
        <div className="mb-12 animate-float">
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

        {/* 卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 max-w-7xl mx-auto">
          {allCards.map((card, index) => (
            <PresetCard
              key={card.id}
              card={card}
              onClick={handleCardClick}
              index={index}
            />
          ))}
        </div>
        
        <div className="relative w-full max-w-xl mx-auto group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-light/30 via-primary-light/50 to-primary-light/30 dark:from-[#2c2c2c] dark:via-[#3c3c3c] dark:to-[#2c2c2c] rounded-full opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-gradient-xy blur-sm"></div>
          <input
            type="text"
            className="w-full px-6 py-4 rounded-full bg-white dark:bg-[#111111] text-gray-800 dark:text-white/90 border border-gray-300 dark:border-white/10 focus:border-primary-light dark:focus:border-white/20 focus:outline-none placeholder-gray-500 dark:placeholder-white/30 shadow-lg backdrop-blur-sm font-light tracking-wide transition-colors duration-300"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
            placeholder="Create a new memo"
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
        
        <div className="mt-8 text-gray-500 dark:text-white/40 text-sm font-light tracking-wider animate-pulse-glow">
          UNDERSTAND ANYTHING
        </div>
      </div>
    </div>
  );
};

export default HomePage; 