/**
 * Componente de lista virtual para performance
 */

import React, { useRef, useCallback } from 'react';
import {useVirtualScroll} from '../hooks/usePerformance';
import {cn} from '../utils/cn';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, _index: number) => React.ReactNode;
  itemHeight: number;
  height: number;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  onScroll?: (_scrollTop: number) => void;
}

function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  height,
  className,
  emptyMessage = 'Nenhum item encontrado',
  loading = false,
  onScroll
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll: virtualScroll,
    startIndex
  } = useVirtualScroll(items, {
    itemHeight,
    containerHeight: height,
    overscan: 5
  });

  const handleScrollEvent = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    virtualScroll(e);
    if (onScroll) {
      onScroll(e.currentTarget.scrollTop);
    }
  }, [virtualScroll, onScroll]);

  if (loading) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center',
          className
        )}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          <span className="text-sm text-gray-600">Carregando...</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center',
          className
        )}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <span className="text-sm">{emptyMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'overflow-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100',
        className
      )}
      style={{ height }}
      onScroll={handleScrollEvent}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
              className="virtual-list-item"
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VirtualList;