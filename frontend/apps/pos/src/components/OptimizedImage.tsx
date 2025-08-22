/**
 * Componente de imagem otimizada com lazy loading
 */

import React, { useState, useEffect, useRef } from 'react';
import { usePerformance } from '../hooks/usePerformance';
import { cn } from '../utils/cn';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
  quality?: number;
  lazy?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTJlOGYwIi8+PC9zdmc+',
  quality = 85,
  lazy = true,
  onLoad,
  onError
}) => {
  const [imageSrc, setImageSrc] = useState(lazy ? placeholder : src);
  const [isLoading, setIsLoading] = useState(lazy);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const { optimizeImage, observeElement } = usePerformance();

  useEffect(() => {
    if (!lazy) {
      const optimizedSrc = optimizeImage(src, { width, height, quality });
      setImageSrc(optimizedSrc);
      return;
    }

    // Configura Intersection Observer para lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const optimizedSrc = optimizeImage(src, { width, height, quality });
            
            // Preload da imagem
            const img = new Image();
            img.onload = () => {
              setImageSrc(optimizedSrc);
              setIsLoading(false);
              onLoad?.();
            };
            img.onerror = () => {
              setHasError(true);
              setIsLoading(false);
              onError?.();
            };
            img.src = optimizedSrc;
            
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, width, height, quality, lazy, optimizeImage, onLoad, onError]);

  if (hasError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-gray-200',
          className
        )}
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs">Erro ao carregar</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)} style={{ width, height }}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      )}
      
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        loading={lazy ? 'lazy' : 'eager'}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          'object-cover w-full h-full'
        )}
      />
    </div>
  );
};

export default OptimizedImage;