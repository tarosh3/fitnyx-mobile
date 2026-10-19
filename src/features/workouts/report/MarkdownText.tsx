import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { spacing, type } from '@/src/styles/tokens';

/** **bold** spans inside a line. */
function Inline({ text, color, style }: { text: string; color: string; style: object }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text style={[style, { color }]}>
      {parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <Text key={i} style={styles.bold}>{p.slice(2, -2)}</Text> : p.replace(/\*(\S[^*]*)\*/g, '$1')))}
    </Text>
  );
}

/** The coach's Markdown subset: headings, numbered and bullet lists, bold, paragraphs. */
export function MarkdownText({ markdown }: { markdown: string }) {
  const c = useThemeColors();
  let n = 0;
  return (
    <View style={styles.wrap}>
      {markdown.split(/\r?\n/).map((raw, i) => {
        const line = raw.trim();
        if (!line) { n = 0; return null; }
        const h = /^#{1,4}\s+(.*)$/.exec(line);
        if (h) { n = 0; return <Inline key={i} text={h[1]} color={c.text} style={styles.h} />; }
        const ol = /^\d+[.)]\s+(.*)$/.exec(line);
        const ul = /^[-*•]\s+(.*)$/.exec(line);
        if (ol || ul) {
          if (ol) n++;
          return (
            <View key={i} style={styles.li}>
              <Text style={[styles.body, styles.marker, { color: c.accent }]}>{ol ? `${n}.` : '•'}</Text>
              <Inline text={(ol ?? ul)![1]} color={c.text} style={[styles.body, styles.grow]} />
            </View>
          );
        }
        n = 0;
        return <Inline key={i} text={line} color={c.text} style={styles.body} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  h: { fontFamily: type.weight.extrabold, fontSize: 18, marginTop: spacing.md },
  body: { fontFamily: type.weight.regular, fontSize: 16, lineHeight: 23 },
  bold: { fontFamily: type.weight.bold },
  li: { flexDirection: 'row', gap: spacing.sm },
  marker: { minWidth: 20, fontFamily: type.weight.bold },
  grow: { flex: 1 },
});
