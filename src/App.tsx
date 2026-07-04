/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PageImage, ReaderMode, ViewLayout, BookMetadata } from './types';
import {
  getBookFromCache,
  saveBookToCache,
  convertPdfToImages,
} from './lib/pdfUtils';
import BookNavbar from './components/BookNavbar';
import TactileBook from './components/TactileBook';
import ScrollBook from './components/ScrollBook';
import { BookOpen, RefreshCw } from 'lucide-react';

export default function App() {
  const [pages, setPages] = useState<PageImage[]>([]);
  const [metadata, setMetadata] = useState<BookMetadata | null>(null);

  // Loading & Processing feedback states
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(0);
  const [loadingTotal, setLoadingTotal] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Layout & Navigation states
  const [currentPage, setCurrentPage] = useState(0);
  const [mode, setMode] = useState<ReaderMode>('flip');
  const [layout, setLayout] = useState<ViewLayout>('double');

  // Load the PDF automatically on start
  useEffect(() => {
    async function loadBook() {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Check if there's a cached version in IndexedDB
        const cached = await getBookFromCache();

        // 2. Fetch the PDF automatically from the root
        let response = await fetch('/pepparappe.pdf');
        let filename = 'Pepparappe - Chittattukara Public Library.pdf';
        
        if (!response.ok) {
          response = await fetch('/pepperappe.pdf');
          filename = 'Pepperappe - Chittattukara Public Library.pdf';
        }

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const size = arrayBuffer.byteLength;

          // If cache exists and has matching file size, load it instantly!
          if (cached && cached.metadata && cached.metadata.size === size && cached.pages?.length > 0) {
            setPages(cached.pages);
            setMetadata(cached.metadata);
            setIsLoading(false);
            return;
          }

          // Otherwise, parse and render the PDF pages into high-resolution images
          const bookMeta: BookMetadata = {
            name: filename,
            size: size,
            totalPages: 44, // Initial guess, will be updated below
          };

          const renderedPages = await convertPdfToImages(arrayBuffer, (pageIdx, total, progress) => {
            setLoadingPage(pageIdx);
            setLoadingTotal(total);
            setLoadingProgress(progress);
          });

          if (renderedPages.length === 0) {
            throw new Error('This PDF contains no readable pages.');
          }

          bookMeta.totalPages = renderedPages.length;

          setPages(renderedPages);
          setMetadata(bookMeta);
          await saveBookToCache(bookMeta, renderedPages);
        } else {
          // Fetch failed (e.g. file not uploaded yet). Use cache as fallback if available.
          if (cached && cached.pages && cached.pages.length > 0) {
            setPages(cached.pages);
            setMetadata(cached.metadata);
          } else {
            throw new Error("Could not load '/pepparappe.pdf' or '/pepperappe.pdf'. Make sure you upload the PDF file to the root directory.");
          }
        }
      } catch (err: any) {
        console.error('Failed to compile PDF storybook:', err);
        setError(err?.message || 'An error occurred while compiling your PDF storybook.');
      } finally {
        setIsLoading(false);
      }
    }

    loadBook();
  }, []);

  // Set reader defaults based on screen size on book load
  useEffect(() => {
    if (pages.length > 0) {
      const handleResponsiveDefaults = () => {
        if (window.innerWidth < 768) {
          setLayout('single');
        } else {
          setLayout('double');
        }
      };
      
      handleResponsiveDefaults();
      window.addEventListener('resize', handleResponsiveDefaults);
      return () => window.removeEventListener('resize', handleResponsiveDefaults);
    }
  }, [pages.length]);

  if (pages.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-stone-100 flex flex-col font-sans selection:bg-gold/30 selection:text-gold antialiased overflow-hidden">
        <main className="flex-1 w-full flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center gap-6 p-8 bg-slate-900/60 rounded-2xl border border-gold/15 shadow-xl max-w-md w-full">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <RefreshCw className="w-10 h-10 text-gold animate-spin stroke-[1.5]" />
              </div>
              <div className="space-y-2">
                <h3 className="font-serif italic text-xl text-gold font-medium">Compiling Manuscript...</h3>
                {loadingTotal > 0 ? (
                  <p className="text-sm text-stone-400 font-mono">
                    Rendering Page {loadingPage} of {loadingTotal} ({loadingProgress}%)
                  </p>
                ) : (
                  <p className="text-sm text-stone-400">Reading manuscript PDF and preparing high-resolution pages...</p>
                )}
              </div>
              {loadingTotal > 0 && (
                <div className="w-full bg-slate-950 rounded-full h-1.5 border border-gold/5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-600 to-gold h-full rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 p-8 bg-slate-900/40 rounded-2xl border border-red-500/10 shadow-lg max-w-md w-full animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-red-950/40 flex items-center justify-center border border-red-900/30">
                <BookOpen className="w-6 h-6 text-red-400 stroke-[1.5]" />
              </div>
              <div className="space-y-2">
                <h3 className="font-serif italic text-xl text-gold font-medium">Manuscript Not Found</h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Please upload the PDF file named <code className="px-1.5 py-0.5 bg-slate-950 text-gold rounded font-mono text-[10px] border border-gold/10">pepparappe.pdf</code> to the root directory to load your storybook.
                </p>
              </div>
              {error && (
                <div className="w-full p-3 bg-red-950/20 rounded-lg border border-red-950 text-left">
                  <p className="text-xs text-red-400 font-mono break-all">{error}</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-stone-100 flex flex-col font-sans selection:bg-gold/30 selection:text-gold antialiased overflow-hidden">
      {/* Display PDF reader navbar once a book is parsed and loaded */}
      {pages.length > 0 && (
        <BookNavbar
          mode={mode}
          onModeChange={setMode}
          fileName={metadata?.name || ''}
        />
      )}

      <main className="flex-1 w-full flex flex-col relative overflow-hidden">
        {mode === 'flip' ? (
          /* Immersive 3D paper flipping layout */
          <TactileBook
            pages={pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            layout={layout}
            onLayoutChange={setLayout}
          />
        ) : (
          /* Staggered vertical scroll cinematic layout */
          <ScrollBook
            pages={pages}
            layout={layout}
            onLayoutChange={setLayout}
          />
        )}
      </main>
    </div>
  );
}
