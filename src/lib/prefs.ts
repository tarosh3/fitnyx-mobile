// Local-only user preferences (no backend sync).
// Persisted to AsyncStorage; reset on app reinstall.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEYS = {
  weightUnit: 'fitnyx:unit:weight',
  heightUnit: 'fitnyx:unit:height',
  language: 'fitnyx:language',
} as const;

export type WeightUnit = 'kg' | 'lbs';
export type HeightUnit = 'cm' | 'ft';
export type Language = 'en' | 'hi' | 'hi_en';

const DEFAULTS = {
  weightUnit: 'kg' as WeightUnit,
  heightUnit: 'cm' as HeightUnit,
  language: 'en' as Language,
};

export async function getWeightUnit(): Promise<WeightUnit> {
  const v = (await AsyncStorage.getItem(KEYS.weightUnit)) as WeightUnit | null;
  return v ?? DEFAULTS.weightUnit;
}

export async function setWeightUnit(unit: WeightUnit): Promise<void> {
  await AsyncStorage.setItem(KEYS.weightUnit, unit);
}

export async function getHeightUnit(): Promise<HeightUnit> {
  const v = (await AsyncStorage.getItem(KEYS.heightUnit)) as HeightUnit | null;
  return v ?? DEFAULTS.heightUnit;
}

export async function setHeightUnit(unit: HeightUnit): Promise<void> {
  await AsyncStorage.setItem(KEYS.heightUnit, unit);
}

export async function getLanguage(): Promise<Language> {
  const v = (await AsyncStorage.getItem(KEYS.language)) as Language | null;
  return v ?? DEFAULTS.language;
}

export async function setLanguage(lang: Language): Promise<void> {
  await AsyncStorage.setItem(KEYS.language, lang);
}

// ----- hooks -----

export function useWeightUnit() {
  const [unit, setUnitState] = useState<WeightUnit>(DEFAULTS.weightUnit);

  useEffect(() => {
    getWeightUnit().then(setUnitState);
  }, []);

  const update = useCallback(async (next: WeightUnit) => {
    setUnitState(next);
    await setWeightUnit(next);
  }, []);

  return [unit, update] as const;
}

export function useHeightUnit() {
  const [unit, setUnitState] = useState<HeightUnit>(DEFAULTS.heightUnit);

  useEffect(() => {
    getHeightUnit().then(setUnitState);
  }, []);

  const update = useCallback(async (next: HeightUnit) => {
    setUnitState(next);
    await setHeightUnit(next);
  }, []);

  return [unit, update] as const;
}

export function useLanguage() {
  const [lang, setLangState] = useState<Language>(DEFAULTS.language);

  useEffect(() => {
    getLanguage().then(setLangState);
  }, []);

  const update = useCallback(async (next: Language) => {
    setLangState(next);
    await setLanguage(next);
  }, []);

  return [lang, update] as const;
}

// ----- conversion helpers -----

export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}
export function lbsToKg(lbs: number): number {
  return lbs / 2.20462;
}
export function cmToFt(cm: number): { ft: number; in: number } {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn % 12);
  return { ft, in: inches };
}
export function ftInToCm(ft: number, inches: number): number {
  return (ft * 12 + inches) * 2.54;
}

export function formatWeight(kg: number | null | undefined, unit: WeightUnit, digits = 1): string {
  if (kg == null) return '—';
  const value = unit === 'kg' ? kg : kgToLbs(kg);
  return `${value.toFixed(digits)} ${unit}`;
}

export function formatHeight(cm: number | null | undefined, unit: HeightUnit): string {
  if (cm == null) return '—';
  if (unit === 'cm') return `${Math.round(cm)} cm`;
  const { ft, in: inches } = cmToFt(cm);
  return `${ft}′ ${inches}″`;
}
