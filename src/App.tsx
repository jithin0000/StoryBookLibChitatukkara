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
  clearBookCache,
} from './lib/pdfUtils';
import BookNavbar from './components/BookNavbar';
import TactileBook from './components/TactileBook';
import ScrollBook from './components/ScrollBook';
import { BookOpen, RefreshCw, AlertTriangle, Upload, FileUp } from 'lucide-react';

export default function App() {
  const [pages, setPages] = useState<PageImage[]>([]);
  const [metadata, setMetadata] = useState<BookMetadata | null>(null);

  // Loading & Processing feedback states
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(0);
  const [loadingTotal, setLoadingTotal] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');

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

        // 2. Fetch the PDF automatically (Primary: GitHub, Secondary: Local paths)
        let filename = 'Pepparappe - Chittattukara Public Library.pdf';
        let arrayBuffer: ArrayBuffer | null = null;
        let isSuccess = false;

        // Try GitHub Raw directly (highly performant and supports CORS natively)
        try {
          const githubRawUrl = 'https://raw.githubusercontent.com/jithin0000/StoryBookLibChitatukkara/main/pepparappe.pdf';
          const response = await fetch(githubRawUrl);
          if (response.ok && !response.headers.get('content-type')?.includes('text/html')) {
            const tempBuffer = await response.arrayBuffer();
            const uint8 = new Uint8Array(tempBuffer);
            const isPdf = uint8.length >= 5 &&
                          uint8[0] === 0x25 &&
                          uint8[1] === 0x50 &&
                          uint8[2] === 0x44 &&
                          uint8[3] === 0x46 &&
                          uint8[4] === 0x2d; // %PDF-
            if (isPdf && tempBuffer.byteLength > 1000) {
              arrayBuffer = tempBuffer;
              isSuccess = true;
            }
          }
        } catch (e) {
          console.warn('Failed to fetch from GitHub raw URL directly:', e);
        }

        // Try GitHub Raw with CORS proxy if direct fetch failed
        if (!isSuccess) {
          try {
            const githubRawUrl = 'https://raw.githubusercontent.com/jithin0000/StoryBookLibChitatukkara/main/pepparappe.pdf';
            const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(githubRawUrl)}`;
            const response = await fetch(proxiedUrl);
            if (response.ok && !response.headers.get('content-type')?.includes('text/html')) {
              const tempBuffer = await response.arrayBuffer();
              const uint8 = new Uint8Array(tempBuffer);
              const isPdf = uint8.length >= 5 &&
                            uint8[0] === 0x25 &&
                            uint8[1] === 0x50 &&
                            uint8[2] === 0x44 &&
                            uint8[3] === 0x46 &&
                            uint8[4] === 0x2d; // %PDF-
              if (isPdf && tempBuffer.byteLength > 1000) {
                arrayBuffer = tempBuffer;
                isSuccess = true;
              }
            }
          } catch (e) {
            console.warn('Failed to fetch from GitHub raw URL via CORS proxy:', e);
          }
        }

        // Fallback to local /pepparappe.pdf
        if (!isSuccess) {
          try {
            const response = await fetch('/pepparappe.pdf');
            if (response.ok && !response.headers.get('content-type')?.includes('text/html')) {
              const tempBuffer = await response.arrayBuffer();
              const uint8 = new Uint8Array(tempBuffer);
              const isPdf = uint8.length >= 5 &&
                            uint8[0] === 0x25 &&
                            uint8[1] === 0x50 &&
                            uint8[2] === 0x44 &&
                            uint8[3] === 0x46 &&
                            uint8[4] === 0x2d; // %PDF-
              if (isPdf && tempBuffer.byteLength > 1000) {
                arrayBuffer = tempBuffer;
                isSuccess = true;
              }
            }
          } catch (e) {
            console.warn('Failed to fetch /pepparappe.pdf automatically:', e);
          }
        }

        // Fallback to local /pepperappe.pdf
        if (!isSuccess) {
          try {
            const response = await fetch('/pepperappe.pdf');
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
              if (isPdf && tempBuffer.byteLength > 1000) {
                arrayBuffer = tempBuffer;
                isSuccess = true;
              }
            }
          } catch (e) {
            console.warn('Failed to fetch /pepperappe.pdf automatically:', e);
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

  // Clear cache and force reload
  const handleClearCacheAndReload = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await clearBookCache();
      window.location.reload();
    } catch (err) {
      console.error(err);
      window.location.reload();
    }
  };

  // Upload/process manual PDF file
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const isPdf = uint8.length >= 5 &&
                    uint8[0] === 0x25 &&
                    uint8[1] === 0x50 &&
                    uint8[2] === 0x44 &&
                    uint8[3] === 0x46 &&
                    uint8[4] === 0x2d; // %PDF-

      if (!isPdf) {
        throw new Error('The selected file is not a valid PDF document.');
      }

      const size = arrayBuffer.byteLength;
      const filename = file.name;

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
    } catch (err: any) {
      console.error('Failed to parse uploaded PDF:', err);
      setError(err?.message || 'An error occurred while compiling your PDF.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  // Download and load a PDF from a direct URL (handles Google Drive, Dropbox and normal links)
  const handleLoadFromUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;

    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);

    try {
      let targetUrl = urlInput.trim();

      // Convert Google Drive sharing link to a direct download link
      const driveIdMatch = targetUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || targetUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (driveIdMatch) {
        const fileId = driveIdMatch[1];
        targetUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;
      }

      // Convert Dropbox link from preview to direct download
      if (targetUrl.includes('dropbox.com') && targetUrl.includes('dl=0')) {
        targetUrl = targetUrl.replace('dl=0', 'dl=1');
      }

      // Prepend CORS proxy to bypass cross-origin block on the client side
      const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

      // Fetch the file
      const response = await fetch(proxiedUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: Server responded with status ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Received an HTML page instead of a PDF file. Please verify this is a publicly shared, direct download link.');
      }

      const arrayBuffer = await response.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const isPdf = uint8.length >= 5 &&
                    uint8[0] === 0x25 &&
                    uint8[1] === 0x50 &&
                    uint8[2] === 0x44 &&
                    uint8[3] === 0x46 &&
                    uint8[4] === 0x2d; // %PDF-

      if (!isPdf) {
        throw new Error('The downloaded file is not a valid PDF document.');
      }

      const size = arrayBuffer.byteLength;
      const filename = driveIdMatch ? 'Google Drive Manuscript' : 'Remote Manuscript';

      const bookMeta: BookMetadata = {
        name: filename,
        size: size,
        totalPages: 44,
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
    } catch (err: any) {
      console.error('Failed to load PDF from URL:', err);
      setError(err?.message || 'Failed to download or compile the PDF. Please verify your link is public and try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center gap-6 p-8 rounded-2xl border transition-all duration-300 shadow-xl max-w-lg w-full animate-fade-in ${
                isDragging 
                  ? 'border-gold bg-gold/5 scale-[1.02] shadow-gold/5' 
                  : error && error.includes('Could not load')
                    ? 'border-red-500/20 bg-slate-900/60'
                    : 'border-amber-500/20 bg-slate-900/60'
              }`}
            >
              {error && error.includes('Could not load') ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-red-950/40 flex items-center justify-center border border-red-900/30 animate-pulse">
                    <BookOpen className="w-6 h-6 text-red-400 stroke-[1.5]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif italic text-xl text-gold font-medium">Manuscript Not Found on Server</h3>
                    <p className="text-xs text-stone-300 leading-relaxed px-4">
                      Vercel could not locate your <code className="px-1.5 py-0.5 bg-slate-950 text-gold rounded font-mono text-[10px] border border-gold/10">pepparappe.pdf</code> file in the <code className="px-1.5 py-0.5 bg-slate-950 text-gold rounded font-mono text-[10px] border border-gold/10">public/</code> directory.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-amber-950/40 flex items-center justify-center border border-amber-900/30">
                    <AlertTriangle className="w-6 h-6 text-amber-400 stroke-[1.5]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif italic text-xl text-amber-400 font-medium">Invalid PDF Structure</h3>
                    <p className="text-xs text-stone-300 leading-relaxed px-4">
                      The downloaded file is not a valid PDF. If you are using <strong>Git LFS</strong>, Vercel might have downloaded the tiny 130-byte LFS pointer file instead of the actual 24MB PDF.
                    </p>
                  </div>
                </>
              )}

              {error && (
                <div className="w-full p-3 bg-slate-950/50 rounded-lg border border-red-950/30 text-left">
                  <p className="text-xs text-stone-400 font-mono break-all line-clamp-3">Error details: {error}</p>
                </div>
              )}

              {/* Seamless Drag & Drop / Click to Upload Fallback */}
              <div className="w-full space-y-4">
                <div className="relative flex flex-col items-center justify-center p-6 border border-dashed border-gold/20 hover:border-gold/40 rounded-xl bg-slate-950/40 transition duration-200 group cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <FileUp className="w-8 h-8 text-gold/60 group-hover:text-gold transition-colors duration-200 mb-2 stroke-[1.5] group-hover:scale-110 transform" />
                  <p className="text-xs font-medium text-gold/80 group-hover:text-gold transition-colors duration-200">
                    Drag & Drop or Click to Select PDF
                  </p>
                  <p className="text-[10px] text-stone-500 mt-1">
                    Select <code className="text-stone-400">pepparappe.pdf</code> from your device to load instantly
                  </p>
                </div>

                <div className="flex items-center">
                  <div className="flex-1 border-t border-stone-800"></div>
                  <span className="px-3 text-[10px] font-semibold tracking-wider text-stone-600 uppercase">OR</span>
                  <div className="flex-1 border-t border-stone-800"></div>
                </div>

                {/* Load from URL Form */}
                <form onSubmit={handleLoadFromUrl} className="space-y-2">
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] font-medium tracking-wide text-gold/80 uppercase">
                      Load from Google Drive or PDF Link
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Paste public Google Drive or Dropbox link..."
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-950 border border-stone-800 rounded-lg text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-gold/40 transition duration-150"
                      />
                      <button
                        type="submit"
                        disabled={!urlInput.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold disabled:opacity-50 text-slate-950 rounded-lg font-medium text-xs transition duration-150 shadow-md font-sans active:scale-95 cursor-pointer flex items-center justify-center whitespace-nowrap"
                      >
                        Load Link
                      </button>
                    </div>
                    <p className="text-[9px] text-stone-500 leading-normal">
                      Paste a public sharing link. Our secure pipeline automatically bypasses CORS locks.
                    </p>
                  </div>
                </form>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={handleClearCacheAndReload}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-stone-300 rounded-lg border border-gold/10 font-medium text-xs transition duration-200 active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 text-gold" />
                    Reset Cache & Reload
                  </button>
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
            onPageChange={setCurrentPage}
          />
        )}
      </main>
    </div>
  );
}
