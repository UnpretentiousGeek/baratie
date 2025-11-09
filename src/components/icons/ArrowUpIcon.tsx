import React from 'react';

interface ArrowUpIconProps {
  className?: string;
  size?: number;
}

const ArrowUpIcon: React.FC<ArrowUpIconProps> = ({ className = '', size = 20 }) => {
  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Arrow up - white stroke */}
        <path
          d="M10 3.125V16.875"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4.375 8.75L10 3.125L15.625 8.75"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default ArrowUpIcon;

