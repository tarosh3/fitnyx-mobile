import { BlurView } from 'expo-blur';
import { Flame, Trophy } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const NEON_LIME = '#80f20d';
const CELL_SIZE = 10;
const CELL_GAP = 5;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getWeeksGrid(monthsBack: number): { date: Date; dateStr: string }[][] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(today);
    start.setMonth(start.getMonth() - monthsBack);
    start.setDate(start.getDate() - start.getDay());

    const weeks: { date: Date; dateStr: string }[][] = [];
    const current = new Date(start);

    while (current <= today) {
        const week: { date: Date; dateStr: string }[] = [];

        for (let day = 0; day < 7; day += 1) {
            if (current <= today) {
                week.push({
                    date: new Date(current),
                    dateStr: current.toISOString().slice(0, 10),
                });
            }
            current.setDate(current.getDate() + 1);
        }

        weeks.push(week);
    }

    return weeks;
}

function getIntensityColor(count: number): string {
    if (count === 0) return '#1C1C1E'; // Match Github empty cell look in Image 1
    if (count === 1) return `${NEON_LIME}44`;
    if (count === 2) return `${NEON_LIME}88`;
    return NEON_LIME;
}

interface ActivityHeatmapProps {
    streakDays: number;
    activityDays: { get: (dateStr: string) => number | undefined };
}

export function ActivityHeatmap({ streakDays, activityDays }: ActivityHeatmapProps) {
    const weeks = useMemo(() => getWeeksGrid(5), []);
    const totalWidth = weeks.length * (CELL_SIZE + CELL_GAP);

    const monthLabels = useMemo(() => {
        const labels: { label: string; x: number }[] = [];
        let lastMonth = -1;
        weeks.forEach((week, i) => {
            const m = week[0].date.getMonth();
            if (m !== lastMonth) {
                labels.push({
                    label: MONTH_LABELS[m].toUpperCase(),
                    x: i * (CELL_SIZE + CELL_GAP),
                });
                lastMonth = m;
            }
        });
        return labels;
    }, [weeks]);

    return (
        <View style={styles.section}>
            <View style={styles.header}>
                <Text style={styles.sectionTitle}>ACTIVITY</Text>
                <View style={styles.headerIcons}>
                    <Trophy color="rgba(255,255,255,0.4)" size={14} />
                    <Text style={styles.statText}>0 days</Text>
                    <Flame color="rgba(255,255,255,0.4)" size={14} />
                    <Text style={styles.statText}>Max 0</Text>
                </View>
            </View>

            <BlurView intensity={10} tint="light" style={styles.heatmapCard}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ width: totalWidth }}>
                        <View style={styles.heatmapGrid}>
                            {weeks.map((week, weekIndex) => (
                                <View key={weekIndex} style={styles.heatmapCol}>
                                    {week.map((day) => {
                                        const count = activityDays.get(day.dateStr) || 0;
                                        return (
                                            <View
                                                key={day.dateStr}
                                                style={[
                                                    styles.cell,
                                                    { backgroundColor: getIntensityColor(count) },
                                                ]}
                                            />
                                        );
                                    })}
                                </View>
                            ))}
                        </View>
                    </View>
                </ScrollView>

                <View style={[styles.footer, { marginTop: 12 }]}>
                    <View style={{ height: 12, width: totalWidth, position: 'relative' }}>
                        {monthLabels.map((ml, idx) => (
                            <Text
                                key={idx}
                                style={[styles.monthText, { position: 'absolute', left: ml.x }]}
                            >
                                {ml.label}
                            </Text>
                        ))}
                    </View>
                </View>

                <View style={[styles.footer, { marginTop: 12, justifyContent: 'flex-end' }]}>
                    <View style={styles.legend}>
                        <Text style={styles.legendText}>Less</Text>
                        <View style={[styles.legendCell, { backgroundColor: '#1C1C1E' }]} />
                        <View style={[styles.legendCell, { backgroundColor: `${NEON_LIME}44` }]} />
                        <View style={[styles.legendCell, { backgroundColor: NEON_LIME }]} />
                        <Text style={styles.legendText}>More</Text>
                    </View>
                </View>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: 2,
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statText: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.4)',
    },
    heatmapCard: {
        borderRadius: 20,
        overflow: 'hidden',
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    heatmapGrid: {
        flexDirection: 'row',
        gap: CELL_GAP,
    },
    heatmapCol: {
        gap: CELL_GAP,
    },
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        borderRadius: 2,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
    },
    monthLabels: {
        flexDirection: 'row',
        gap: 20,
    },
    monthText: {
        fontSize: 9,
        fontWeight: '900',
        color: 'rgba(255, 255, 255, 0.2)',
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendText: {
        fontSize: 8,
        fontWeight: '900',
        color: 'rgba(255, 255, 255, 0.4)',
        textTransform: 'uppercase',
    },
    legendCell: {
        width: 8,
        height: 8,
        borderRadius: 1,
    },
});
