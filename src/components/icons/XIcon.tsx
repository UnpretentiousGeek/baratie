import React from 'react';

interface XIconProps {
  className?: string;
  size?: number;
}

const XIcon: React.FC<XIconProps> = ({ className = '', size = 16 }) => {
  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M4 4l8 8M12 4l-8 8"
          stroke="#2d2925"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default XIcon;

