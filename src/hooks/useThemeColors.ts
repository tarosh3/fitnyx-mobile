import { colors } from '@/src/theme/colors';
import { useTheme } from '@/src/providers/ThemeProvider';

export function useThemeColors() {
  const { theme } = useTheme();
  return colors[theme];
}
