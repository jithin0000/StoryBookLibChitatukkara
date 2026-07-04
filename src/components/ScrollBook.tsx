/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PageImage, ViewLayout } from '../types';
import { Layers } from 'lucide-react';
import { motion } from 'motion/react';

interface ScrollBookProps {
  pages: PageImage[];
  layout: ViewLayout;
  onLayoutChange: (layout: ViewLayout) => void;
}

export default function ScrollBook({ pages, layout, onLayoutChange }: ScrollBookProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const activeLayout = isMobile ? 'single' : layout;

  // Group pages into double page spreads if 2-page layout is active
  const renderPages = () => {
    if (activeLayout === 'double') {
      const spreads: PageImage[][] = [];
      // Page 0 (Cover) is centered as a single page spread
      spreads.push([pages[0]]);

      // Remaining pages are grouped into pairs (Left page, Right page)
      for (let i = 1; i < pages.length; i += 2) {
        const pair = [pages[i]];
        if (i + 1 < pages.length) {
          pair.push(pages[i + 1]);
        }
        spreads.push(pair);
      }

      return (
        <div className="flex flex-col items-center gap-16 py-8 px-4 w-full max-w-6xl animate-fade-in">
          {spreads.map((spread, sIdx) => (
            <motion.div
              key={sIdx}
              id={`scroll-spread-${sIdx}`}
              initial={{ opacity: 0, y: 40, rotateX: 2 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`flex flex-wrap justify-center items-center gap-4 md:gap-0 w-full relative ${
                spread.length === 2 ? 'perspective-[1500px]' : ''
              }`}
            >
              {spread.map((page, pIdx) => {
                const isLeft = spread.length === 2 && pIdx === 0;
                const isRight = spread.length === 2 && pIdx === 1;

                return (
                  <div
                    key={page.index}
                    className="relative bg-paper-light border border-amber-900/10 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl max-w-full"
                    style={{
                      width: '420px',
                      aspectRatio: '420 / 590',
                      borderRadius: isLeft
                        ? '10px 2px 2px 10px'
                        : isRight
                        ? '2px 10px 10px 2px'
                        : '8px',
                    }}
                  >
                    {/* Spine shading overlay inside double page spreads */}
                    {isLeft && (
                      <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-black/15 to-transparent pointer-events-none z-10" />
                    )}
                    {isRight && (
                      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/15 to-transparent pointer-events-none z-10" />
                    )}

                    {/* Fluid high-resolution page image */}
                    <img
                      src={page.dataUrl}
                      alt={`Page ${page.index + 1}`}
                      className="w-full h-full object-contain pointer-events-none"
                      referrerPolicy="no-referrer"
                    />

                    {/* Paper grain visual asset layering */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/5 mix-blend-overlay pointer-events-none" />

                    {/* Outer frame borders */}
                    <div className="absolute inset-0 pointer-events-none border border-black/5" />

                    {/* Standard margin footer with page indexes */}
                    <div
                      className={`absolute bottom-3 font-mono text-xs text-amber-900/40 ${
                        isLeft ? 'left-6' : 'right-6'
                      }`}
                    >
                      {page.index + 1}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ))}
        </div>
      );
    }

    // 1-page single column layout
    return (
      <div className="flex flex-col items-center gap-12 py-8 px-4 w-full max-w-xl animate-fade-in">
        {pages.map((page) => (
          <motion.div
            key={page.index}
            id={`scroll-page-${page.index}`}
            initial={{ opacity: 0, y: 35, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative bg-paper-light border border-amber-900/10 shadow-lg hover:shadow-xl rounded-xl overflow-hidden w-full"
            style={{
              aspectRatio: '430 / 610',
            }}
          >
            <img
              src={page.dataUrl}
              alt={`Page ${page.index + 1}`}
              className="w-full h-full object-contain pointer-events-none"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/5 mix-blend-overlay pointer-events-none" />
            <div className="absolute inset-0 pointer-events-none border border-black/5" />
            <div className="absolute bottom-3 right-6 font-mono text-xs text-amber-900/40">
              {page.index + 1}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 w-full flex flex-col items-center overflow-y-auto px-4">
      {/* Top HUD panel */}
      <div className="w-full max-w-4xl flex items-center justify-between border-b border-gold/10 pb-3 mb-2 z-10 sticky top-0 bg-slate-950/90 backdrop-blur py-3">
        <div className="flex flex-col">
          <h2 className="font-serif italic text-lg text-gold/90 font-medium select-none tracking-tight">
            Chittattukara Balavedi Magazine
          </h2>
          <span className="text-xs text-stone-500 font-mono select-none">
            Continuous Scroll Mode ({pages.length} pages total)
          </span>
        </div>

        {/* View Mode controls - hidden on mobile */}
        {!isMobile && (
          <div className="flex items-center gap-2 bg-stone-900/80 p-1 rounded-lg border border-gold/10 shadow-inner">
            <button
              id="scroll-toggle-single"
              onClick={() => onLayoutChange('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium font-sans tracking-wide transition-all ${
                layout === 'single'
                  ? 'bg-gold/20 text-gold border border-gold/30 shadow'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              1 Page Column
            </button>
            <button
              id="scroll-toggle-double"
              onClick={() => onLayoutChange('double')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium font-sans tracking-wide transition-all ${
                layout === 'double'
                  ? 'bg-gold/20 text-gold border border-gold/30 shadow'
                  : 'text-stone-400 hover:text-stone-200 border border-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              2 Pages Spread
            </button>
          </div>
        )}
      </div>

      {/* Render list of pages */}
      {renderPages()}
    </div>
  );
}
