import React from 'react';

interface PdfIconProps {
  className?: string;
  size?: number;
}

const PdfIcon: React.FC<PdfIconProps> = ({ className = '', size = 20 }) => {
  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background */}
        <rect width="20" height="20" rx="2" fill="#fef5f4" />
        {/* Document shape */}
        <path d="M6 5V15H14V12H11V5H6Z" fill="#fcc0b9" />
        <path
          d="M6 5H11V9H14"
          stroke="#5a544e"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* PDF text */}
        <text x="7" y="13" fontFamily="Arial" fontSize="6" fontWeight="bold" fill="#5a544e">
          PDF
        </text>
      </svg>
    </div>
  );
};

export default PdfIcon;

