import { LinearGradient } from 'expo-linear-gradient';
import { Medal } from 'lucide-react-native';
import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { ShareCardData, ShareStat } from '@/src/features/share/cardData';
import { RouteArt } from '@/src/features/share/RouteArt';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { type } from '@/src/styles/tokens';

export type CardFormat = 'story' | 'post';

/** Logical size of each format; captured at 3× (1080 px wide). */
export const CARD_SIZE: Record<CardFormat, { width: number; height: number }> = {
  story: { width: 360, height: 640 }, // 9:16 — stories, status
  post: { width: 360, height: 450 }, // 4:5 — feed posts
};

const PAD = 26;

/** The shareable achievement card. Rendered at its logical size; scale it for previews. */
export const ShareCard = forwardRef<View, { data: ShareCardData; format: CardFormat }>(function ShareCard({ data, format }, ref) {
  const c = useThemeColors();
  const { width, height } = CARD_SIZE[format];
  const story = format === 'story';
  // Story has room to spare: a Roam's route fills it; a workout lists highlights below.
  const visualH = story ? (data.route ? 300 : 200) : 120;

  return (
    <View ref={ref} collapsable={false} style={{ width, height }}>
      <LinearGradient colors={[c.hero.from, c.hero.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.card]}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image source={require('@/assets/images/fitnyx-logo.png')} style={styles.logo} />
            <Text style={[styles.wordmark, { color: c.hero.text }]}>
              FIT<Text style={{ color: c.primary }}>NYX</Text>
            </Text>
          </View>
          <Text style={[styles.date, { color: c.hero.muted }]}>{data.date}</Text>
        </View>

        <View style={[styles.visual, { height: visualH }]}>
          {data.route ? (
            <RouteArt route={data.route} width={width - 2 * PAD} height={visualH} />
          ) : (
            <LinearGradient colors={[c.gold.from, c.gold.to]} style={[styles.medal, !story && styles.medalSmall]}>
              <Medal size={story ? 64 : 40} color={c.gold.text} />
            </LinearGradient>
          )}
        </View>

        <Text style={[styles.eyebrow, { color: c.hero.accent }]}>{data.eyebrow}</Text>
        <Text style={[styles.title, { color: c.hero.text }]} numberOfLines={2}>
          {data.title}
        </Text>

        <Text style={[styles.hero, story ? styles.heroStory : styles.heroPost, { color: c.hero.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {data.hero.value}
          {data.hero.unit ? <Text style={[styles.heroUnit, { color: c.hero.muted }]}> {data.hero.unit}</Text> : null}
        </Text>

        <View style={[styles.stats, { borderTopColor: c.hero.line }]}>
          {data.stats.map((s) => (
            <Stat key={s.label} stat={s} />
          ))}
        </View>

        {story && data.highlights.length ? (
          <View style={styles.highlights}>
            {data.highlights.map((h) => (
              <Text key={h} style={[styles.highlight, { color: c.hero.text }]} numberOfLines={1}>
                {h}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.footer}>
          {data.badge ? (
            <View style={[styles.badge, { backgroundColor: c.hero.line }]}>
              <Text style={[styles.badgeText, { color: c.hero.accent }]}>{data.badge}</Text>
            </View>
          ) : (
            <View />
          )}
          <Text style={[styles.tagline, { color: c.hero.muted }]}>Tracked on FitNyx</Text>
        </View>
      </LinearGradient>
    </View>
  );
});

function Stat({ stat }: { stat: ShareStat }) {
  const c = useThemeColors();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: c.hero.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {stat.value}
        {stat.unit ? <Text style={[styles.statUnit, { color: c.hero.muted }]}> {stat.unit}</Text> : null}
      </Text>
      <Text style={[styles.statLabel, { color: c.hero.muted }]} numberOfLines={1}>
        {stat.label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: PAD, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logo: { width: 30, height: 30 },
  wordmark: { fontFamily: 'Anton_400Regular', fontSize: 22, letterSpacing: 0.5 },
  date: { fontFamily: type.weight.semibold, fontSize: 12 },
  visual: { alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  medal: { width: 128, height: 128, borderRadius: 64, alignItems: 'center', justifyContent: 'center' },
  medalSmall: { width: 84, height: 84, borderRadius: 42 },
  eyebrow: { fontFamily: type.weight.bold, fontSize: 11, letterSpacing: 1.6 },
  title: { fontFamily: type.weight.extrabold, fontSize: 24, letterSpacing: -0.4 },
  hero: { fontFamily: type.weight.extrabold, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  heroStory: { fontSize: 64, marginTop: 4 },
  heroPost: { fontSize: 48 },
  heroUnit: { fontFamily: type.weight.bold, fontSize: 22, letterSpacing: 0 },
  stats: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 4 },
  stat: { flex: 1, gap: 2 },
  statValue: { fontFamily: type.weight.extrabold, fontSize: 20, fontVariant: ['tabular-nums'] },
  statUnit: { fontFamily: type.weight.semibold, fontSize: 12 },
  statLabel: { fontFamily: type.weight.bold, fontSize: 9.5, letterSpacing: 1 },
  highlights: { gap: 4, marginTop: 10 },
  highlight: { fontFamily: type.weight.medium, fontSize: 13 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' },
  badge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { fontFamily: type.weight.extrabold, fontSize: 14 },
  tagline: { fontFamily: type.weight.semibold, fontSize: 12 },
});
