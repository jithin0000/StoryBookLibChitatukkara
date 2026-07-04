/**
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { PageImage, ViewLayout } from '../types';
import { Layers, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface ScrollBookProps {
  pages: PageImage[];
  layout: ViewLayout;
  onLayoutChange: (layout: ViewLayout) => void;
  onPageChange: (index: number) => void;
}

export default function ScrollBook({ pages, layout, onLayoutChange, onPageChange }: ScrollBookProps) {
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

  const renderPages = () => {
    if (activeLayout === 'double') {
      // Group pages into spreads (cover, then pairs, then back cover)
      const spreads: Array<PageImage[]> = [];
      
      // Cover page (Page 0) is solo
      spreads.push([pages[0]]);
      
      // Subsequent pages in pairs
      for (let i = 1; i < pages.length - 1; i += 2) {
        if (i + 1 < pages.length) {
          spreads.push([pages[i], pages[i + 1]]);
        } else {
          spreads.push([pages[i]]);
        }
      }

      // Back cover is solo if it wasn't already paired
      if (pages.length > 1 && pages.length % 2 === 0) {
        spreads.push([pages[pages.length - 1]]);
      }

      return (
        <div className="flex flex-col items-center gap-16 py-8 w-full max-w-5xl animate-fade-in">
          {spreads.map((spread, sIndex) => (
            <div key={sIndex} className="flex flex-col items-center gap-3 w-full">
              <div className="flex justify-center items-stretch bg-slate-900/30 p-4 rounded-2xl border border-gold/5 shadow-2xl backdrop-blur-sm max-w-full">
                {spread.map((page) => (
                  <motion.div
                    key={page.index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.5 }}
                    className="relative overflow-hidden select-none flex-1 max-w-[450px]"
                    style={{
                      aspectRatio: `${page.width} / ${page.height}`,
                    }}
                  >
                    <img
                      src={page.url}
                      alt={`Page ${page.index + 1}`}
                      className="w-full h-full object-contain pointer-events-none rounded shadow-md border border-slate-950"
                      loading="lazy"
                    />
                    <div className="absolute bottom-2 right-3 font-mono text-[10px] bg-slate-950/70 border border-gold/10 px-2 py-0.5 rounded text-gold/80">
                      Page {page.index + 1}
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="text-center font-mono text-[11px] text-stone-500">
                {spread.length === 2 
                  ? `Pages ${spread[0].index + 1} - ${spread[1].index + 1}`
                  : `Page ${spread[0].index + 1}`
                }
              </div>
            </div>
          ))}
        </div>
      );
    }

    // 1-page single column layout
    return (
      <div className="flex flex-col items-center gap-6 sm:gap-12 py-4 sm:py-8 px-1 sm:px-4 w-full max-w-xl animate-fade-in">
        {pages.map((page) => (
          <motion.div
            key={page.index}
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-2.5 w-full bg-slate-900/20 p-2 sm:p-3.5 rounded-xl border border-gold/5 shadow-xl"
          >
            <div 
              className="relative w-full rounded-md overflow-hidden shadow-lg border border-slate-950"
              style={{ aspectRatio: `${page.width} / ${page.height}` }}
            >
              <img
                src={page.url}
                alt={`Page ${page.index + 1}`}
                className="w-full h-full object-contain pointer-events-none"
                loading="lazy"
              />
            </div>
            <div className="font-mono text-[10px] text-stone-500 tracking-wider">
              PAGE {page.index + 1} / {pages.length}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 w-full flex flex-col items-center overflow-y-auto px-1.5 sm:px-4">
      {/* Top HUD panel */}
      <div className="w-full max-w-4xl flex items-center justify-between border-b border-gold/10 pb-2 sm:pb-3 mb-1 sm:mb-2 z-10 sticky top-0 bg-slate-950/90 backdrop-blur py-2 sm:py-3">
        <div className="flex flex-col">
          <h2 className="font-serif italic text-sm sm:text-lg text-gold/90 font-medium select-none tracking-tight">
            Chittattukara Balavedi Magazine
          </h2>
          <span className="text-[10px] sm:text-xs text-stone-500 font-mono select-none">
            Continuous Scroll Mode ({pages.length} pages total)
          </span>
        </div>

        {/* Column switch controls (hidden on mobile) */}
        {!isMobile && (
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-gold/5">
            <button
              onClick={() => onLayoutChange('single')}
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                layout === 'single'
                  ? 'bg-gold/15 text-gold border border-gold/25 shadow-inner'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Single Page Scrolling"
            >
              <Layers className="w-3.5 h-3.5 rotate-90" />
              <span>Single</span>
            </button>
            <button
              onClick={() => onLayoutChange('double')}
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                layout === 'double'
                  ? 'bg-gold/15 text-gold border border-gold/25 shadow-inner'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Double Page Spreads"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Spreads</span>
            </button>
          </div>
        )}
      </div>

      {/* Render list of pages */}
      {renderPages()}

      {/* Elegant Completion Card for continuous scrolling */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, margin: '-20px' }}
        className="w-full max-w-xl bg-slate-950/80 border border-gold/20 rounded-xl p-5 sm:p-6 mb-12 flex flex-col items-center text-center gap-4 shadow-lg backdrop-blur"
      >
        <span className="text-3xl">🎉</span>
        <div>
          <h3 className="font-serif italic text-lg text-gold font-semibold">You've finished the book!</h3>
          <p className="text-xs text-stone-400 mt-1">Thank you for reading the Chittattukara Balavedi Magazine.</p>
        </div>
        <button
          onClick={() => {
            const container = document.querySelector('.overflow-y-auto');
            if (container) {
              container.scrollTo({ top: 0, behavior: 'smooth' });
            }
            onPageChange(0);
          }}
          className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-slate-950 font-bold text-xs rounded-lg shadow-md transition-all active:scale-95 cursor-pointer font-sans"
        >
          <RefreshCw className="w-4 h-4" />
          Read Again from Page 1
        </button>
      </motion.div>
    </div>
  );
}
