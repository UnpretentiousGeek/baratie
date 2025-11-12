import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecipe } from '../context/RecipeContext';
import { PdfIcon, XIcon } from './icons';
import ImageOverlay from './ImageOverlay';
import './AttachedFiles.css';

const AttachedFiles: React.FC = () => {
  const { attachedFiles, removeFile, currentStage } = useRecipe();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [overlayImageIndex, setOverlayImageIndex] = useState(0);

  // In chat mode (preview stage), always show files in edit mode
  const isChatMode = currentStage === 'preview';

  useEffect(() => {
    if (attachedFiles.length === 0) {
      setIsEditMode(false);
    } else if (isChatMode) {
      // Auto-show edit mode in chat mode when files are attached
      setIsEditMode(true);
    }
  }, [attachedFiles.length, isChatMode]);

  // All files for the overlay (images and PDFs)
  const allFiles = attachedFiles;

  const handleToggleEditMode = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.attached-file-close')) {
      return;
    }
    // Don't toggle if clicking on a file item in edit mode
    if (
      isEditMode &&
      (e.target as HTMLElement).closest('.attached-file-item-list')
    ) {
      return;
    }

    if (!isEditMode) {
      setIsEditMode(true);
    } else {
      setIsEditMode(false);
    }
  };

  const handleFileClick = (fileIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOverlayImageIndex(fileIndex);
    setIsOverlayOpen(true);
  };

  if (attachedFiles.length === 0) {
    return null;
  }

  // Show only first 5 cards in fan mode, but all files in edit mode
  const visibleFiles = isEditMode ? attachedFiles : attachedFiles.slice(0, 5);
  const maxVisible = 5;

  return (
    <motion.div
      className={`attached-files-display ${isEditMode ? 'edit-mode' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleToggleEditMode}
      onMouseEnter={() => !isEditMode && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      transition={{ duration: 0.3 }}
      layout={!isEditMode}
    >
      <AnimatePresence mode="sync" initial={false}>
        {isEditMode ? (
          <motion.div
            key="list"
            className="attached-files-list-container"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            layout
          >
            {attachedFiles.map((file, index) => (
              <AttachedFileListItem
                key={`list-${file.name}-${index}`}
                file={file}
                index={index}
                onRemove={removeFile}
                onImageClick={(e) => handleFileClick(index, e)}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="fan"
            className="attached-files-fan-container"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1,
              x: isHovered ? -15 : 0
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            layout
          >
            {visibleFiles.map((file, index) => (
              <AttachedFileFanItem
                key={`fan-${file.name}-${index}`}
                file={file}
                index={index}
                onRemove={removeFile}
                totalFiles={Math.min(attachedFiles.length, maxVisible)}
                isHovered={isHovered}
                actualIndex={attachedFiles.indexOf(file)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* File Overlay */}
      <ImageOverlay
        files={allFiles}
        currentIndex={overlayImageIndex}
        isOpen={isOverlayOpen}
        onClose={() => setIsOverlayOpen(false)}
      />
    </motion.div>
  );
};

interface AttachedFileFanItemProps {
  file: { name: string; type: string; preview?: string };
  index: number;
  onRemove: (index: number) => void;
  totalFiles: number;
  isHovered: boolean;
  actualIndex: number;
}

const AttachedFileFanItem: React.FC<AttachedFileFanItemProps> = ({ file, index, onRemove, totalFiles, isHovered, actualIndex }) => {
  const isImage = file.type?.startsWith('image/');

  // Rotations from Figma: 300°, 315°, 330°, 345°, 0° (or -60°, -45°, -30°, -15°, 0°)
  // All cards rotate counter-clockwise from 0°, decreasing by 15° each
  const getRotationAndPosition = (idx: number) => {
    const rotations = [300, 315, 330, 345, 0]; // Figma rotations
    const leftPositions = [0, 14, 32, 48, 63]; // Figma left positions
    const topPositions = [14.16, 5.47, 0, 6.09, 11]; // Figma top positions
    
    const rotation = rotations[idx] || 0;
    const left = leftPositions[idx] || 0;
    const top = topPositions[idx] || 0;
    
    return { rotation, left, top };
  };

  const { rotation, left, top } = getRotationAndPosition(index);

  // Hover effects: left 2 cards move top+left, middle moves top only, right 2 move top+right
  const getHoverOffset = (idx: number, total: number) => {
    if (!isHovered) return { x: 0, y: 0 };
    
    const middleIndex = Math.floor(total / 2);
    
    if (idx < 2) {
      // Left 2 cards: move top and left
      return { x: -8, y: -8 };
    } else if (idx === middleIndex) {
      // Middle card: move top only
      return { x: 0, y: -10 };
    } else {
      // Right 2 cards: move top and right
      return { x: 8, y: -8 };
    }
  };

  const hoverOffset = getHoverOffset(index, totalFiles);

  return (
    <motion.div
      className="attached-file-fan"
      layout
      layoutId={`file-attachment-${actualIndex}`}
      initial={{ opacity: 0, scale: 0.8, rotate: rotation }}
      animate={{
        opacity: 1,
        scale: 1,
        rotate: rotation,
        left: left + hoverOffset.x,
        top: top + hoverOffset.y,
        zIndex: totalFiles - index, // Left card (index 0) has highest z-index
      }}
      transition={{ 
        delay: index * 0.05, 
        duration: 0.3,
        layout: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
        rotate: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
      }}
      style={{ 
        position: 'absolute'
      }}
    >
      {isImage ? (
        <motion.div
          className="attached-file-item-fan image"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <img src={file.preview} alt={file.name} />
          <RemoveButton onRemove={() => onRemove(actualIndex)} />
        </motion.div>
      ) : (
        <motion.div
          className="attached-file-item-fan pdf"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="attached-file-pdf-icon">
            <PdfIcon size={20} />
          </div>
          <RemoveButton onRemove={() => onRemove(actualIndex)} />
        </motion.div>
      )}
    </motion.div>
  );
};

interface AttachedFileListItemProps {
  file: { name: string; type: string; preview?: string };
  index: number;
  onRemove: (index: number) => void;
  onImageClick?: (e: React.MouseEvent) => void;
}

const AttachedFileListItem: React.FC<AttachedFileListItemProps> = ({ file, index, onRemove, onImageClick }) => {
  const isImage = file.type?.startsWith('image/');

  return (
    <motion.div
      className={`attached-file-item-list ${isImage ? 'image' : 'pdf'}`}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ 
        backgroundColor: 'var(--brand-default)', 
        borderColor: 'var(--brand-default)',
        transition: { duration: 0.2, ease: 'easeInOut' }
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ 
        delay: index * 0.1, 
        duration: 0.3,
        layout: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
        backgroundColor: { duration: 0.2, ease: 'easeInOut' },
        borderColor: { duration: 0.2, ease: 'easeInOut' }
      }}
      layout
      layoutId={`file-attachment-${index}`}
      onClick={(e) => {
        if (onImageClick) {
          e.stopPropagation();
          e.preventDefault();
          onImageClick(e);
        }
      }}
    >
      {isImage ? (
        <>
          <img 
            src={file.preview} 
            alt={file.name} 
            className="file-thumbnail"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onImageClick?.(e);
            }}
            style={{ cursor: 'pointer' }}
          />
          <motion.p 
            className="file-name"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onImageClick?.(e);
            }}
            style={{ cursor: 'pointer' }}
          >
            {file.name}
          </motion.p>
          <RemoveButton onRemove={() => onRemove(index)} />
        </>
      ) : (
        <>
          <div className="attached-file-pdf-icon">
            <PdfIcon size={20} />
          </div>
          <motion.p 
            className="file-name"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            {file.name}
          </motion.p>
          <RemoveButton onRemove={() => onRemove(index)} />
        </>
      )}
    </motion.div>
  );
};

interface RemoveButtonProps {
  onRemove: () => void;
}

const RemoveButton: React.FC<RemoveButtonProps> = ({ onRemove }) => {
  return (
    <motion.button
      className="attached-file-close"
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      whileHover={{ backgroundColor: '#f5f3f2', scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      aria-label="Remove file"
    >
      <XIcon size={16} />
    </motion.button>
  );
};

export default AttachedFiles;

