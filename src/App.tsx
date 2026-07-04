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
import { BookOpen, RefreshCw, Upload } from 'lucide-react';

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

  // Manual file upload handler
  const processPdfFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const size = file.size;
      const bookMeta: BookMetadata = {
        name: file.name,
        size: size,
        totalPages: 0,
      };

      const renderedPages = await convertPdfToImages(file, (pageIdx, total, progress) => {
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
    } catch (err: any) {
      console.error('Failed to parse uploaded PDF:', err);
      setError(err?.message || 'Failed to parse the PDF file. Make sure it is not password-protected and is a valid PDF.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPdfFile(file);
    }
  };

  // Load the PDF automatically on start
  useEffect(() => {
    async function loadBook() {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Check if there's a cached version in IndexedDB
        const cached = await getBookFromCache();

        // 2. Fetch the PDF automatically from the public directory
        let response = await fetch('/pepparappe.pdf');
        let filename = 'Pepparappe - Chittattukara Public Library.pdf';
        let arrayBuffer: ArrayBuffer | null = null;
        let isSuccess = false;

        if (response.ok && !response.headers.get('content-type')?.includes('text/html')) {
          const tempBuffer = await response.arrayBuffer();
          const uint8 = new Uint8Array(tempBuffer);
          const isPdf = uint8.length >= 5 &&
                        uint8[0] === 0x25 &&
                        uint8[1] === 0x50 &&
                        uint8[2] === 0x44 &&
                        uint8[3] === 0x46 &&
                        uint8[4] === 0x2d; // %PDF-
          if (isPdf) {
            arrayBuffer = tempBuffer;
            isSuccess = true;
          }
        }

        if (!isSuccess) {
          response = await fetch('/pepperappe.pdf');
          filename = 'Pepperappe - Chittattukara Public Library.pdf';
          if (response.ok && !response.headers.get('content-type')?.includes('text/html')) {
            const tempBuffer = await response.arrayBuffer();
            const uint8 = new Uint8Array(tempBuffer);
            const isPdf = uint8.length >= 5 &&
                          uint8[0] === 0x25 &&
                          uint8[1] === 0x50 &&
                          uint8[2] === 0x44 &&
                          uint8[3] === 0x46 &&
                          uint8[4] === 0x2d; // %PDF-
            if (isPdf) {
              arrayBuffer = tempBuffer;
              isSuccess = true;
            }
          }
        }

        if (isSuccess && arrayBuffer) {
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
            throw new Error("Could not load a valid '/pepparappe.pdf' or '/pepperappe.pdf'. Make sure you copy your PDF file inside the 'public/' directory before committing to GitHub or deploying to Vercel.");
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
            <div className="flex flex-col items-center gap-6 p-8 bg-slate-900/60 rounded-2xl border border-gold/15 shadow-2xl max-w-lg w-full animate-fade-in text-center">
              <div className="w-14 h-14 rounded-full bg-red-950/40 flex items-center justify-center border border-red-900/30">
                <BookOpen className="w-6 h-6 text-red-400 stroke-[1.5]" />
              </div>
              
              <div className="space-y-3">
                <h3 className="font-serif italic text-2xl text-gold font-medium">Manuscript Not Found</h3>
                <p className="text-sm text-stone-300 leading-relaxed max-w-sm mx-auto">
                  Vercel or your production server couldn't locate the PDF. To make it load automatically on your deploy:
                </p>
                <div className="text-left bg-slate-950/80 p-4 rounded-xl border border-gold/10 text-xs space-y-2 font-mono text-stone-400 max-w-md mx-auto">
                  <div className="flex gap-2">
                    <span className="text-gold font-bold">1.</span>
                    <span>Verify the file is copied to the <code className="text-gold bg-slate-900 px-1 py-0.5 rounded">public/</code> directory.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gold font-bold">2.</span>
                    <span>Add and commit it: <code className="text-gold bg-slate-900 px-1 py-0.5 rounded">git add public/pepparappe.pdf</code></span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gold font-bold">3.</span>
                    <span>Push to GitHub: <code className="text-gold bg-slate-900 px-1 py-0.5 rounded">git push origin main</code></span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="w-full p-3 bg-red-950/20 rounded-lg border border-red-950/40 text-left max-w-md mx-auto">
                  <p className="text-xs text-red-400 font-mono break-all leading-relaxed">{error}</p>
                </div>
              )}

              <div className="relative w-full max-w-md border border-dashed border-gold/20 hover:border-gold/40 rounded-xl p-6 bg-slate-950/30 hover:bg-slate-950/50 transition-all duration-300 group cursor-pointer mt-2">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-gold/60 group-hover:text-gold group-hover:scale-110 transition-all duration-300" />
                  <span className="text-sm font-medium text-stone-200">Upload PDF Manually</span>
                  <span className="text-xs text-stone-500">Select any PDF to render and cache it instantly</span>
                </div>
              </div>
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
