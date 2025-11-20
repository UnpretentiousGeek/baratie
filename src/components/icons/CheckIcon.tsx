import React from 'react';

interface CheckIconProps {
  className?: string;
  size?: number;
}

const CheckIcon: React.FC<CheckIconProps> = ({ className = '', size = 20 }) => {
  return (
    <svg 
      className={className}
      width={size} 
      height={size} 
      viewBox="0 0 20 20" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M3.125 11.25L7.5 15.625L17.5 5.625" 
        stroke="#FAFAFA" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default CheckIcon;

