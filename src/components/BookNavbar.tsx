/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ReaderMode } from '../types';
import { BookOpen, RefreshCw, Compass } from 'lucide-react';

interface BookNavbarProps {
  mode: ReaderMode;
  onModeChange: (mode: ReaderMode) => void;
  fileName: string;
}

export default function BookNavbar({ mode, onModeChange, fileName }: BookNavbarProps) {
  return (
    <header className="w-full bg-slate-900 border-b border-gold/15 py-3.5 px-6 flex items-center justify-between shadow-md z-20 select-none">
      {/* App Logo branding */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-700/80 to-gold/90 flex items-center justify-center border border-gold/30 shadow-md">
          <BookOpen className="w-4.5 h-4.5 text-slate-950 stroke-[2.5]" />
        </div>
        <div className="flex flex-col">
          <h1 className="font-serif italic text-base md:text-lg text-gold font-semibold tracking-tight leading-none">
            പെപ്പരപ്പേ
          </h1>
          <span className="text-[10px] md:text-xs text-stone-400 font-sans tracking-wider mt-0.5 max-w-[140px] md:max-w-xs truncate">
            {fileName || 'Chittattukara Public Library'}
          </span>
        </div>
      </div>

      {/* Mode Switches */}
      <div className="flex items-center gap-3.5">
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-gold/10 shadow-inner">
          <button
            id="mode-toggle-flip"
            onClick={() => onModeChange('flip')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold font-sans tracking-wider uppercase transition-all duration-300 cursor-pointer ${
              mode === 'flip'
                ? 'bg-gold text-slate-950 shadow-md font-bold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-slate-900/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            3D Flip Book
          </button>
          <button
            id="mode-toggle-scroll"
            onClick={() => onModeChange('scroll')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold font-sans tracking-wider uppercase transition-all duration-300 cursor-pointer ${
              mode === 'scroll'
                ? 'bg-gold text-slate-950 shadow-md font-bold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-slate-900/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Scroll Book
          </button>
        </div>
      </div>
    </header>
  );
}
