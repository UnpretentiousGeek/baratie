import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecipe } from '../context/RecipeContext';
import './AttachedFiles.css';

const AttachedFiles: React.FC = () => {
  const { attachedFiles, removeFile } = useRecipe();
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (attachedFiles.length === 0) {
      setIsEditMode(false);
    }
  }, [attachedFiles.length]);

  const handleToggleEditMode = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.attached-file-close')) {
      return;
    }

    if (!isEditMode) {
      setIsEditMode(true);
    } else {
      setIsEditMode(false);
    }
  };

  if (attachedFiles.length === 0) {
    return null;
  }

  return (
    <motion.div
      className={`attached-files-display ${isEditMode ? 'edit-mode' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleToggleEditMode}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="wait">
        {isEditMode ? (
          <motion.div
            key="list"
            className="attached-files-list-container"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {attachedFiles.map((file, index) => (
              <AttachedFileListItem
                key={`${file.name}-${index}`}
                file={file}
                index={index}
                onRemove={removeFile}
                delay={index * 0.05}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="fan"
            className="attached-files-fan-container"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {attachedFiles.map((file, index) => (
              <AttachedFileFanItem
                key={`${file.name}-${index}`}
                file={file}
                index={index}
                onRemove={removeFile}
                delay={index * 0.1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface AttachedFileFanItemProps {
  file: { name: string; type: string; preview?: string };
  index: number;
  onRemove: (index: number) => void;
  delay: number;
}

const AttachedFileFanItem: React.FC<AttachedFileFanItemProps> = ({ file, index, onRemove, delay }) => {
  const isImage = file.type?.startsWith('image/');

  const positions = [
    { left: 63, top: 11, rotate: 0 },
    { left: 48, top: 6.09, rotate: -15 },
    { left: 32, top: 0, rotate: -30 },
    { left: 14, top: 5.47, rotate: -45 },
    { left: 0, top: 14.16, rotate: -60 },
  ];

  const position = positions[Math.min(index, positions.length - 1)];

  return (
    <motion.div
      className="attached-file-fan"
      initial={{ opacity: 0, y: -10, scale: 0.8 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        rotate: position.rotate,
      }}
      whileHover={{ scale: 1.15, zIndex: 10 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      style={{ 
        position: 'absolute', 
        left: `${position.left}px`, 
        top: `${position.top}px`,
        zIndex: 4 - index
      }}
    >
      {isImage ? (
        <motion.div
          className="attached-file-item-fan image"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <img src={file.preview} alt={file.name} />
          <RemoveButton onRemove={() => onRemove(index)} />
        </motion.div>
      ) : (
        <motion.div
          className="attached-file-item-fan pdf"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="attached-file-pdf-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="20" height="20" rx="2" fill="#FEF5F4"/>
              <path d="M6 5V15H14V12H11V5H6Z" fill="#FCC0B9"/>
              <path d="M6 5H11V9H14" stroke="#5A544E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <text x="7" y="13" fontFamily="Arial" fontSize="6" fontWeight="bold" fill="#5A544E">PDF</text>
            </svg>
          </div>
          <RemoveButton onRemove={() => onRemove(index)} />
        </motion.div>
      )}
    </motion.div>
  );
};

interface AttachedFileListItemProps {
  file: { name: string; type: string; preview?: string };
  index: number;
  onRemove: (index: number) => void;
  delay: number;
}

const AttachedFileListItem: React.FC<AttachedFileListItemProps> = ({ file, index, onRemove, delay }) => {
  const isImage = file.type?.startsWith('image/');

  return (
    <motion.div
      className={`attached-file-item-list ${isImage ? 'image' : 'pdf'}`}
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      whileHover={{ x: -4, backgroundColor: '#fde8e5', borderColor: '#faa89a' }}
      whileTap={{ scale: 0.98 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    >
      {isImage ? (
        <>
          <img src={file.preview} alt={file.name} className="file-thumbnail" />
          <span className="file-name">{file.name}</span>
        </>
      ) : (
        <>
          <div className="attached-file-pdf-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="20" height="20" rx="2" fill="#FEF5F4"/>
              <path d="M6 5V15H14V12H11V5H6Z" fill="#FCC0B9"/>
              <path d="M6 5H11V9H14" stroke="#5A544E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <text x="7" y="13" fontFamily="Arial" fontSize="6" fontWeight="bold" fill="#5A544E">PDF</text>
            </svg>
          </div>
          <span className="file-name">{file.name}</span>
        </>
      )}
      <RemoveButton onRemove={() => onRemove(index)} />
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
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4L4 12M4 4L12 12" stroke="#2D2925" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </motion.button>
  );
};

export default AttachedFiles;

