import React from 'react';

interface XIconProps {
  className?: string;
  size?: number;
}

const XIcon: React.FC<XIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg 
      className={className}
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M25 7L7 25" 
        stroke="#2D2925" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M25 25L7 7" 
        stroke="#2D2925" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default XIcon;

