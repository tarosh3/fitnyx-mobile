import React from 'react';
import Svg, { Circle, G, Path, Ellipse } from 'react-native-svg';
import { share } from '@/src/theme/colors';

/** Two runners passing a spark: original, resolution-independent club artwork. */
export function ReferralArtwork() {
  const { ink, panel: mint, muted } = share.night;
  const paper = share.sketch.paper;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 180" accessible={false}>
      <Ellipse cx="179" cy="151" rx="148" ry="16" fill="none" stroke={muted} strokeWidth="1" opacity="0.45" />
      <Path d="M7 143Q100 104 183 144T353 136M26 165Q116 126 195 162T337 151" fill="none" stroke={muted} strokeWidth="1" opacity="0.35" />
      {/* Left runner, leaning into a high five. */}
      <G stroke={ink} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M108 94L92 120L60 126" fill="none" strokeWidth="16" />
        <Path d="M111 94L135 113L121 146" fill="none" strokeWidth="17" />
        <Path d="M57 122L46 132Q45 138 56 138L73 133L69 125M117 141L115 156L138 156Q144 152 132 148L128 143" fill={paper} strokeWidth="2" />
        <Path d="M109 51L92 65L106 101L135 90L124 57Z" fill={ink} strokeWidth="2" />
        <Path d="M98 63L78 82L57 72M124 61L146 67L167 40" fill="none" strokeWidth="11" />
        <Circle cx="113" cy="33" r="14" fill={paper} strokeWidth="2" />
        <Path d="M98 31Q96 11 116 15Q129 16 128 28L116 25L110 34Z" fill={ink} strokeWidth="1" />
        <Path d="M109 67L115 83" stroke={mint} strokeWidth="3" />
      </G>
      {/* Right runner; a different stride, the same momentum. */}
      <G stroke={ink} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M236 91L248 116L279 128M226 93L204 114L213 146" fill="none" strokeWidth="16" />
        <Path d="M277 122L287 129L293 140Q289 145 281 138L271 132M208 142L205 154L228 154Q232 149 218 146" fill={ink} strokeWidth="2" />
        <Path d="M225 51L213 87Q225 100 247 93L244 58Z" fill={paper} strokeWidth="2" />
        <Path d="M221 61L199 69L179 40M242 62L263 79L281 65" fill="none" strokeWidth="10" />
        <Circle cx="237" cy="34" r="14" fill={paper} strokeWidth="2" />
        <Path d="M223 31Q222 14 238 16Q257 15 250 38L243 27Z" fill={ink} strokeWidth="2" />
        <Path d="M248 23Q271 16 266 39Q257 43 251 30" fill={ink} strokeWidth="2" />
        <Path d="M225 78L238 81M227 71L240 74" strokeWidth="1.5" />
      </G>
      {/* The reward is the only accent above the runners. */}
      <Path d="M173 5L178 18L191 23L178 28L173 41L168 28L155 23L168 18Z" fill={share.sketch.yellow} stroke={ink} strokeWidth="1.5" />
      <Path d="M148 10L142 5M196 9L202 3M36 101L48 101M302 101L317 101" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="313" cy="51" r="5" fill="none" stroke={ink} strokeWidth="1.5" />
      <Path d="M54 38L54 50M48 44L60 44" stroke={ink} strokeWidth="1.5" />
    </Svg>
  );
}
