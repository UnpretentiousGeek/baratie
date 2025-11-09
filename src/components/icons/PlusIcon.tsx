import React from 'react';

interface PlusIconProps {
  className?: string;
  size?: number;
}

const PlusIcon: React.FC<PlusIconProps> = ({ className = '', size = 20 }) => {
  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M10 4v12M4 10h12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default PlusIcon;

