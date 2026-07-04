/**
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ReaderMode } from '../types';
import { BookOpen, Compass, Maximize2, Minimize2 } from 'lucide-react';

interface BookNavbarProps {
  mode: ReaderMode;
  onModeChange: (mode: ReaderMode) => void;
  fileName: string;
}

export default function BookNavbar({ mode, onModeChange, fileName }: BookNavbarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error(`Error attempting to exit fullscreen: ${err.message}`);
      });
    }
  };

  return (
    <header className="w-full bg-slate-900 border-b border-gold/15 py-2 sm:py-3.5 px-3 sm:px-6 flex items-center justify-between shadow-md z-20 select-none">
      {/* App Logo branding */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-tr from-amber-700/80 to-gold/90 flex items-center justify-center border border-gold/30 shadow-md">
          <BookOpen className="w-4 sm:w-4.5 h-4 sm:h-4.5 text-slate-950 stroke-[2.5]" />
        </div>
        <div className="flex flex-col">
          <h1 className="font-serif italic text-sm sm:text-base md:text-lg text-gold font-semibold tracking-tight leading-none">
            പെപ്പരപ്പേ
          </h1>
          <span className="text-[9px] sm:text-[10px] md:text-xs text-stone-400 font-sans tracking-wider mt-0.5 max-w-[100px] sm:max-w-[180px] md:max-w-xs truncate">
            {fileName || 'Chittattukara Public Library'}
          </span>
        </div>
      </div>

      {/* Controls Container */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Mode Switches */}
        <div className="flex items-center bg-slate-950 p-0.5 sm:p-1 rounded-lg border border-gold/10 shadow-inner">
          <button
            id="mode-toggle-flip"
            onClick={() => onModeChange('flip')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-[10px] sm:text-xs font-semibold font-sans tracking-wider uppercase transition-all duration-300 cursor-pointer ${
              mode === 'flip'
                ? 'bg-gold text-slate-950 shadow-md font-bold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-slate-900/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3D Flip Book</span>
          </button>
          <button
            id="mode-toggle-scroll"
            onClick={() => onModeChange('scroll')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-[10px] sm:text-xs font-semibold font-sans tracking-wider uppercase transition-all duration-300 cursor-pointer ${
              mode === 'scroll'
                ? 'bg-gold text-slate-950 shadow-md font-bold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-slate-900/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Scroll Book</span>
          </button>
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg bg-slate-950 hover:bg-slate-900 border border-gold/10 hover:border-gold/30 text-gold/80 hover:text-gold transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Mode'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <Maximize2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
        </button>
      </div>
    </header>
  );
}
