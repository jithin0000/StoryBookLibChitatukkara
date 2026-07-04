/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PageImage {
  index: number;
  dataUrl: string;
  width: number;
  height: number;
}

export type ReaderMode = 'flip' | 'scroll';

export type ViewLayout = 'single' | 'double';

export interface BookMetadata {
  name: string;
  size: number;
  totalPages: number;
}
