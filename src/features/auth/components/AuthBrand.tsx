import React from 'react';

import { FitNyxWordmark } from '@/src/components/brand/FitNyxWordmark';
import { colors } from '@/src/theme/colors';

export function AuthBrand() {
  return <FitNyxWordmark height={29} color={colors.dark.text} accentColor={colors.dark.primary} />;
}
