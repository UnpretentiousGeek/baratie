import React from 'react';

interface DownloadIconProps {
  className?: string;
  size?: number;
}

const DownloadIcon: React.FC<DownloadIconProps> = ({ className = '', size = 32 }) => {
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
        d="M16 18V4" 
        stroke="#2D2925" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M27 18V26H5V18" 
        stroke="#2D2925" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M21 13L16 18L11 13" 
        stroke="#2D2925" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default DownloadIcon;

