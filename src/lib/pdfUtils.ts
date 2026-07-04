/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PageImage, BookMetadata } from '../types';

const DB_NAME = 'StorybookPDFDB';
const STORE_NAME = 'books';
const KEY_NAME = 'current_book';

/**
 * Open or upgrade the IndexedDB database for caching rendered page images.
 */
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Persists book pages and metadata in IndexedDB.
 */
export async function saveBookToCache(metadata: BookMetadata, pages: PageImage[]): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put({ metadata, pages }, KEY_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves the cached book and pages from IndexedDB.
 */
export async function getBookFromCache(): Promise<{ metadata: BookMetadata; pages: PageImage[] } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(KEY_NAME);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to retrieve cached book from IndexedDB:', error);
    return null;
  }
}

/**
 * Clears the cached book from IndexedDB.
 */
export async function clearBookCache(): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(KEY_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Main parser that takes a PDF File, processes it page-by-page using PDF.js in the browser,
 * and renders high-resolution JPEG page images.
 * 
 * @param file The PDF file object
 * @param onProgress Callback to notify the UI about processing progress (0 to 100)
 */
export async function convertPdfToImages(
  file: File | ArrayBuffer,
  onProgress: (pageIndex: number, total: number, progressPercent: number) => void
): Promise<PageImage[]> {
  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) {
    throw new Error('PDF.js library is not loaded. Please check your network connection.');
  }

  // Set worker source URL for PDF.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  let arrayBuffer: ArrayBuffer;
  if (file instanceof ArrayBuffer) {
    arrayBuffer = file;
  } else {
    arrayBuffer = await file.arrayBuffer();
  }
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const renderedPages: PageImage[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    
    // We render at 2.2x scale to maintain extremely high resolution and crisp text
    const viewport = page.getViewport({ scale: 2.2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Could not create 2D canvas context for PDF rendering.');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render page into the canvas context
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Convert canvas to compressed JPEG URL at 90% quality
    // This maintains excellent, crisp resolution while keeping the memory footprint lightweight
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    renderedPages.push({
      index: i - 1,
      dataUrl,
      width: viewport.width,
      height: viewport.height,
    });

    const progressPercent = Math.round((i / numPages) * 100);
    onProgress(i, numPages, progressPercent);

    // Free memory by releasing PDF.js page resources
    page.cleanup();
  }

  return renderedPages;
}
