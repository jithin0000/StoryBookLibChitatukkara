/**
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ReaderMode, ViewLayout, PageImage } from './types';
import { renderPdfPages, getBookFromCache, saveBookToCache } from './lib/pdfUtils';
import BookNavbar from './components/BookNavbar';
import TactileBook from './components/TactileBook';
import ScrollBook from './components/ScrollBook';
import StarryBackground from './components/StarryBackground';
import { BookOpen, RefreshCw, AlertCircle, Loader2, Upload } from 'lucide-react';

export default function App() {
  const [pages, setPages] = useState<PageImage[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [mode, setMode] = useState<ReaderMode>('flip');
  const [layout, setLayout] = useState<ViewLayout>('double');
  
  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [loadingStep, setLoadingStep] = useState<string>('Initializing');
  const [error, setError] = useState<string | null>(null);

  // Load book PDF automatically on mount
  useEffect(() => {
    loadBook();
  }, []);

  const loadBook = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setLoadingStep('Checking local memory cache...');

      // 1. Try loading from IndexedDB first for instant refresh loading
      const cachedPages = await getBookFromCache('pepparappe');
      if (cachedPages && cachedPages.length > 0) {
        setPages(cachedPages);
        setIsLoading(false);
        return;
      }




      // 2. Fetch the PDF automatically (using robust multiple strategies and generous timeout to prevent hanging or aborting on slow networks)
      setLoadingStep('Downloading Chittattukara Balavedi Magazine...');
      
      const candidates = [
        `${import.meta.env.BASE_URL}/pepparappe.pdf`,
        'https://raw.githubusercontent.com/jithin0000/StoryBookLibChitatukkara/main/public/pepparappe.pdf',
        'https://raw.githubusercontent.com/jithin0000/StoryBookLibChitatukkara/main/pepparappe.pdf',
        'https://raw.githubusercontent.com/jithin0000/StoryBookLib/main/pepparappe.pdf',
        'https://raw.githubusercontent.com/jithin0000/StoryBookLibChitatukkara/master/pepparappe.pdf',
        'https://raw.githubusercontent.com/jithin0000/StoryBookLib/master/pepparappe.pdf',
        'https://raw.githubusercontent.com/JithinM/StoryBookLibChitatukkara/main/pepparappe.pdf',
        'https://raw.githubusercontent.com/JithinM/StoryBookLib/main/pepparappe.pdf',
        'https://github.com/jithin0000/StoryBookLibChitatukkara/tree/e77d65b3f5ac6fe86060eea880431ef05ebcd8f6/public'
      ];
      
      // Define all download sources and proxies to try
      const fetchStrategies: { name: string; url: string }[] = [];
      
      // We push the direct connection first for all candidates (fast, fail-early)
      candidates.forEach((candidate, index) => {
        const isLocal = candidate.startsWith('/');
        fetchStrategies.push({
          name: isLocal ? 'App Local PDF Asset (Instant & Zero-CORS)' : `Direct GitHub Connection (Source ${index})`,
          url: candidate
        });
      });

      // Then we push the proxy options to bypass CORS/network restrictions (only for absolute URLs)
      candidates.forEach((candidate, index) => {
        if (!candidate.startsWith('/')) {
          fetchStrategies.push({
            name: `Google Content Proxy (Source ${index})`,
            url: `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=2592000&url=${encodeURIComponent(candidate)}`
          });
          fetchStrategies.push({
            name: `CORS.IO Secure Gateway (Source ${index})`,
            url: `https://corsproxy.io/?${encodeURIComponent(candidate)}`
          });
          fetchStrategies.push({
            name: `AllOrigins Public Mirror (Source ${index})`,
            url: `https://api.allorigins.win/raw?url=${encodeURIComponent(candidate)}`
          });
        }
      });

      const fetchWithTimeout = async (url: string, timeoutMs = 25000): Promise<ArrayBuffer> => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(id);
          if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
          }
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            throw new Error('Received HTML webpage instead of PDF document');
          }
          const buffer = await response.arrayBuffer();
          // Basic PDF magic bytes validation (%PDF-)
          const uint8 = new Uint8Array(buffer);
          const isPdf = uint8.length >= 5 &&
                        uint8[0] === 0x25 &&
                        uint8[1] === 0x50 &&
                        uint8[2] === 0x44 &&
                        uint8[3] === 0x46 &&
                        uint8[4] === 0x2d;
          if (!isPdf) {
            throw new Error('Downloaded file is not a valid PDF document');
          }
          if (buffer.byteLength < 1000) {
            throw new Error('Downloaded file is too small to be a valid PDF');
          }
          return buffer;
        } catch (err) {
          clearTimeout(id);
          throw err;
        }
      };

      let arrayBuffer: ArrayBuffer | null = null;
      let lastErrorMessage = '';

      for (const strategy of fetchStrategies) {
        try {
          setLoadingStep(`Contacting ${strategy.name}...`);
          arrayBuffer = await fetchWithTimeout(strategy.url, 25000);
          break; // successfully downloaded!
        } catch (e: any) {
          console.warn(`Strategy ${strategy.name} failed:`, e);
          lastErrorMessage = e.message || String(e);
        }
      }

      if (!arrayBuffer) {
        throw new Error(`Could not load PDF magazine after trying direct links and CORS mirrors. (Last error: ${lastErrorMessage})`);
      }

      // 3. Render PDF Pages using PDF.JS
      setLoadingStep('Compiling and rendering PDF pages...');
      const renderedPages = await renderPdfPages(arrayBuffer, (current, total) => {
        setLoadingProgress({ current, total });
        setLoadingStep(`Rendering page ${current} of ${total}...`);
      });

      if (renderedPages.length === 0) {
        throw new Error('Compiled book contains 0 pages.');
      }

      // Save to IndexedDB Cache
      await saveBookToCache(renderedPages, 'pepparappe');
      
      setPages(renderedPages);
      setIsLoading(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred compiling the storybook PDF.');
      setIsLoading(false);
    }
  };

  const handlePageChange = (index: number) => {
    if (index >= 0 && index < pages.length) {
      setCurrentPage(index);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsLoading(true);
      setError(null);
      setLoadingStep(`Reading file: ${file.name}...`);
      
      const arrayBuffer = await file.arrayBuffer();
      
      // Basic PDF magic bytes validation (%PDF-)
      const uint8 = new Uint8Array(arrayBuffer);
      const isPdf = uint8.length >= 5 &&
                    uint8[0] === 0x25 &&
                    uint8[1] === 0x50 &&
                    uint8[2] === 0x44 &&
                    uint8[3] === 0x46 &&
                    uint8[4] === 0x2d;
      if (!isPdf) {
        throw new Error('Selected file is not a valid PDF document');
      }

      setLoadingStep('Compiling and rendering PDF pages...');
      const renderedPages = await renderPdfPages(arrayBuffer, (current, total) => {
        setLoadingProgress({ current, total });
        setLoadingStep(`Rendering page ${current} of ${total}...`);
      });

      if (renderedPages.length === 0) {
        throw new Error('The selected PDF contains 0 pages.');
      }

      await saveBookToCache(renderedPages, 'pepparappe');
      setPages(renderedPages);
      setCurrentPage(0);
      setIsLoading(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to parse upload PDF.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative text-stone-100 select-none overflow-hidden">
      {/* Real-time Twinkling Starry Night Background */}
      <StarryBackground />

      {/* Top Navbar */}
      <BookNavbar
        mode={mode}
        onModeChange={setMode}
        fileName="Chittattukara Balavedi Magazine"
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col overflow-hidden relative" id="storybook-main-container">
        
        {/* LOADING PROGRESS VIEW */}
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-700/50 to-gold/70 flex items-center justify-center border border-gold/20 shadow-2xl mb-8 animate-pulse-subtle">
              <BookOpen className="w-10 h-10 text-gold" />
            </div>
            
            <h2 className="font-serif italic text-2xl text-gold font-semibold mb-2">
              ഭാവനയുടെ പുതിയ ലോകത്തേക്ക്...
            </h2>
            <p className="text-stone-400 text-sm max-w-sm mb-8 leading-relaxed">
              Preparing the tactile storybook experience.
            </p>

            {/* Custom Interactive Progress Bar */}
            <div className="w-full max-w-xs bg-slate-900 border border-gold/10 p-4 rounded-xl shadow-lg flex flex-col items-center gap-3">
              <div className="w-full flex items-center justify-between text-[11px] font-mono text-stone-400">
                <span className="truncate max-w-[200px] text-left text-gold/80 font-semibold">{loadingStep}</span>
                {loadingProgress.total > 0 && (
                  <span>{Math.round((loadingProgress.current / loadingProgress.total) * 100)}%</span>
                )}
              </div>
              
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-gold/5">
                <div 
                  className="bg-gradient-to-r from-amber-600 via-gold to-amber-500 h-full rounded-full transition-all duration-300"
                  style={{
                    width: loadingProgress.total > 0 
                      ? `${(loadingProgress.current / loadingProgress.total) * 100}%`
                      : '20%'
                  }}
                />
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-stone-500 font-sans tracking-wide">
                <Loader2 className="w-3 h-3 animate-spin text-gold/75" />
                <span>Downloading assets. Do not close this tab.</span>
              </div>
            </div>
          </div>
        )}

        {/* ERROR SCREEN */}
        {error && !isLoading && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-red-950/40 flex items-center justify-center border border-red-500/20 shadow-xl mb-6">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="font-serif italic text-xl sm:text-2xl text-red-400 font-semibold mb-2">
              Failed to auto-load PDF storybook
            </h2>
            <p className="text-stone-400 text-xs sm:text-sm max-w-md mb-8 leading-relaxed">
              {error}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md justify-center">
              {/* Retry Download button */}
              <button
                onClick={loadBook}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-gold/20 hover:border-gold text-gold font-bold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer font-sans text-xs tracking-wider uppercase"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Download
              </button>

              {/* Upload PDF button */}
              <label className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-slate-950 font-bold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer font-sans text-xs tracking-wider uppercase">
                <Upload className="w-4 h-4 stroke-[2.5]" />
                <span>Upload Local PDF</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mt-12 max-w-sm border-t border-gold/10 pt-4 text-[11px] text-stone-500">
              <p>You can also upload any PDF book to enjoy our interactive, realistic 3D turning or scroll layout.</p>
            </div>
          </div>
        )}

        {/* READER VIEWPORT */}
        {!isLoading && !error && pages.length > 0 && (
          mode === 'flip' ? (
            <TactileBook
              pages={pages}
              layout={layout}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              onLayoutChange={setLayout}
            />
          ) : (
            <ScrollBook
              pages={pages}
              layout={layout}
              onLayoutChange={setLayout}
              onPageChange={handlePageChange}
            />
          )
        )}
      </main>
    </div>
  );
}
