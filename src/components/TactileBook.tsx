/**
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { PageImage, ViewLayout } from '../types';
import { ArrowLeft, ArrowRight, RefreshCw, Layers } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import confetti from 'canvas-confetti';

interface TactileBookProps {
  pages: PageImage[];
  layout: ViewLayout;
  currentPage: number;
  onPageChange: (index: number) => void;
  onLayoutChange: (layout: ViewLayout) => void;
}

export default function TactileBook({
  pages,
  layout,
  currentPage,
  onPageChange,
  onLayoutChange,
}: TactileBookProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [scale, setScale] = useState(1);
  const [isFlipping, setIsFlipping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Single MotionValue to track physical page rotation around Y-axis
  const bookRotateY = useMotionValue(0);

  // Map bookRotateY to shadow opacity dynamically
  const pageShadow = useTransform(
    bookRotateY,
    [-180, -90, 0, 90, 180],
    [0, 0.4, 0, 0.4, 0]
  );

  // Handle window resizing and responsive scaling
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const activeLayout = isMobile ? 'single' : layout;
  const isDoubleSpread = activeLayout === 'double' && currentPage > 0 && currentPage < pages.length - 1;
  const isAtEnd = currentPage >= pages.length - (activeLayout === 'double' && isDoubleSpread ? 2 : 1);

  // Responsive scaling to fit container precisely
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      
      const { width, height } = containerRef.current.getBoundingClientRect();
      const designWidth = 420;
      const designHeight = 560;

      // Mobile gets near-fullscreen viewport margins (minimal padding to maximize book size on small screens)
      const targetWidth = isDoubleSpread 
        ? designWidth * 2 + (isMobile ? 2 : 80) 
        : designWidth + (isMobile ? 2 : 80);
      const targetHeight = designHeight + (isMobile ? 4 : 100);

      const scaleX = width / targetWidth;
      const scaleY = height / targetHeight;
      
      // Compute ideal scale to prevent overflow
      const newScale = Math.min(scaleX, scaleY, 1.2);
      setScale(newScale);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [activeLayout, isDoubleSpread, isMobile]);

  // Handle Keyboard Arrows for tactile browsing
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
  }, [currentPage, activeLayout, isFlipping, pages.length]);

  const nextPage = async () => {
    if (isFlipping) return;
    const step = activeLayout === 'double' && currentPage > 0 ? 2 : 1;
    if (currentPage + step < pages.length) {
      setIsFlipping(true);
      
      // Trigger gorgeous turning animation using programatic animate
      await animate(bookRotateY, -180, { duration: 0.6, ease: 'easeInOut' });
      
      const nextIndex = Math.min(currentPage + step, pages.length - 1);
      onPageChange(nextIndex);
      
      // Trigger confetti if completed
      const nextIsAtEnd = nextIndex >= pages.length - (activeLayout === 'double' && nextIndex > 0 && nextIndex < pages.length - 1 ? 2 : 1);
      if (nextIsAtEnd) {
        triggerConfetti();
      }

      bookRotateY.set(0);
      setIsFlipping(false);
    }
  };

  const prevPage = async () => {
    if (isFlipping) return;
    if (currentPage > 0) {
      setIsFlipping(true);
      const step = activeLayout === 'double' && currentPage > 2 ? 2 : 1;
      const prevIndex = Math.max(currentPage - step, 0);

      // Slide in from left transition: start at -180, then animate to 0
      bookRotateY.set(-180);
      onPageChange(prevIndex);

      await animate(bookRotateY, 0, { duration: 0.6, ease: 'easeInOut' });

      setIsFlipping(false);
    }
  };

  // Pan gestures for mobile
  const handlePan = (_event: any, info: any) => {
    if (!isMobile || isFlipping) return;
    
    // Map negative horizontal movement (dragging left) to -180 rotation
    if (info.offset.x < 0) {
      const angle = (info.offset.x / 180) * 180; // Map 180px of drag to 180deg of rotation
      bookRotateY.set(Math.max(-180, angle));
    } else {
      // Small visual resistance tilt when dragging right (to signal you can go back)
      const angle = (info.offset.x / 180) * 25; // Max 25 degrees tilt
      bookRotateY.set(Math.min(25, angle));
    }
  };

  const handlePanEnd = async (_event: any, info: any) => {
    if (!isMobile || isFlipping) return;
    
    const threshold = 45; // responsive threshold in pixels
    const velocityThreshold = 180; // swipe speed
    const xOffset = info.offset.x;
    const xVelocity = info.velocity.x;

    if (xOffset < -threshold || xVelocity < -velocityThreshold) {
      // Turn forward (Next Page)
      const step = activeLayout === 'double' && currentPage > 0 ? 2 : 1;
      if (currentPage + step < pages.length) {
        setIsFlipping(true);
        // Animate remaining rotation to -180
        await animate(bookRotateY, -180, { duration: 0.35, ease: 'easeOut' });
        
        const nextIndex = Math.min(currentPage + step, pages.length - 1);
        onPageChange(nextIndex);
        
        if (nextIndex >= pages.length - 1) {
          triggerConfetti();
        }
        
        bookRotateY.set(0);
        setIsFlipping(false);
      } else {
        // Elastic snap back
        await animate(bookRotateY, 0, { type: 'spring', stiffness: 250, damping: 20 });
      }
    } else if (xOffset > threshold || xVelocity > velocityThreshold) {
      // Turn backward (Prev Page)
      if (currentPage > 0) {
        setIsFlipping(true);
        const step = activeLayout === 'double' && currentPage > 2 ? 2 : 1;
        const prevIndex = Math.max(currentPage - step, 0);

        // Setup starting visual state (rotated all the way left)
        bookRotateY.set(-180);
        onPageChange(prevIndex);
        
        // Then animate turning back to 0
        await animate(bookRotateY, 0, { duration: 0.45, ease: 'easeOut' });
        setIsFlipping(false);
      } else {
        // Elastic snap back
        await animate(bookRotateY, 0, { type: 'spring', stiffness: 250, damping: 20 });
      }
    } else {
      // Snap back to 0 if gesture is small/undecided
      await animate(bookRotateY, 0, { type: 'spring', stiffness: 250, damping: 22 });
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#E5C158', '#B08E2B', '#FFFFFF', '#475569']
    });
  };

  // Helper page render loaders
  const getPageUrl = (index: number) => {
    if (index >= 0 && index < pages.length) {
      return pages[index].url;
    }
    return '';
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

        {/* Column layout buttons (hidden on mobile) */}
        {!isMobile && (
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-gold/5">
            <button
              onClick={() => onLayoutChange('single')}
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                layout === 'single'
                  ? 'bg-gold/15 text-gold border border-gold/25 shadow-inner'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 rotate-90" />
              <span>Single Page</span>
            </button>
            <button
              onClick={() => onLayoutChange('double')}
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                layout === 'double'
                  ? 'bg-gold/15 text-gold border border-gold/25 shadow-inner'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Double Spread</span>
            </button>
          </div>
        )}
      </div>

      {/* Primary 3D Book Stage */}
      <div className="flex-1 flex items-center justify-center w-full z-10 select-none">
        <div 
          className="relative transition-transform duration-300"
          style={{ transform: `scale(${scale})` }}
        >
          {/* Main 3D Book Frame */}
          <div 
            className="perspective-container relative flex items-center justify-center select-none"
            style={{
              width: activeLayout === 'double' ? '840px' : '420px',
              height: '560px',
            }}
          >
            {/* Center Spine Shadow overlay (only in double layout) */}
            {activeLayout === 'double' && (
              <div className="absolute top-0 bottom-0 left-1/2 w-[30px] -ml-[15px] bg-gradient-to-r from-black/45 via-black/10 to-black/45 z-30 pointer-events-none" />
            )}

            {/* Render 3D Book layouts */}
            {activeLayout === 'double' ? (
              // ------------------------------------
              // DOUBLE PAGE SPREAD 3D VIEWPORT
              // ------------------------------------
              <>
                {/* Left hardbook cover board background */}
                <div className="absolute top-0 bottom-0 left-0 right-1/2 bg-amber-950/40 rounded-l-xl border-l-4 border-y-2 border-amber-900 shadow-2xl z-0" />
                {/* Right hardbook cover board background */}
                <div className="absolute top-0 bottom-0 left-1/2 right-0 bg-amber-950/40 rounded-r-xl border-r-4 border-y-2 border-amber-900 shadow-2xl z-0" />

                {/* Left Fixed Base Page (revealed when turning right) */}
                <div className="absolute top-2 bottom-2 left-2 right-1/2 bg-white rounded-l-md overflow-hidden border-r border-stone-200 z-10 page-shadow-right select-none">
                  {currentPage > 0 ? (
                    <img 
                      src={getPageUrl(currentPage - 1)} 
                      alt="Left Static Under" 
                      className="w-full h-full object-fill pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full bg-stone-900 flex items-center justify-center text-stone-500 font-serif italic text-sm">Cover Inner</div>
                  )}
                </div>

                {/* Right Fixed Base Page (revealed when turning left) */}
                <div className="absolute top-2 bottom-2 left-1/2 right-2 bg-white rounded-r-md overflow-hidden border-l border-stone-200 z-10 page-shadow-left select-none">
                  {currentPage + 2 < pages.length ? (
                    <img 
                      src={getPageUrl(currentPage + 2)} 
                      alt="Right Static Under" 
                      className="w-full h-full object-fill pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full bg-stone-900 flex items-center justify-center text-stone-500 font-serif italic text-sm font-semibold">End Cover</div>
                  )}
                </div>

                {/* Left Page (Visual Spine Static Front) */}
                <div className="absolute top-2 bottom-2 left-2 right-1/2 bg-white rounded-l-md overflow-hidden border-r border-stone-200 z-20 page-shadow-right select-none">
                  {currentPage === 0 ? (
                    // On first page (cover), the left side of spread is empty cover backboard
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center border-r border-stone-800">
                      <span className="font-serif italic text-stone-600 text-xs tracking-widest">CHITTATTUKARA BALAVEDI</span>
                    </div>
                  ) : (
                    <img 
                      src={getPageUrl(currentPage)} 
                      alt="Left Active Page" 
                      className="w-full h-full object-fill pointer-events-none"
                    />
                  )}
                  <span className="absolute bottom-2 left-4 font-mono text-[10px] text-stone-400 bg-black/40 px-2 py-0.5 rounded">Page {currentPage === 0 ? 'Cover' : currentPage + 1}</span>
                </div>

                {/* Right Flippable Active Page Sheet (No gestures on double-page view) */}
                <motion.div
                  className="absolute top-2 bottom-2 left-1/2 right-2 bg-white rounded-r-md overflow-hidden border-l border-stone-200 page-shadow-left origin-left select-none"
                  style={{
                    zIndex: isFlipping ? 40 : 25,
                    transformStyle: 'preserve-3d',
                    rotateY: bookRotateY,
                    transformOrigin: 'left center',
                  }}
                >
                  {/* Front Side of sheet (Currently viewed Page) */}
                  <div className="absolute inset-0 z-10 w-full h-full backface-hidden">
                    <img 
                      src={getPageUrl(currentPage + 1)} 
                      alt="Right Flipping Page Front" 
                      className="w-full h-full object-fill pointer-events-none"
                    />
                    <span className="absolute bottom-2 right-4 font-mono text-[10px] text-stone-400 bg-black/40 px-2 py-0.5 rounded">Page {currentPage + 2}</span>
                    
                    {/* Shadow overlay darkening sheet as it turns */}
                    <motion.div 
                      className="absolute inset-0 bg-black pointer-events-none"
                      style={{ opacity: pageShadow }}
                    />
                  </div>

                  {/* Back Side of sheet (Revealed when turned over to the left) */}
                  <div 
                    className="absolute inset-0 z-0 w-full h-full"
                    style={{ 
                      transform: 'rotateY(180deg)',
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    {currentPage + 2 < pages.length ? (
                      <img 
                        src={getPageUrl(currentPage + 2)} 
                        alt="Right Flipping Page Back" 
                        className="w-full h-full object-fill pointer-events-none"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-900" />
                    )}
                  </div>
                </motion.div>
              </>
            ) : (
              // ------------------------------------
              // SINGLE PAGE 3D PORTRAIT VIEWPORT (Mobile Default)
              // ------------------------------------
              <>
                {/* Book hard backboard backing */}
                <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-amber-950 to-amber-900 rounded-xl border-x-4 border-y-2 border-amber-800/80 shadow-2xl z-0" />

                {/* Base Underneath Page (Revealed when turning left to Next Page) */}
                <div className="absolute top-1.5 bottom-1.5 left-1.5 right-1.5 bg-white rounded-lg overflow-hidden z-10 border border-stone-200 select-none shadow-inner">
                  {currentPage + 1 < pages.length ? (
                    <img 
                      src={getPageUrl(currentPage + 1)} 
                      alt="Static Under Page" 
                      className="w-full h-full object-fill pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-gold/40 text-xs p-4 text-center">
                      <span className="text-2xl mb-2">📖</span>
                      <p className="font-serif italic font-semibold">End of Book</p>
                    </div>
                  )}
                </div>

                {/* Active Flippable Page Layer */}
                <motion.div
                  className="absolute top-1.5 bottom-1.5 left-1.5 right-1.5 bg-white rounded-lg overflow-hidden border border-stone-200 cursor-grab active:cursor-grabbing origin-left select-none"
                  style={{
                    zIndex: 25,
                    transformStyle: 'preserve-3d',
                    rotateY: bookRotateY,
                    transformOrigin: 'left center',
                  }}
                  onPanStart={isMobile ? () => setIsFlipping(true) : undefined}
                  onPan={isMobile ? handlePan : undefined}
                  onPanEnd={isMobile ? handlePanEnd : undefined}
                >
                  <div className="absolute inset-0 w-full h-full backface-hidden z-10 bg-white">
                    <img 
                      src={getPageUrl(currentPage)} 
                      alt="Active Page Single" 
                      className="w-full h-full object-fill pointer-events-none"
                    />
                    
                    {/* Shadow overlay that dims the page dynamically as it is dragged and rotated */}
                    <motion.div 
                      className="absolute inset-0 bg-black pointer-events-none"
                      style={{ opacity: pageShadow }}
                    />
                  </div>

                  {/* Back face of the page for completing 180deg flip */}
                  <div 
                    className="absolute inset-0 w-full h-full bg-stone-100"
                    style={{ 
                      transform: 'rotateY(180deg)',
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    {currentPage + 1 < pages.length ? (
                      <img 
                        src={getPageUrl(currentPage + 1)} 
                        alt="Back Single Page" 
                        className="w-full h-full object-fill pointer-events-none"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-950" />
                    )}
                  </div>
                </motion.div>
                
                {/* Elegant Mobile Touch Hint Overlay */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                  <span className="text-[9px] text-stone-400 bg-slate-950/80 px-2.5 py-1 rounded-full tracking-wider font-sans border border-gold/10 backdrop-blur">
                    ← Swipe / Drag left to flip page →
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer Navigation Overlay */}
      <div className="w-full max-w-lg flex flex-col items-center gap-2 sm:gap-3 mt-2 sm:mt-3 px-2 sm:px-4 z-10 select-none">
        {/* Animated Congratulations Banner when the book is finished */}
        {isAtEnd && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full bg-slate-950/95 border border-gold/30 rounded-xl p-3 flex items-center justify-between gap-3 shadow-lg shadow-gold/5"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🎉</span>
              <div className="text-left">
                <p className="text-[11px] sm:text-xs font-bold text-gold tracking-wide uppercase">Book Completed!</p>
                <p className="text-[9px] sm:text-[10px] text-stone-400">You have finished the magazine.</p>
              </div>
            </div>
            <button
              onClick={() => onPageChange(0)}
              className="flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-slate-950 font-bold text-[10px] sm:text-xs rounded-lg shadow-md transition-all active:scale-95 cursor-pointer font-sans"
            >
              <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Read Again
            </button>
          </motion.div>
        )}

        <div className="w-full flex items-center justify-between">
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
      </div>

      {/* Offscreen Preloader for adjacent pages to completely eliminate image loading flicker */}
      <div className="hidden">
        {currentPage > 0 && <img src={getPageUrl(currentPage - 1)} />}
        {currentPage + 1 < pages.length && <img src={getPageUrl(currentPage + 1)} />}
        {currentPage + 2 < pages.length && <img src={getPageUrl(currentPage + 2)} />}
        {currentPage + 3 < pages.length && <img src={getPageUrl(currentPage + 3)} />}
      </div>
    </div>
  );
}
