/**
 * SPDX-License-Identifier: Apache-2.0
 */

import { PageImage } from '../types';

// IndexedDB Helper for Book Caching
const DB_NAME = 'StorybookReaderDB';
const DB_VERSION = 1;
const STORE_NAME = 'RenderedBooks';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function getBookFromCache(bookId: string = 'pepparappe'): Promise<PageImage[] | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(bookId);
      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.pages);
        } else {
          resolve(null);
        }
      };
    });
  } catch (error) {
    console.error('Failed to get book from cache:', error);
    return null;
  }
}

export async function saveBookToCache(pages: PageImage[], bookId: string = 'pepparappe'): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put({ id: bookId, pages, timestamp: Date.now() });
  } catch (error) {
    console.error('Failed to save book to cache:', error);
  }
}

// PDF processing using CDN-loaded PDF.js
export async function renderPdfPages(
  arrayBuffer: ArrayBuffer,
  onProgress: (current: number, total: number) => void
): Promise<PageImage[]> {
  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) {
    throw new Error('PDF.js library is not loaded. Please refresh the page.');
  }

  // Set worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const pages: PageImage[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      
      // Determine viewport scale (we render at high resolution (scale 1.5 - 2.0) for razor sharp text)
      const scale = 2.0; 
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not create 2D canvas context');
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Draw background white explicitly (crucial for PDFs with transparent pages)
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      
      // Convert canvas to compressed JPEG data URL for memory-friendly caching
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      pages.push({
        index: i - 1,
        url: dataUrl,
        width: viewport.width,
        height: viewport.height,
      });

      onProgress(i, numPages);
    }

    return pages;
  } catch (error) {
    console.error('Error rendering PDF pages:', error);
    throw error;
  }
}
