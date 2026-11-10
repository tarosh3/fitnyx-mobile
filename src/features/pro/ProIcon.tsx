import React from 'react';
import Svg, { Path } from 'react-native-svg';

/** Nyx Spark: a forward-leaning four-point spark with a lightning cutout.
 * One compound path keeps the mark crisp and transparent at badge sizes.
 */
export const PRO_SPARK_PATH = 'M35 2L43 22L62 29L43 40L30 62L23 43L2 35L22 23Z M35 17L23 35H31L27 48L44 28H35L39 17Z';

export function ProIcon({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none" accessible={false}>
      <Path d={PRO_SPARK_PATH} fill={color} fillRule="evenodd" clipRule="evenodd" />
    </Svg>
  );
}
