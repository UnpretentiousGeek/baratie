import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PdfIcon } from './icons';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from './ui/carousel';

interface ImageOverlayProps {
  files: Array<{ name: string; type: string; preview?: string }>;
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

const ImageOverlay: React.FC<ImageOverlayProps> = ({
  files,
  currentIndex,
  isOpen,
  onClose,
}) => {
  const [api, setApi] = React.useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  React.useEffect(() => {
    if (!api) return;
    api.scrollTo(currentIndex);
    
    const updateScrollState = () => {
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    };
    
    updateScrollState();
    api.on('select', updateScrollState);
    api.on('reInit', updateScrollState);
    
    return () => {
      api.off('select', updateScrollState);
      api.off('reInit', updateScrollState);
    };
  }, [api, currentIndex]);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (files.length === 0) {
    return null;
  }

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              zIndex: 99998,
              pointerEvents: 'auto',
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onClick={onClose}
          />
          
          {/* Close Button - Top Right Corner - Matching Figma Design */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="fixed z-[100000] flex items-center justify-center"
            style={{
              top: '16px',
              right: '16px',
              backgroundColor: '#dc3545',
              borderRadius: '8px',
              padding: '8px',
              width: '40px',
              height: '40px',
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
            }}
            aria-label="Close overlay"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="#2d2925" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Overlay Content */}
          <div
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
            style={{ 
              zIndex: 99999,
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                onClose();
              }
            }}
          >
            <div 
              className="relative w-full max-w-5xl max-h-[90vh] flex items-center justify-center pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >

              {/* Carousel Container - Matching Figma Design */}
              <div 
                className="flex items-center justify-center gap-[60px]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Left Navigation Button - Matching Figma Design */}
                <button
                  onClick={() => api?.scrollPrev()}
                  disabled={!canScrollPrev}
                  className="flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '36px',
                    padding: '8px',
                    width: '40px',
                    height: '40px',
                    gap: '8px',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                  }}
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-6 h-6" style={{ color: '#2d2925' }} />
                </button>

                {/* Carousel */}
                <Carousel
                  setApi={setApi}
                  opts={{
                    align: 'center',
                    loop: false,
                  }}
                  className="w-[450px]"
                >
                  <CarouselContent className="-ml-0">
                    {files.map((file, index) => {
                      const isImage = file.type?.startsWith('image/');
                      return (
                        <CarouselItem key={index} className="pl-0">
                          {isImage ? (
                            // Image Display - Matching Figma Design
                            <div 
                              className="relative w-[450px] h-[450px] flex items-center justify-center overflow-hidden"
                              style={{
                                width: '450px',
                                height: '450px',
                              }}
                            >
                              <img
                                src={file.preview}
                                alt={file.name}
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                  objectFit: 'contain',
                                }}
                              />
                            </div>
                          ) : (
                            // PDF Display - Matching Figma Design
                            <div 
                              className="flex flex-col items-center justify-center"
                              style={{
                                width: '450px',
                                height: '450px',
                                backgroundColor: '#fef5f4',
                                border: '1px solid #fcc0b9',
                                borderRadius: '8px',
                                padding: '8px',
                                gap: '8px',
                              }}
                            >
                              <div style={{ width: '72px', height: '72px', position: 'relative' }}>
                                <PdfIcon size={72} />
                              </div>
                            </div>
                          )}
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                </Carousel>

                {/* Right Navigation Button - Matching Figma Design */}
                <button
                  onClick={() => api?.scrollNext()}
                  disabled={!canScrollNext}
                  className="flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '32px',
                    padding: '8px',
                    width: '40px',
                    height: '40px',
                    gap: '8px',
                    border: 'none',
                    outline: 'none',
                  }}
                  aria-label="Next"
                >
                  <ChevronRight className="w-6 h-6" style={{ color: '#2d2925' }} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>,
    document.body
  );
};

export default ImageOverlay;
