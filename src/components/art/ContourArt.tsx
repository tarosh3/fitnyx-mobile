import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { useThemeColors } from '@/src/hooks/useThemeColors';

export type ContourSubject = 'training' | 'nutrition' | 'username' | 'birth' | 'identity' | 'height' | 'weight' | 'goal' | 'experience' | 'frequency' | 'schedule' | 'location' | 'care' | 'intensity' | 'motivation';

// Each vignette has its own silhouette; the contour paths tie it to the Roam card.
const subjects: Record<ContourSubject, React.ReactNode> = {
  training: <G rotation={-25} origin="100,70"><Rect x="53" y="48" width="17" height="48" rx="6" /><Rect x="130" y="48" width="17" height="48" rx="6" /><Rect x="70" y="64" width="60" height="16" rx="4" /><Path d="M45 60v24m110-24v24M91 65v14m18-14v14" /></G>,
  nutrition: <><Path d="M48 66h104c-5 33-22 48-52 48S54 99 48 66Zm10 11h84M76 62C52 41 70 23 85 34c9 7 13 16 15 29M88 35c20-25 44-13 37 8-4 11-11 15-21 20M105 62c10-18 24-19 31-8M73 99h54M91 45l9 18" /><Circle cx="140" cy="45" r="6" /></>,
  username: <><Rect x="51" y="37" width="98" height="70" rx="16" /><Circle cx="78" cy="61" r="10" /><Path d="M62 88q16-25 32 0m12-29h28m-28 14h20m-20 14h28" /></>,
  birth: <><Rect x="55" y="34" width="90" height="78" rx="14" /><Path d="M55 56h90M76 27v16m48-16v16M78 83l13 13 29-28" /></>,
  identity: <><Circle cx="100" cy="50" r="19" /><Path d="M62 111v-8a38 38 0 0 1 76 0v8M56 52l-9 9 9 9m88-18 9 9-9 9" /></>,
  height: <><Rect x="76" y="25" width="40" height="92" rx="10" /><Path d="M77 42h19m-19 18h12m-12 18h19m-19 18h12M138 30v81m-7-74 7-7 7 7m-14 67 7 7 7-7" /></>,
  weight: <><Rect x="55" y="34" width="90" height="80" rx="22" /><Path d="M77 58a27 27 0 0 1 46 0l-11 17H88ZM100 66l9-14M73 92h15m24 0h15" /></>,
  goal: <><Circle cx="94" cy="74" r="36" /><Circle cx="94" cy="74" r="22" /><Circle cx="94" cy="74" r="7" /><Path d="m95 73 48-47m-18 1 18-1-1 18" /></>,
  experience: <><Path d="M49 112V91h30V69h30V47h30v65ZM51 112h98M61 74l14-16m14-7 15-15m14-5 13-12" /><Circle cx="141" cy="25" r="5" /></>,
  frequency: <><Rect x="48" y="35" width="104" height="78" rx="14" /><Path d="M48 57h104M73 28v15m54-15v15" /><Circle cx="72" cy="76" r="6" /><Circle cx="100" cy="76" r="6" /><Circle cx="128" cy="76" r="6" /><Path d="M66 96h12m16 0h12m16 0h12" /></>,
  schedule: <><Circle cx="100" cy="71" r="39" /><Path d="M100 44v29l20 12M100 32v8m39 31h-8m-31 39v-8M61 71h8" /></>,
  location: <><Path d="M100 118s-34-37-34-59a34 34 0 0 1 68 0c0 22-34 59-34 59Z" /><Circle cx="100" cy="60" r="13" /><Path d="m55 98-12 15h32m50 0h32l-12-15" /></>,
  care: <><Path d="M100 119s-43-17-43-60V40l43-15 43 15v19c0 43-43 60-43 60Z" /><Path d="M92 51h16v16h16v16h-16v16H92V83H76V67h16Z" /></>,
  intensity: <><Path d="M47 99a53 53 0 0 1 106 0M61 98a39 39 0 0 1 78 0M100 95l27-37M54 72l11 5m12-29 6 11m17-14v11m27-8-6 11m25 13-11 5" /><Circle cx="100" cy="95" r="6" /></>,
  motivation: <><Path d="M100 114s-47-29-47-58c0-26 33-35 47-13 14-22 47-13 47 13 0 29-47 58-47 58Z" /><Path d="m106 52-20 27h17l-7 21 23-29h-17Z" /></>,
};

export function ContourArt({ subject, width = 200, height = 140, color }: { subject: ContourSubject; width?: number | `${number}%`; height?: number; color?: string }) {
  const c = useThemeColors();
  const ink = color ?? c.accent;
  return <Svg width={width} height={height} viewBox="0 0 200 140" accessible={false}>
    <G fill="none" stroke={ink} strokeWidth={0.8} opacity={0.18}>
      <Path d="M4 99C27 128 36 60 59 35S118 9 153 38s15 82 46 72M-9 79c39 50 36-15 55-48S117-5 159 25s20 79 50 68M-9 59C27 98 27 51 36 28S95-19 149 6s38 68 66 67M-3 119c28 27 46-22 66-9s41 26 66 11 38 9 73 11" />
    </G>
    <G stroke={ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none">{subjects[subject]}</G>
    <Circle cx="164" cy="31" r="3" fill={ink} opacity={0.65} /><Path d="M33 41v10m-5-5h10" stroke={ink} strokeWidth={1.5} opacity={0.5} />
  </Svg>;
}
