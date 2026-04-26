import type { LearningApi } from '../main/preload';

declare global {
  interface Window {
    learning: LearningApi;
  }
}

export {};
