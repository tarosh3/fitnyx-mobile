import type { HealthBackend } from './types';

// Default / web / test backend: no health store. Metro resolves backend.ios.ts
// on iOS and backend.android.ts on Android; this file serves web (and the jest
// web project), where no native health SDK exists.
export const healthBackend: HealthBackend = {
  platformLabel: '',
  async isAvailable() {
    return false;
  },
  async requestPermissions() {
    return false;
  },
  async hasPermissions() {
    return false;
  },
  async saveWorkout() {
    /* no-op */
  },
  async saveWeightKg() {
    /* no-op */
  },
  async readTodaySteps() {
    return null;
  },
  async readTodayActiveEnergyKcal() {
    return null;
  },
};
