import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

export type NavIconName = 'home' | 'workouts' | 'progress' | 'profile' | 'coach';

/** A purpose-drawn, optically balanced family on a shared 32-point canvas. */
export function NavIcon({ name, color, fill, size = 28 }: {
  name: NavIconName; color: string; fill: string; size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none" accessible={false}>
      <G stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
        {name === 'home' ? <>
          <Path d="M5.5 13.5 16 4.8l10.5 8.7v11a2.7 2.7 0 0 1-2.7 2.7H8.2a2.7 2.7 0 0 1-2.7-2.7Z" fill={fill} />
          <Path d="m3 15.5 11.1-9.3a3 3 0 0 1 3.8 0L29 15.5" />
          <Path d="M12.5 27.2v-8a3.5 3.5 0 0 1 7 0v8" />
          <Path d="M12.5 27.2h7" strokeWidth={2.4} />
        </> : null}
        {name === 'workouts' ? <G transform="rotate(-35 16 16)">
          <Rect x="10.5" y="13.5" width="11" height="5" rx="1.5" fill={fill} />
          <Rect x="5.5" y="7" width="5" height="18" rx="2.2" fill={fill} />
          <Rect x="21.5" y="7" width="5" height="18" rx="2.2" fill={fill} />
          <Path d="M2.5 12v8M29.5 12v8" strokeWidth={2.5} />
          <Path d="M16 14v4" strokeOpacity={0.5} />
        </G> : null}
        {name === 'progress' ? <>
          <Rect x="4.5" y="18" width="5" height="9" rx="2" fill={fill} />
          <Rect x="13.5" y="12" width="5" height="15" rx="2" fill={fill} />
          <Rect x="22.5" y="5" width="5" height="22" rx="2" fill={fill} />
          <Path d="m5 11 6-5 5 1.5" strokeWidth={2.2} />
        </> : null}
        {name === 'profile' ? <>
          <Circle cx="16" cy="10" r="5.3" fill={fill} />
          <Path d="M5.5 26.8v-1.5a8.3 8.3 0 0 1 8.3-8.3h4.4a8.3 8.3 0 0 1 8.3 8.3v1.5Z" fill={fill} />
          <Path d="M12.5 21.5a6.5 6.5 0 0 0 7 0" strokeOpacity={0.65} />
        </> : null}
        {name === 'coach' ? <>
          <Path d="M23 6H9a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h1v4l6-4h7a5 5 0 0 0 5-5V11a5 5 0 0 0-5-5Z" fill={fill} strokeWidth={2} />
          <Path d="M11 13v5m10-5v5" strokeWidth={3} />
          <Path d="M16 6V2m-2 0h4" strokeWidth={2} />
          <Path d="M14 21h4" strokeWidth={1.8} />
        </> : null}
      </G>
    </Svg>
  );
}
