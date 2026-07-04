/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { PageImage, ViewLayout } from '../types';
import { ArrowLeft, ArrowRight, RefreshCw, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TactileBookProps {
  pages: PageImage[];
  currentPage: number;
  onPageChange: (index: number) => void;
  layout: ViewLayout;
  onLayoutChange: (layout: ViewLayout) => void;
}

export default function TactileBook({
  pages,
  currentPage,
  onPageChange,
  layout,
  onLayoutChange,
}: TactileBookProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Dimensions of a single page in our design coordinate system
  const designWidth = 430;
  const designHeight = 610;

  // Detect mobile screen on mount & resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const activeLayout = isMobile ? 'single' : layout;
  const isDoubleSpread = activeLayout === 'double' && currentPage > 0 && currentPage < pages.length - 1;

  // Responsive scaling to fit container
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;

      const currentIsMobile = window.innerWidth < 768;
      const currentActiveLayout = currentIsMobile ? 'single' : layout;
      const isDouble = currentActiveLayout === 'double' && currentPage > 0 && currentPage < pages.length - 1;
      // On mobile we minimize margins to let the book use almost 100% of physical screen width/height
      const targetWidth = isDouble 
        ? designWidth * 2 + (currentIsMobile ? 12 : 80) 
        : designWidth + (currentIsMobile ? 12 : 80);
      const targetHeight = designHeight + (currentIsMobile ? 36 : 100);

      const scaleX = width / targetWidth;
      const scaleY = height / targetHeight;
      const finalScale = Math.min(scaleX, scaleY, 1.3); // Upper cap of 1.3x for sharpness

      setScale(finalScale > 0.1 ? finalScale : 1);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [layout, currentPage, pages.length]);

  // Handle arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextPage();
      } else if (e.key === 'ArrowLeft') {
        prevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, isFlipping, activeLayout, pages.length]);

  const nextPage = () => {
    if (isFlipping) return;
    
    if (activeLayout === 'double') {
      if (currentPage === 0) {
        triggerFlip('next', 1);
      } else if (currentPage + 2 < pages.length) {
        triggerFlip('next', currentPage + 2);
      } else if (currentPage + 1 < pages.length) {
        triggerFlip('next', currentPage + 1);
      }
    } else {
      if (currentPage + 1 < pages.length) {
        triggerFlip('next', currentPage + 1);
      }
    }
  };

  const prevPage = () => {
    if (isFlipping) return;

    if (activeLayout === 'double') {
      if (currentPage === 1) {
        triggerFlip('prev', 0);
      } else if (currentPage - 2 >= 0) {
        triggerFlip('prev', currentPage - 2);
      }
    } else {
      if (currentPage - 1 >= 0) {
        triggerFlip('prev', currentPage - 1);
      }
    }
  };

  const triggerFlip = (direction: 'next' | 'prev', targetIndex: number) => {
    setFlipDirection(direction);

    if (activeLayout === 'single') {
      // Single page uses instantaneous parent state updates because Framer Motion's AnimatePresence
      // coordinates concurrent exit/entry animations elegantly. This avoids delay/lag on mobile.
      onPageChange(targetIndex);
    } else {
      setIsFlipping(true);
      
      // Tactile delay to let the double-spread paper-turning 3D animation complete beautifully
      setTimeout(() => {
        onPageChange(targetIndex);
        setIsFlipping(false);
        setFlipDirection(null);
      }, 1200);
    }
  };

  // Determine which page indexes to show based on current layout
  let leftPageIdx = isDoubleSpread ? currentPage : null;
  let rightPageIdx = isDoubleSpread ? currentPage + 1 : currentPage;

  if (isDoubleSpread && isFlipping) {
    if (flipDirection === 'next') {
      leftPageIdx = currentPage;
      rightPageIdx = Math.min(currentPage + 3, pages.length - 1);
    } else if (flipDirection === 'prev') {
      leftPageIdx = Math.max(currentPage - 2, 0);
      rightPageIdx = currentPage + 1;
    }
  }

  // Render a single tactile page surface
  const renderPageSurface = (pageIdx: number, isLeft: boolean) => {
    const page = pages[pageIdx];
    if (!page) return null;

    return (
      <div
        id={`page-surface-${pageIdx}`}
        className="relative select-none bg-paper-light shadow-md transition-shadow duration-300 hover:shadow-lg overflow-hidden border border-amber-900/10"
        style={{
          width: designWidth,
          height: designHeight,
          borderRadius: activeLayout === 'single'
            ? '12px'
            : isLeft 
            ? '12px 3px 3px 12px' 
            : '3px 12px 12px 3px',
        }}
      >
        {/* Real-time high-resolution page image */}
        <img
          src={page.dataUrl}
          alt={`Page ${page.index + 1}`}
          className="w-full h-full object-contain pointer-events-none"
          referrerPolicy="no-referrer"
        />

        {/* Tactile paper fiber highlight texture */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/5 mix-blend-overlay pointer-events-none" />
        
        {/* Subtle physical page aging gradient border */}
        <div 
          className="absolute inset-0 pointer-events-none border border-black/5"
          style={{
            borderRadius: activeLayout === 'single'
              ? '12px'
              : isLeft 
              ? '12px 3px 3px 12px' 
              : '3px 12px 12px 3px',
          }}
        />

        {/* Page numbers formatted inside margins */}
        <div 
          className={`absolute bottom-3 font-mono text-xs text-amber-900/50 ${
            activeLayout === 'single' ? 'right-6' : isLeft ? 'left-6' : 'right-6'
          }`}
        >
          {page.index + 1}
        </div>
      </div>
    );
  };

  // Beautiful single page roll / curl transitions
  const singlePageVariants = {
    enter: (dir: 'next' | 'prev') => ({
      rotateY: dir === 'next' ? 0 : -180,
      scale: dir === 'next' ? 0.96 : 1,
      opacity: dir === 'next' ? 0.8 : 1,
      zIndex: dir === 'next' ? 10 : 20,
      transformOrigin: 'left center',
    }),
    center: {
      rotateY: 0,
      scale: 1,
      opacity: 1,
      zIndex: 15,
      transition: {
        duration: 1.2,
        ease: [0.25, 1, 0.5, 1], // elegant ease-out
      }
    },
    exit: (dir: 'next' | 'prev') => ({
      rotateY: dir === 'next' ? -180 : 0,
      scale: dir === 'next' ? 1 : 0.96,
      opacity: dir === 'next' ? 0 : 0.8,
      zIndex: dir === 'next' ? 20 : 10,
      transformOrigin: 'left center',
      transition: {
        duration: 1.2,
        ease: [0.25, 1, 0.5, 1],
      }
    })
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-1.5 sm:p-4 relative overflow-hidden" ref={containerRef}>
      {/* Top Navbar HUD */}
      <div className="w-full max-w-4xl flex items-center justify-between border-b border-gold/10 pb-2 sm:pb-3 mb-1 sm:mb-2 z-10">
        <div className="flex flex-col">
          <h2 className="font-serif italic text-sm sm:text-lg text-gold/90 font-medium select-none tracking-tight">
            Chittattukara Balavedi Magazine
          </h2>
          <div className="text-[10px] sm:text-xs text-stone-500 font-mono flex items-center gap-2 select-none">
            <span>Pages {currentPage + 1}{isDoubleSpread && ` - ${Math.min(currentPage + 2, pages.length)}`} of {pages.length}</span>
          </div>
        </div>

        {/* View Mode controls - hidden on mobile */}
        {!isMobile && (
          <div className="flex items-center gap-2 bg-stone-900/80 p-1 rounded-lg border border-gold/10 shadow-inner">
            <button
              id="layout-toggle-single"
              onClick={() => onLayoutChange('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium font-sans tracking-wide transition-all ${
                layout === 'single'
                  ? 'bg-gold/20 text-gold border border-gold/30 shadow'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              1 Page
            </button>
            <button
              id="layout-toggle-double"
              onClick={() => onLayoutChange('double')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium font-sans tracking-wide transition-all ${
                layout === 'double'
                  ? 'bg-gold/20 text-gold border border-gold/30 shadow'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              2 Pages
            </button>
          </div>
        )}
      </div>

      {/* Main interactive stage */}
      <div className="flex-1 w-full flex items-center justify-center relative">
        
        {/* Left Tap Zone (50% of viewport width) to navigate to the previous page */}
        <div
          id="left-tap-zone"
          onClick={prevPage}
          className={`absolute left-0 top-0 bottom-0 w-1/2 z-20 cursor-w-resize flex items-center justify-start pl-4 sm:pl-8 group select-none transition-opacity duration-300 ${
            currentPage === 0 || isFlipping ? 'pointer-events-none opacity-0' : 'pointer-events-auto'
          }`}
        >
          {/* Faint hover arrow indicator */}
          <div className="w-10 h-10 rounded-full bg-slate-950/60 border border-gold/15 flex items-center justify-center text-gold/70 opacity-0 group-hover:opacity-100 group-active:scale-90 transition-all duration-300 shadow-lg backdrop-blur-sm pointer-events-none">
            <ArrowLeft className="w-5 h-5" />
          </div>
        </div>

        {/* Right Tap Zone (50% of viewport width) to navigate to the next page */}
        <div
          id="right-tap-zone"
          onClick={nextPage}
          className={`absolute right-0 top-0 bottom-0 w-1/2 z-20 cursor-e-resize flex items-center justify-end pr-4 sm:pr-8 group select-none transition-opacity duration-300 ${
            currentPage >= pages.length - (activeLayout === 'double' && isDoubleSpread ? 2 : 1) || isFlipping 
              ? 'pointer-events-none opacity-0' 
              : 'pointer-events-auto'
          }`}
        >
          {/* Faint hover arrow indicator */}
          <div className="w-10 h-10 rounded-full bg-slate-950/60 border border-gold/15 flex items-center justify-center text-gold/70 opacity-0 group-hover:opacity-100 group-active:scale-90 transition-all duration-300 shadow-lg backdrop-blur-sm pointer-events-none">
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>

        <div
          className="transition-transform duration-500 ease-out flex items-center justify-center relative"
          style={{
            transform: `scale(${scale})`,
            transformStyle: 'preserve-3d',
            perspective: '1500px',
            width: isDoubleSpread ? designWidth * 2 : designWidth,
            height: designHeight,
          }}
        >
          {/* Paper book edge stack - Tactile page sheets layer behind left & right spreads */}
          {isDoubleSpread && (
            <>
              {/* Left page sheets stack */}
              <div 
                className="absolute top-1 bottom-1 bg-stone-200/80 rounded-l-lg border-l border-y border-stone-300 shadow-sm transition-all"
                style={{
                  width: '8px',
                  left: '-8px',
                  transform: 'translateZ(-10px)',
                  boxShadow: '-4px 4px 8px rgba(0,0,0,0.25)',
                }}
              />
              {/* Right page sheets stack */}
              <div 
                className="absolute top-1 bottom-1 bg-stone-200/80 rounded-r-lg border-r border-y border-stone-300 shadow-sm transition-all"
                style={{
                  width: '8px',
                  right: '-8px',
                  transform: 'translateZ(-10px)',
                  boxShadow: '4px 4px 8px rgba(0,0,0,0.25)',
                }}
              />
            </>
          )}

          {/* Book open spread shadow layer */}
          <div 
            className="absolute -inset-6 pointer-events-none transition-all duration-300"
            style={{
              background: isDoubleSpread 
                ? 'radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 80%)'
                : 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 70%)',
              transform: 'translateZ(-20px)',
            }}
          />

          {/* Book spine (the central binding crease) */}
          {isDoubleSpread && (
            <div 
              className="absolute top-0 bottom-0 w-8 z-30 pointer-events-none transition-opacity duration-300"
              style={{
                left: `calc(50% - 16px)`,
                background: 'linear-gradient(to right, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.2) 100%)',
              }}
            />
          )}

          {/* Double spread rendering */}
          {activeLayout === 'double' && isDoubleSpread ? (
            <div className="flex w-full h-full relative" style={{ transformStyle: 'preserve-3d' }}>
              {/* Left Page (even index) */}
              <div className="w-1/2 h-full flex justify-end relative" style={{ transformStyle: 'preserve-3d' }}>
                {renderPageSurface(leftPageIdx!, true)}
              </div>

              {/* Right Page (odd index) */}
              <div className="w-1/2 h-full flex justify-start relative" style={{ transformStyle: 'preserve-3d' }}>
                {renderPageSurface(rightPageIdx!, false)}
              </div>

              {/* Turning 3D Page flip animation overlay */}
              {isFlipping && flipDirection === 'next' && (
                <div 
                  className="absolute top-0 right-0 w-1/2 h-full z-40 origin-left"
                  style={{
                    animation: 'pageFlipNext 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Front of flipping sheet */}
                  <div className="absolute inset-0 backface-hidden" style={{ transformStyle: 'preserve-3d' }}>
                    {renderPageSurface(currentPage + 1, false)}
                  </div>
                  {/* Back of flipping sheet */}
                  <div 
                    className="absolute inset-0 backface-hidden" 
                    style={{ 
                      transform: 'rotateY(180deg)',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {renderPageSurface(Math.min(currentPage + 2, pages.length - 1), true)}
                  </div>
                </div>
              )}

              {/* Prev 3D Page flip animation overlay */}
              {isFlipping && flipDirection === 'prev' && (
                <div 
                  className="absolute top-0 left-0 w-1/2 h-full z-40 origin-right"
                  style={{
                    animation: 'pageFlipPrev 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Front of flipping sheet */}
                  <div className="absolute inset-0 backface-hidden" style={{ transformStyle: 'preserve-3d' }}>
                    {renderPageSurface(currentPage, true)}
                  </div>
                  {/* Back of flipping sheet */}
                  <div 
                    className="absolute inset-0 backface-hidden" 
                    style={{ 
                      transform: 'rotateY(-180deg)',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {renderPageSurface(Math.max(currentPage - 1, 0), false)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Immersive Single Page with gorgeous curling/rolling animation */
            <div className="relative w-full h-full flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
              <AnimatePresence initial={false} custom={flipDirection || 'next'}>
                <motion.div
                  key={currentPage}
                  custom={flipDirection || 'next'}
                  variants={singlePageVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="absolute"
                  style={{
                    width: designWidth,
                    height: designHeight,
                    transformStyle: 'preserve-3d',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                >
                  {renderPageSurface(currentPage, false)}

                  {/* Dynamic page-turn rolling specular shadow/light reflex */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none z-20 rounded-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.35, 0] }}
                    transition={{ duration: 1.2, ease: 'easeInOut' }}
                    style={{
                      background: (flipDirection || 'next') === 'next'
                        ? 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(255,255,255,0.12) 30%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0) 100%)'
                        : 'linear-gradient(-90deg, rgba(0,0,0,0) 0%, rgba(255,255,255,0.12) 30%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0) 100%)',
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation Overlay */}
      <div className="w-full max-w-lg flex items-center justify-between mt-2 sm:mt-3 px-2 sm:px-4 z-10 select-none">
        <button
          id="prev-page-button"
          onClick={prevPage}
          disabled={currentPage === 0 || isFlipping}
          className="flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-stone-900 border border-gold/20 text-gold/80 hover:text-gold hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-stone-900 disabled:hover:text-gold/80 transition-all cursor-pointer shadow-lg disabled:cursor-not-allowed"
          title="Previous Page (Left Arrow)"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Minimal tactile dot indicators of book progress */}
        <div className="flex-1 px-2 sm:px-8 flex items-center justify-center gap-1 overflow-hidden">
          {pages.length <= 15 ? (
            pages.map((_, i) => (
              <button
                key={i}
                id={`dot-indicator-${i}`}
                onClick={() => !isFlipping && onPageChange(i)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  i === currentPage || (isDoubleSpread && i === currentPage + 1)
                    ? 'w-5 bg-gold shadow'
                    : 'w-2 bg-stone-700 hover:bg-stone-500'
                }`}
              />
            ))
          ) : (
            /* Compressed layout for books with many pages */
            <div className="w-full flex flex-col items-center gap-1.5">
              <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden border border-gold/5">
                <div 
                  className="bg-gradient-to-r from-gold/50 to-gold h-full rounded-full transition-all duration-300"
                  style={{ width: `${((currentPage + (isDoubleSpread ? 2 : 1)) / pages.length) * 100}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-stone-500 tracking-wide">
                Page {currentPage + 1} of {pages.length}
              </span>
            </div>
          )}
        </div>

        <button
          id="next-page-button"
          onClick={nextPage}
          disabled={currentPage >= pages.length - (activeLayout === 'double' && isDoubleSpread ? 2 : 1) || isFlipping}
          className="flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-stone-900 border border-gold/20 text-gold/80 hover:text-gold hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-stone-900 disabled:hover:text-gold/80 transition-all cursor-pointer shadow-lg disabled:cursor-not-allowed"
          title="Next Page (Right Arrow)"
        >
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Offscreen Preloader for adjacent pages to completely eliminate image loading flicker */}
      <div className="absolute opacity-0 overflow-hidden pointer-events-none" style={{ width: 0, height: 0 }}>
        {[-3, -2, -1, 1, 2, 3, 4].map((offset) => {
          const targetIdx = currentPage + offset;
          if (targetIdx >= 0 && targetIdx < pages.length) {
            return (
              <img 
                key={targetIdx} 
                src={pages[targetIdx].dataUrl} 
                alt="preload" 
                loading="eager"
              />
            );
          }
          return null;
        })}
      </div>

      {/* 3D Page flip animations dynamically defined using global CSS style injection */}
      <style>{`
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        @keyframes pageFlipNext {
          0% {
            transform: rotateY(0deg);
            box-shadow: 0 0 15px rgba(0,0,0,0.1);
          }
          100% {
            transform: rotateY(-180deg);
            box-shadow: 0 0 35px rgba(0,0,0,0.4);
          }
        }
        @keyframes pageFlipPrev {
          0% {
            transform: rotateY(0deg);
            box-shadow: 0 0 15px rgba(0,0,0,0.1);
          }
          100% {
            transform: rotateY(180deg);
            box-shadow: 0 0 35px rgba(0,0,0,0.4);
          }
        }
      `}</style>
    </div>
  );
}
