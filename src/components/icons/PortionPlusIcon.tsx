import React from 'react';

interface PortionPlusIconProps {
  className?: string;
  size?: number;
  disabled?: boolean;
}

const PortionPlusIcon: React.FC<PortionPlusIconProps> = ({ className = '', size = 25, disabled = false }) => {
  const strokeColor = disabled ? '#b8b3ae' : '#2D2925';
  
  return (
    <svg 
      className={className}
      width={size} 
      height={size} 
      viewBox="0 0 25 25" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M3.90625 12.5H21.0938" 
        stroke={strokeColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M12.5 3.90625V21.0938" 
        stroke={strokeColor} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default PortionPlusIcon;

