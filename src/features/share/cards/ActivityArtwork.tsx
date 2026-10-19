import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import type { ShareCardData } from '@/src/features/share/cardData';

export type ActivityArt = 'run' | 'walk' | 'cycle' | 'strength' | 'training' | 'roam';

/** Choose imagery from activity data, never from a user-editable title. */
export function activityArt(data: ShareCardData): ActivityArt {
  if (data.kind === 'roam') return data.activityType ?? 'roam';
  return data.hero.unit === 'kg' ? 'strength' : 'training';
}

interface Props {
  activity: ActivityArt;
  width: number;
  height: number;
  ink: string;
  accent: string;
  background: string;
}

/** Original, static sports illustrations. All strokes are vector and capture offline. */
export function ActivityArtwork({ activity, width, height, ink, accent, background }: Props) {
  const stroke = { stroke: ink, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  return (
    <Svg width={width} height={height} viewBox="0 0 320 176" accessible={false}>
      {activity === 'run' ? (
        <>
          {/* Racing lanes remain decorative, rather than implying a recorded route. */}
          <G stroke={accent} strokeWidth={1} fill="none" opacity={0.3}>
            {[0, 13, 26, 39].map((offset) => (
              <Path
                key={offset}
                d={`M-20 ${155 + offset} L110 ${65 + offset} Q178 ${18 + offset} 270 ${49 + offset} L345 ${77 + offset}`}
              />
            ))}
          </G>
          <G transform="rotate(-12 170 95)">
            <Path
              d="M73 70 L91 42 Q111 62 133 58 L155 47 Q173 65 192 80 L240 98 Q259 102 260 120 L254 132 L74 132 Q61 116 68 96 Z"
              fill={background}
              {...{ stroke: ink, strokeWidth: 3, strokeLinejoin: 'round' }}
            />
            <Path d="M69 112 Q100 121 132 112 Q171 101 199 113 Q222 124 259 116 L254 132 L74 132 Z" fill={accent} />
            <Path
              d="M73 70 L89 83 L84 109 M91 42 Q103 81 133 58 M155 47 Q155 76 192 80 M69 112 Q100 121 132 112 Q171 101 199 113 Q222 124 259 116 M74 132 L254 132"
              {...stroke}
            />
            <Path d="M143 63 L160 67 M153 73 L171 77 M164 82 L182 86 M102 95 L126 86 L151 93 L174 89" {...stroke} />
            <Path
              d="M91 126 L99 120 M113 130 L121 120 M137 130 L145 117 M165 130 L173 117 M193 130 L199 122 M219 130 L224 124 M242 130 L246 123"
              stroke={background}
              strokeWidth={2}
            />
          </G>
          <Path d="M26 86 H63 M14 100 H52 M31 114 H50" stroke={accent} strokeWidth={3} strokeLinecap="round" />
        </>
      ) : activity === 'cycle' ? (
        <>
          <G stroke={accent} opacity={0.25} strokeWidth={1}>
            <Path d="M0 149 H320 M0 158 H320 M0 167 H320" />
            <Path d="M10 106 H44 M2 117 H35 M18 128 H40" strokeWidth={2} />
          </G>
          <G {...stroke}>
            {[76, 245].map((cx) => (
              <G key={cx}>
                <Circle cx={cx} cy={105} r={41} stroke={accent} strokeWidth={4} />
                <Circle cx={cx} cy={105} r={34} opacity={0.5} strokeWidth={1} />
                {[0, 45, 90, 135].map((angle) => (
                  <Line
                    key={angle}
                    x1={cx - 33}
                    y1={105}
                    x2={cx + 33}
                    y2={105}
                    transform={`rotate(${angle} ${cx} 105)`}
                    opacity={0.3}
                    strokeWidth={1}
                  />
                ))}
                <Circle cx={cx} cy={105} r={3} fill={ink} />
              </G>
            ))}
            <Path
              d="M76 105 L121 49 L153 105 Z M121 49 L214 49 L153 105 M214 49 L245 105 M209 34 L214 49 M209 34 H231 Q241 34 240 44 Q240 51 232 51 M121 49 L115 34 M103 34 H128"
              strokeWidth={4}
            />
            <Circle cx={153} cy={105} r={9} fill={background} />
            <Path d="M153 105 L166 117 H175 M153 105 L140 93 H133" stroke={accent} strokeWidth={3} />
          </G>
        </>
      ) : activity === 'walk' ? (
        <>
          <Path
            d="M-8 150 C55 150 54 32 119 26 S206 161 257 141 S282 48 330 45"
            stroke={accent}
            strokeWidth={1.5}
            strokeDasharray="3 7"
            fill="none"
            opacity={0.5}
          />
          <G transform="translate(111 37) rotate(22 22 50)">
            <Sole ink={ink} accent={accent} background={background} />
          </G>
          <G transform="translate(185 2) rotate(22 22 50)">
            <Sole ink={ink} accent={accent} background={background} />
          </G>
          <G stroke={ink} strokeWidth={1} opacity={0.4}>
            <Path d="M43 63 H55 M49 57 V69 M270 116 H282 M276 110 V122" />
          </G>
        </>
      ) : activity === 'strength' ? (
        <>
          <G stroke={accent} fill="none" opacity={0.22} strokeWidth={1}>
            <Ellipse cx={160} cy={88} rx={145} ry={54} transform="rotate(-18 160 88)" />
            <Ellipse cx={160} cy={88} rx={145} ry={68} transform="rotate(-18 160 88)" />
          </G>
          <G transform="rotate(-18 160 88)" {...stroke}>
            <Rect x={39} y={82} width={242} height={12} rx={4} fill={ink} />
            <Rect x={58} y={56} width={20} height={64} rx={6} fill={background} />
            <Rect x={77} y={39} width={29} height={98} rx={8} fill={accent} stroke={accent} />
            <Rect x={214} y={39} width={29} height={98} rx={8} fill={accent} stroke={accent} />
            <Rect x={242} y={56} width={20} height={64} rx={6} fill={background} />
            <Path d="M91 53 V122 M228 53 V122" stroke={background} opacity={0.45} strokeWidth={2} />
            <Path
              d="M121 84 L127 92 M134 84 L140 92 M147 84 L153 92 M160 84 L166 92 M173 84 L179 92 M186 84 L192 92"
              stroke={background}
              strokeWidth={1}
            />
          </G>
        </>
      ) : (
        <>
          {/* Neutral motion mark for non-weighted workouts or untyped Roams. */}
          <G transform="translate(160 88)">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <Path key={angle} d="M25 -8 L67 -8 L80 8 L25 8 Z" fill={angle % 90 === 0 ? accent : ink} transform={`rotate(${angle})`} />
            ))}
            <Circle r={11} fill={background} stroke={ink} strokeWidth={2} />
          </G>
          <Path
            d="M12 70 H59 M0 88 H46 M20 106 H59 M266 70 H301 M275 88 H320 M264 106 H303"
            stroke={accent}
            strokeWidth={2}
            opacity={0.4}
          />
        </>
      )}
    </Svg>
  );
}

function Sole({ ink, accent, background }: { ink: string; accent: string; background: string }) {
  return (
    <G stroke={ink} strokeWidth={2.2} strokeLinejoin="round" fill={background}>
      <Path d="M3 48 C-8 26 -1 1 15 0 C34 -2 45 16 42 37 L36 57 Q18 64 3 48 Z" />
      <Path d="M6 69 Q17 75 31 72 L30 89 Q29 100 18 100 Q7 99 6 89 Z" fill={accent} stroke={accent} />
      <Path d="M4 18 L16 23 L35 14 M1 30 L16 35 L38 26 M5 43 L18 48 L35 40" fill="none" stroke={accent} strokeWidth={3} />
      <Path d="M13 83 H25 M13 90 H23" stroke={background} strokeWidth={2} />
    </G>
  );
}
