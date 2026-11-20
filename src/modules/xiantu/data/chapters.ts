import type { XianTuChapter } from '../types';
import { ERA_01_LIANQI } from './era01';

export const XIANTU_ERAS = [ERA_01_LIANQI];
export const XIANTU_CHAPTERS: XianTuChapter[] = ERA_01_LIANQI.chapters;

export function getXianTuChapterById(id: string): XianTuChapter {
  return XIANTU_CHAPTERS.find((chapter) => chapter.id === id) ?? XIANTU_CHAPTERS[0];
}
