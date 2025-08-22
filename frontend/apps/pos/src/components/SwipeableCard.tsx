import React, { useRef, useState } from 'react';
import { useSwipe, useLongPress, useDoubleTap } from '../hooks/useGestures';
import { cn } from '../utils/cn';

interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  onSelect?: () => void;
  className?: string;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onDelete,
  onEdit,
  onSelect,
  className
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Swipe handlers
  useSwipe(cardRef, {
    onSwipeLeft: () => {
      setOffset(-100);
      setTimeout(() => {
        if (onDelete) {
          setIsDeleting(true);
          setTimeout(onDelete, 300);
        }
      }, 200);
    },
    onSwipeRight: () => {
      setOffset(100);
      setTimeout(() => {
        if (onEdit) {
          setIsEditing(true);
          setTimeout(() => {
            onEdit();
            setIsEditing(false);
            setOffset(0);
          }, 300);
        }
      }, 200);
    }
  });

  // Long press to select
  const longPressHandlers = useLongPress(() => {
    onSelect?.();
  });

  // Double tap to open
  const doubleTapHandlers = useDoubleTap(() => {
    console.log('Double tapped!');
  });

  // Reset position on touch end
  const handleTouchEnd = () => {
    if (Math.abs(offset) < 50) {
      setOffset(0);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        <div className="flex-1 bg-blue-500 flex items-center justify-start px-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="ml-2 text-white font-medium">Edit</span>
        </div>
        <div className="flex-1 bg-red-500 flex items-center justify-end px-4">
          <span className="mr-2 text-white font-medium">Delete</span>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
      </div>

      {/* Main card content */}
      <div
        ref={cardRef}
        className={cn(
          'relative bg-white dark:bg-gray-800 transition-all duration-300 touch-manipulation',
          isDeleting && 'opacity-0 scale-95',
          isEditing && 'scale-105',
          className
        )}
        style={{
          transform: `translateX(${offset}px)`,
        }}
        onTouchEnd={handleTouchEnd}
        {...longPressHandlers}
        {...doubleTapHandlers}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableCard;