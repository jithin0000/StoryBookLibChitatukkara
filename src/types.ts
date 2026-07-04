/**
 * SPDX-License-Identifier: Apache-2.0
 */

export type ReaderMode = 'flip' | 'scroll';
export type ViewLayout = 'single' | 'double';

export interface PageImage {
  index: number;
  url: string;
  width: number;
  height: number;
}

export interface BookCache {
  name: string;
  pages: PageImage[];
  timestamp: number;
}
