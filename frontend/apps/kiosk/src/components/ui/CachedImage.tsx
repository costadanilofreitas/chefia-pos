import { memo, useState, useEffect, useRef } from 'react';
import { offlineStorage } from '../../services/offlineStorage';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  placeholder?: string;
  lazy?: boolean;
  blur?: boolean;
  onLoadComplete?: () => void;
  className?: string;
}

/**
 * Image component with caching and lazy loading
 */
export const CachedImage = memo<CachedImageProps>(({
  src,
  alt,
  fallbackSrc = '/assets/placeholder-food.png',
  placeholder,
  lazy = true,
  blur = true,
  onLoadComplete,
  className = '',
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState<string>(placeholder || '');
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Setup intersection observer for lazy loading
  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.01
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy]);

  // Load image when in view
  useEffect(() => {
    if (!isInView || !src) return;

    let isMounted = true;
    const img = new Image();

    // Check if image is cached
    const cacheKey = `img_cache_${src}`;
    const cachedData = sessionStorage.getItem(cacheKey);

    if (cachedData) {
      // Use cached image
      setImageSrc(cachedData);
      setIsLoading(false);
      offlineStorage.log('Image loaded from cache', { src });
      onLoadComplete?.();
      return;
    }

    // Load image
    img.onload = () => {
      if (!isMounted) return;

      // Try to cache image as base64 (only for small images)
      if (img.width * img.height < 500000) { // ~500KB estimated
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const base64 = canvas.toDataURL('image/webp', 0.8);
            
            // Store in session storage if size is reasonable
            if (base64.length < 1024 * 1024) { // 1MB limit
              try {
                sessionStorage.setItem(cacheKey, base64);
                offlineStorage.log('Image cached', { src, size: base64.length });
              } catch {
                // Storage quota exceeded
                offlineStorage.log('Cache storage full', { src });
              }
            }
          }
        } catch {
          // CORS or other error, use original URL
        }
      }

      setImageSrc(src);
      setIsLoading(false);
      setIsError(false);
      onLoadComplete?.();
    };

    img.onerror = () => {
      if (!isMounted) return;
      
      offlineStorage.log('Image load error', { src });
      setImageSrc(fallbackSrc);
      setIsLoading(false);
      setIsError(true);
    };

    img.src = src;

    return () => {
      isMounted = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [isInView, src, fallbackSrc, onLoadComplete]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Placeholder/skeleton while loading */}
      {isLoading && (
        <div className="absolute inset-0 skeleton rounded-lg" />
      )}

      {/* Blur placeholder */}
      {blur && placeholder && isLoading && (
        <img
          src={placeholder}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-lg scale-110"
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={imageSrc || placeholder || fallbackSrc}
        alt={alt}
        className={`
          w-full h-full object-cover
          transition-opacity duration-300
          ${isLoading ? 'opacity-0' : 'opacity-100'}
          ${isError ? 'filter grayscale' : ''}
        `}
        loading={lazy ? 'lazy' : 'eager'}
        {...props}
      />

      {/* Error state overlay */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
          <span className="text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
            Imagem indisponível
          </span>
        </div>
      )}
    </div>
  );
});