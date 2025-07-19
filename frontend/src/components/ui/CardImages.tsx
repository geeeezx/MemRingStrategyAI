import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface CardImagesProps {
  images: string[];
  className?: string;
}

const CardImages: React.FC<CardImagesProps> = ({ images, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const image1Ref = useRef<HTMLDivElement>(null);
  const image2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!image1Ref.current || !image2Ref.current) return;

    const image1 = image1Ref.current;
    const image2 = image2Ref.current;

    // 初始状态 - 真正的10%重叠：图片宽160px，10%重叠=16px，所以中心距离144px，每边偏移72px
    gsap.set(image1, { rotation: -3, x: -72, z: 1 });
    gsap.set(image2, { rotation: 3, x: 72, z: 2 });

    const handleHover = () => {
      gsap.to(image1, {
        rotation: -6,
        x: -85,
        scale: 1.05,
        y: -5,
        duration: 0.3,
        ease: 'power2.out'
      });
      gsap.to(image2, {
        rotation: 6,
        x: 85,
        scale: 1.05,
        y: -5,
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    const handleHoverOut = () => {
      gsap.to(image1, {
        rotation: -3,
        x: -72,
        scale: 1,
        y: 0,
        duration: 0.3,
        ease: 'power2.out'
      });
      gsap.to(image2, {
        rotation: 3,
        x: 72,
        scale: 1,
        y: 0,
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mouseenter', handleHover);
      container.addEventListener('mouseleave', handleHoverOut);

      return () => {
        container.removeEventListener('mouseenter', handleHover);
        container.removeEventListener('mouseleave', handleHoverOut);
      };
    }
  }, []);

  // 确保至少有两张图片，如果不够就复制第一张
  const displayImages = images.length >= 2 ? images.slice(0, 2) : [images[0] || '', images[0] || ''];

  return (
    <div 
      ref={containerRef}
      className={`relative flex items-center justify-center h-32 w-full max-w-lg mx-auto ${className}`}
      style={{ perspective: '1000px' }}
    >
      {/* 第一张图片 - 左侧，增大尺寸，透明边缘 */}
      <div
        ref={image1Ref}
        className="absolute w-40 h-28 rounded-2xl overflow-hidden shadow-lg"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <img
          src={displayImages[0]}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjExMiIgdmlld0JveD0iMCAwIDE2MCAxMTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNjAiIGhlaWdodD0iMTEyIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjgwIiBjeT0iNTYiIHI9IjE2IiBmaWxsPSIjOUNBM0FGIi8+CjxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSI3MiIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIHJ4PSI2Ii8+Cjwvc3ZnPgo=';
          }}
        />
      </div>

      {/* 第二张图片 - 右侧，增大尺寸，透明边缘 */}
      <div
        ref={image2Ref}
        className="absolute w-40 h-28 rounded-2xl overflow-hidden shadow-lg"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <img
          src={displayImages[1]}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjExMiIgdmlld0JveD0iMCAwIDE2MCAxMTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNjAiIGhlaWdodD0iMTEyIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjgwIiBjeT0iNTYiIHI9IjE2IiBmaWxsPSIjOUNBM0FGIi8+CjxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSI3MiIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIHJ4PSI2Ii8+Cjwvc3ZnPgo=';
          }}
        />
      </div>
    </div>
  );
};

export default CardImages; 