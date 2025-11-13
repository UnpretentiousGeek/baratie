import React from 'react';
import { AttachedFile } from '../types';
import PdfIcon from './icons/PdfIcon';
import ImageOverlay from './ImageOverlay';
import './SentAttachedFiles.css';

interface SentAttachedFilesProps {
  file: AttachedFile;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  onClick?: (e: React.MouseEvent) => void;
}

const SentAttachedFiles: React.FC<SentAttachedFilesProps> = ({ file, className = '', size = 'medium', onClick }) => {
  const isImage = file.type?.startsWith('image/');
  const sizeClass = `sent-file-${size}`;

  if (isImage && file.preview) {
    return (
      <div 
        className={`sent-attached-file sent-attached-file-image ${sizeClass} ${className}`}
        onClick={onClick}
        style={{ cursor: 'pointer' }}
      >
        <img src={file.preview} alt={file.name} />
      </div>
    );
  }

  return (
    <div 
      className={`sent-attached-file sent-attached-file-pdf ${sizeClass} ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="sent-file-pdf-icon">
        <PdfIcon size={32} />
      </div>
    </div>
  );
};

interface SentAttachedFilesGroupProps {
  files: AttachedFile[];
}

export const SentAttachedFilesGroup: React.FC<SentAttachedFilesGroupProps> = ({ 
  files
}) => {
  const [isOverlayOpen, setIsOverlayOpen] = React.useState(false);
  const [overlayImageIndex, setOverlayImageIndex] = React.useState(0);

  if (files.length === 0) return null;

  // For 3+ files, always show 3 items (first 2 files + "more" indicator)
  // For 1-3 files, show all files
  const totalFiles = files.length;
  const shouldShowMore = totalFiles > 3;
  const displayCount = shouldShowMore ? 3 : totalFiles;
  const visibleFiles = shouldShowMore ? files.slice(0, 2) : files.slice(0, displayCount);
  const remainingCount = totalFiles - 2; // Count remaining after first 2 files

  const handleFileClick = (fileIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOverlayImageIndex(fileIndex);
    setIsOverlayOpen(true);
  };

  const getSize = (total: number) => {
    if (total === 1) return 'large';
    if (total === 2) return 'medium';
    return 'small';
  };

  const getBorderRadius = (index: number, total: number, hasMore: boolean) => {
    if (total === 1) {
      return 'sent-file-single';
    }
    if (total === 2) {
      return index === 0 ? 'sent-file-first-of-two' : 'sent-file-second-of-two';
    }
    // 3+ files (always shows 3 items: 2 files + "more" indicator)
    if (index === 0) return 'sent-file-first-of-many';
    if (index === 1 && hasMore) return 'sent-file-before-more';
    if (index === 1 && !hasMore) return 'sent-file-middle';
    if (index === 2) return 'sent-file-last-of-many';
    return 'sent-file-middle';
  };

  return (
    <>
      <div className="sent-attached-files-group">
        {visibleFiles.map((file, index) => {
          // For 3+ files, use small size for all visible items
          const size = shouldShowMore ? 'small' : getSize(displayCount);
          const borderRadius = getBorderRadius(index, displayCount, shouldShowMore);
          const actualIndex = files.indexOf(file);
          return (
            <SentAttachedFiles
              key={`${file.name}-${index}`}
              file={file}
              size={size}
              className={borderRadius}
              onClick={(e) => handleFileClick(actualIndex, e)}
            />
          );
        })}
        {shouldShowMore && (
          <div 
            className="sent-attached-file sent-file-more sent-file-small sent-file-last-of-many"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Open overlay starting from the first hidden file (index 2)
              setOverlayImageIndex(2);
              setIsOverlayOpen(true);
            }}
            style={{ cursor: 'pointer' }}
          >
            <p className="sent-file-more-text">{remainingCount} more</p>
          </div>
        )}
      </div>
      {isOverlayOpen && (
        <ImageOverlay
          files={files}
          currentIndex={overlayImageIndex}
          isOpen={isOverlayOpen}
          onClose={() => setIsOverlayOpen(false)}
        />
      )}
    </>
  );
};

export default SentAttachedFiles;

