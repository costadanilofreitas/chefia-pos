import { memo } from 'react';

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const SpinnerComponent: React.FC<SpinnerProps> = ({ 
  size = 'medium',
  className = '' 
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  return (
    <div className={`inline-block ${className}`}>
      <div 
        className={`
          ${sizeClasses[size]}
          animate-spin rounded-full
          border-4 border-solid
          border-gray-200 border-t-primary-500
        `}
      />
    </div>
  );
};

export const Spinner = memo(SpinnerComponent);
export default Spinner;