import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { PRO_SPARK_PATH } from '@/src/features/pro/ProIcon';
import { useThemeColors } from '@/src/hooks/useThemeColors';

/** Original vector linework: training, movement, coaching, and progress orbit the Pro spark. */
export function ProDoodle() {
  const c = useThemeColors();
  const mint = c.hero.accent;
  const paper = c.share.sketch.paper;
  const ink = c.share.night.bg;
  const yellow = c.share.sketch.yellow;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 220" accessible={false}>
      {/* Loose pen orbit, deliberately broken where the illustrations sit. */}
      <Ellipse cx="181" cy="113" rx="126" ry="69" rotation="-13" origin="181,113"
        fill="none" stroke={c.share.night.faint} strokeWidth="1.5" strokeDasharray="4 7" />
      <Path d="M107 38Q163 11 218 30M216 25L225 33L213 35M245 195Q191 219 135 200"
        fill="none" stroke={paper} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />

      {/* The custom Pro mark, drawn like a cut-paper sticker with an offset pen edge. */}
      <G transform="translate(115 40) rotate(-9 66 66)">
        <Path d="M73 3L91 47L133 62L91 86L62 134L46 92L0 75L44 49Z"
          fill="none" stroke={paper} strokeWidth="1.7" strokeLinejoin="round" />
        <G transform="translate(2 2) scale(2)">
          <Path d={PRO_SPARK_PATH} fill={mint} fillRule="evenodd" clipRule="evenodd" />
        </G>
      </G>
      <Path d="M154 78L165 65M149 89L153 85" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />

      {/* Strength: imperfect, rounded dumbbell outline. */}
      <G transform="translate(25 58) rotate(-24 36 24)" stroke={paper} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M23 21L51 22L51 31L23 30Z" fill={ink} />
        <Path d="M15 8Q14 5 20 5L25 6L25 45L16 44ZM52 6L61 7L60 46L51 45Z" fill={ink} />
        <Path d="M7 16L15 15L16 35L7 35ZM61 17L69 18L69 36L61 36Z" fill={mint} />
        <Path d="M20 12L20 36M56 13L56 39" strokeWidth="1.2" />
      </G>
      <Path d="M32 45L28 38M44 40L44 30M19 58L11 55" stroke={mint} strokeWidth="2" strokeLinecap="round" />

      {/* Progress: a small hand-drawn graph on a paper tile. */}
      <G transform="translate(269 27) rotate(9 25 25)">
        <Path d="M4 1L49 3Q54 4 53 10L52 47Q52 52 46 52L3 50Q-1 49 0 43L1 6Q1 1 4 1Z"
          fill={paper} stroke={paper} strokeWidth="1.5" />
        <Path d="M10 12L10 40L44 40M15 31L25 24L32 28L44 13M36 13L44 13L44 21"
          fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M17 45L36 45" stroke={ink} strokeWidth="1.2" strokeLinecap="round" />
      </G>

      {/* Movement: a running-shoe doodle, with a stitched sole and tied laces. */}
      <G transform="translate(252 135) rotate(13 40 24)" stroke={paper} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M5 18L10 3Q21 11 28 6L36 4L50 23Q57 29 72 28Q82 29 82 40L2 40Q-1 32 5 18Z" fill={ink} />
        <Path d="M5 21Q15 26 22 22L30 14L45 31L26 33L17 29L4 30" fill={mint} />
        <Path d="M2 40L82 40L82 46Q42 49 2 45ZM33 10L43 8M37 16L48 15M43 22L53 21" fill={ink} />
        <Path d="M12 41L12 45M26 42L26 46M41 42L41 46M56 42L56 46M71 41L71 45" strokeWidth="1" />
        <Path d="M36 6Q17-8 24-10Q34-10 36 6Q42-9 47-7Q53-3 36 6" fill="none" stroke={mint} strokeWidth="1.7" />
      </G>
      <Path d="M252 184L236 184M250 192L242 192" stroke={paper} strokeWidth="1.7" strokeLinecap="round" />

      {/* Coaching: friendly pen-drawn chat bubble. */}
      <G transform="translate(40 148) rotate(-8 25 20)">
        <Path d="M5 1Q26-3 47 2Q55 3 55 12L54 30Q53 38 42 38L23 38L11 48L12 37Q1 37 0 28L0 11Q0 3 5 1Z"
          fill={mint} stroke={mint} strokeWidth="2" strokeLinejoin="round" />
        <Path d="M14 15L14 19M36 15L36 19M19 25Q25 31 32 25" fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
      </G>

      {/* A few small pencil accents, subordinate to the main emblem. */}
      <Path d="M109 112L112 121L121 124L112 127L109 136L106 127L97 124L106 121ZM246 91L249 99L257 102L249 105L246 113L243 105L235 102L243 99Z"
        fill="none" stroke={yellow} strokeWidth="1.6" strokeLinejoin="round" />
      <Circle cx="114" cy="180" r="3" fill={yellow} />
      <Circle cx="248" cy="47" r="2.5" fill={mint} />
      <Path d="M181 191L185 186L189 192L193 187" fill="none" stroke={mint} strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  );
}
