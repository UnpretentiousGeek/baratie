import React from 'react';
import { AttachedFile } from '../types';
import PdfIcon from './icons/PdfIcon';
import './SentAttachedFiles.css';

interface SentAttachedFilesProps {
  file: AttachedFile;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const SentAttachedFiles: React.FC<SentAttachedFilesProps> = ({ file, className = '', size = 'medium' }) => {
  const isImage = file.type?.startsWith('image/');
  const sizeClass = `sent-file-${size}`;

  if (isImage && file.preview) {
    return (
      <div className={`sent-attached-file sent-attached-file-image ${sizeClass} ${className}`}>
        <img src={file.preview} alt={file.name} />
      </div>
    );
  }

  return (
    <div className={`sent-attached-file sent-attached-file-pdf ${sizeClass} ${className}`}>
      <div className="sent-file-pdf-icon">
        <PdfIcon size={32} />
      </div>
    </div>
  );
};

interface SentAttachedFilesGroupProps {
  files: AttachedFile[];
  maxVisible?: number;
}

export const SentAttachedFilesGroup: React.FC<SentAttachedFilesGroupProps> = ({ 
  files, 
  maxVisible = 3 
}) => {
  if (files.length === 0) return null;

  const visibleFiles = files.slice(0, maxVisible);
  const remainingCount = files.length - maxVisible;
  const showMore = remainingCount > 0;

  const getSize = (total: number) => {
    if (total === 1) return 'large';
    if (total === 2) return 'medium';
    return 'small';
  };

  const getBorderRadius = (index: number, total: number) => {
    if (total === 1) {
      return 'sent-file-single';
    }
    if (total === 2) {
      return index === 0 ? 'sent-file-first-of-two' : 'sent-file-second-of-two';
    }
    // 3+ files
    if (index === 0) return 'sent-file-first-of-many';
    if (index === total - 1 && !showMore) return 'sent-file-last-of-many';
    if (index === total - 1 && showMore) return 'sent-file-before-more';
    return 'sent-file-middle';
  };

  return (
    <div className="sent-attached-files-group">
      {visibleFiles.map((file, index) => {
        const size = getSize(visibleFiles.length);
        const borderRadius = getBorderRadius(index, visibleFiles.length);
        return (
          <SentAttachedFiles
            key={`${file.name}-${index}`}
            file={file}
            size={size}
            className={borderRadius}
          />
        );
      })}
      {showMore && (
        <div className="sent-attached-file sent-file-more sent-file-small sent-file-last-of-many">
          <p className="sent-file-more-text">{remainingCount} more</p>
        </div>
      )}
    </div>
  );
};

export default SentAttachedFiles;

