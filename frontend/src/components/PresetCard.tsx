import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useTheme } from '../contexts/ThemeContext';
import CardImages from './ui/CardImages';
import { PresetCard as PresetCardType } from '../types/card';

interface PresetCardProps {
  card: PresetCardType;
  onClick: (card: PresetCardType) => void;
  index?: number;
}

const PresetCard: React.FC<PresetCardProps> = ({ card, onClick, index = 0 }) => {
  const { theme } = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);

  // 卡片悬停动画
  useEffect(() => {
    if (!cardRef.current) return;

    const cardElement = cardRef.current;

    const onHover = () => {
      gsap.to(cardElement, {
        y: -10,
        scale: 1.02,
        boxShadow: theme === 'dark' 
          ? '0 20px 40px rgba(0, 0, 0, 0.6)' 
          : '0 20px 40px rgba(0, 0, 0, 0.15)',
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    const onHoverOut = () => {
      gsap.to(cardElement, {
        y: 0,
        scale: 1,
        boxShadow: theme === 'dark' 
          ? '0 4px 6px rgba(0, 0, 0, 0.3)' 
          : '0 4px 6px rgba(0, 0, 0, 0.1)',
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    cardElement.addEventListener('mouseenter', onHover);
    cardElement.addEventListener('mouseleave', onHoverOut);

    return () => {
      cardElement.removeEventListener('mouseenter', onHover);
      cardElement.removeEventListener('mouseleave', onHoverOut);
    };
  }, [theme]);

  const handleClick = () => {
    onClick(card);
  };

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      className={`relative cursor-pointer rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${
        theme === 'dark' 
          ? 'bg-[#1a1a1a] border border-white/10' 
          : 'bg-white border border-gray-200'
      }`}
      style={{ minHeight: '320px' }}
    >
      {/* 渐变背景 */}
      <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-50`}></div>
      
      {/* 图片区域 - 居中显示 */}
      <div className="relative flex justify-center pt-6 pb-4">
        <CardImages
          images={card.images}
          className="mx-auto"
        />
      </div>

      {/* 内容区域 */}
      <div className="relative p-4 pt-2 flex-1 flex flex-col justify-between">
        <div>
          <h3 className={`text-xl font-semibold mb-3 ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>
            {card.title}
          </h3>
          
          {/* 小标签 */}
          <div className="flex flex-wrap gap-2 mb-3">
            {card.tags.map((tag, tagIndex) => (
              <span
                key={tagIndex}
                className={`px-2 py-1 text-xs rounded-full ${
                  theme === 'dark' 
                    ? 'bg-white/10 text-white/70 border border-white/20' 
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
          
          <div className={`text-sm ${
            theme === 'dark' ? 'text-white/60' : 'text-gray-500'
          }`}>
            {card.date}
          </div>
        </div>

        {/* 悬停提示 */}
        <div className={`mt-4 text-xs text-center opacity-60 ${
          theme === 'dark' ? 'text-white/60' : 'text-gray-600'
        }`}>
        </div>
      </div>
    </div>
  );
};

export default PresetCard; 