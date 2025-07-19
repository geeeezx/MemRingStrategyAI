import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import ReactMarkdown from 'react-markdown';
import { BounceCards } from '../ui/bounce-cards';
import { useTheme } from '../../contexts/ThemeContext';
import '../../styles/flow.css';

interface MainNodeData {
  label: string;
  content: string;
  images?: string[];
  sources?: Array<{
    title: string;
    url: string;
    thumbnail?: string;
  }>;
  onAskFollowUp?: () => void; // Callback for follow-up button
}

const getFaviconUrl = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PHBhdGggZD0iTTggMTRzMS41IDIgNCAyIDQtMiA0LTIiLz48bGluZSB4MT0iOSIgeTE9IjkiIHgyPSI5LjAxIiB5Mj0iOSIvPjxsaW5lIHgxPSIxNSIgeTE9IjkiIHgyPSIxNS4wMSIgeTI9IjkiLz48L3N2Zz4='; // fallback icon
  }
};

const transformStyles = [
  "rotate(-15deg) translate(-200px, -50px)",
  "rotate(-5deg) translate(-100px, -25px)",
  "rotate(0deg)",
  "rotate(5deg) translate(100px, -25px)",
  "rotate(15deg) translate(200px, -50px)"
];

const MainNode = ({ data }: NodeProps<MainNodeData>) => {
  const { theme } = useTheme();
  
  const handleAskFollowUp = () => {
    if (data.onAskFollowUp) {
      data.onAskFollowUp();
    }
  };
  
  return (
    <div className={`group relative rounded-lg shadow-lg min-h-[500px] max-h-[550px] flex flex-col ${theme === 'dark' ? 'bg-[#1a1a1a] border-black' : 'bg-white border-gray-200'}`}>
      <Handle type="target" position={Position.Left} className="w-2 h-2" />
      {data.images && data.images.length > 0 && (
        <div className={`flex-none p-6 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
          <BounceCards
            images={data.images.slice(0, 5)}
            containerWidth={500}
            containerHeight={120}
            animationDelay={0.3}
            animationStagger={0.1}
            easeType="elastic.out(1, 0.7)"
            transformStyles={transformStyles}
            className="pl-48 transform scale-90"
          />
        </div>
      )}
      
      <div className={`flex-1 overflow-y-auto custom-scrollbar flex items-start justify-center ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        {data.content === 'Loading...' ? (
          <div className="flex flex-col items-center justify-center space-y-8 p-6">
            <div className="relative">
              <svg className="w-24 h-24 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke={theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'} strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              <svg className="w-24 h-24 absolute top-0 left-0 animate-reverse-spin" viewBox="0 0 24 24" fill="none" stroke={theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'} strokeWidth="1.5">
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
                <path d="M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-2 h-2 rounded-full animate-pulse ${theme === 'dark' ? 'bg-white/80' : 'bg-black/80'}`}></div>
              </div>
            </div>
            
            <div className="space-y-3 text-center">
              <div className={`font-mystical text-lg tracking-[0.2em] animate-pulse ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>
                SEEKING WISDOM
              </div>
              <div className={`text-sm tracking-wider ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>
                Traversing the depths of knowledge...
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-6 overflow-y-auto w-full">
            <div className={`prose prose-sm max-w-none break-words ${theme === 'dark' ? 'prose-invert' : 'prose-gray'}`}>
              <ReactMarkdown>
                {data.content}
              </ReactMarkdown>
            </div>
            {data.sources && data.sources.length > 0 && (
              <div className={`mt-6 border-t pt-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Sources</h3>
                <div className="grid grid-cols-1 gap-3">
                  {data.sources.map((source, index) => (
                    <a
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center space-x-3 p-2 rounded-lg transition-colors group break-all ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
                        <img
                          src={getFaviconUrl(source.url)}
                          alt=""
                          className="w-4 h-4 group-hover:scale-110 transition-transform"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = 'none';
                          }}
                        />
                      </div>
                      <span className={`text-sm flex-1 break-words ${theme === 'dark' ? 'text-gray-300 group-hover:text-white' : 'text-gray-700 group-hover:text-black'}`}>
                        {source.title}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ASK Follow up Button - Hidden by default, shows on hover */}
      {data.content !== 'Loading...' && (
        <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out`}>
          <button
            onClick={handleAskFollowUp}
            className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 transform translate-y-1/2 ${
              theme === 'dark'
                ? 'bg-white text-gray-800 hover:bg-gray-100 border border-gray-200'
                : 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Ask Follow Up</span>
          </button>
        </div>
      )}



      <Handle type="source" position={Position.Right} className="w-2 h-2" />
    </div>
  );
};

export default memo(MainNode); 