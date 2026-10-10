import { BlurView } from 'expo-blur';
import { Calendar, Flame, Target, Trophy, Zap } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useTheme } from '@/src/providers/ThemeProvider';

const NEON_LIME = '#5fc793';
const CELL_SIZE = 12;
const CELL_GAP = 3;
const MONTHS_BACK = 5;
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
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

function getIntensityColor(count: number, theme: string): string {
    if (count === 0) return theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    if (count === 1) return `${NEON_LIME}55`;
    if (count === 2) return `${NEON_LIME}99`;
    return NEON_LIME;
}

function getIntensityBorder(count: number, theme: string): string {
    if (count === 0) return theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
    return 'transparent';
}

interface ActivityHeatmapProps {
    streakDays: number;
    maxStreak: number;
    totalActiveDays: number;
    activityDays: { get: (dateStr: string) => number | undefined };
}

export function ActivityHeatmap({ streakDays, maxStreak, totalActiveDays, activityDays }: ActivityHeatmapProps) {
    const palette = useThemeColors();
    const { theme } = useTheme();
    const styles = getStyles(palette, theme);
    const [selectedDay, setSelectedDay] = useState<{ dateStr: string; count: number } | null>(null);
    const weeks = useMemo(() => getWeeksGrid(MONTHS_BACK), []);
    const totalWidth = weeks.length * (CELL_SIZE + CELL_GAP);

    // Count total workouts from activityDays
    const totalWorkouts = useMemo(() => {
        let count = 0;
        weeks.forEach((week) =>
            week.forEach((day) => {
                count += activityDays.get(day.dateStr) || 0;
            })
        );
        return count;
    }, [weeks, activityDays]);

    // Calculate this week's workouts
    const thisWeekWorkouts = useMemo(() => {
        if (weeks.length === 0) return 0;
        const lastWeek = weeks[weeks.length - 1];
        let count = 0;
        lastWeek.forEach((day) => {
            count += activityDays.get(day.dateStr) || 0;
        });
        return count;
    }, [weeks, activityDays]);

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

    const statCards = [
        { icon: Flame, label: 'Current Streak', value: `${streakDays}d`, color: '#FF6B35' },
        { icon: Trophy, label: 'Best Streak', value: `${maxStreak}d`, color: '#FFD700' },
        { icon: Calendar, label: 'Active Days', value: `${totalActiveDays}`, color: NEON_LIME },
        { icon: Zap, label: 'This Week', value: `${thisWeekWorkouts}`, color: '#60A5FA' },
    ];

    return (
        <View style={styles.section}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Target color={NEON_LIME} size={14} />
                    <Text style={styles.sectionTitle}>ACTIVITY</Text>
                </View>
                <Text style={styles.totalLabel}>
                    {totalWorkouts} workout{totalWorkouts !== 1 ? 's' : ''} tracked
                </Text>
            </View>

            {/* Stat Cards Row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
                <View style={styles.statsRow}>
                    {statCards.map((stat, idx) => (
                        <View key={idx} style={styles.statCard}>
                            <View style={[styles.statIconWrap, { backgroundColor: `${stat.color}18` }]}>
                                <stat.icon color={stat.color} size={14} />
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Heatmap Card */}
            <BlurView intensity={10} tint="light" style={styles.heatmapCard}>
                <View style={styles.heatmapInner}>
                    {/* Day labels column */}
                    <View style={styles.dayLabelsCol}>
                        {DAY_LABELS.map((label, i) => (
                            <View key={i} style={styles.dayLabelCell}>
                                <Text style={styles.dayLabelText}>{label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Grid */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                        <View>
                            <View style={styles.heatmapGrid}>
                                {weeks.map((week, weekIndex) => (
                                    <View key={weekIndex} style={styles.heatmapCol}>
                                        {week.map((day) => {
                                            const count = activityDays.get(day.dateStr) || 0;
                                            const isToday = day.dateStr === new Date().toISOString().slice(0, 10);
                                            const isSelected = selectedDay?.dateStr === day.dateStr;
                                            return (
                                                <Pressable
                                                    key={day.dateStr}
                                                    onPress={() => setSelectedDay(isSelected ? null : { dateStr: day.dateStr, count })}
                                                    style={[
                                                        styles.cell,
                                                        {
                                                            backgroundColor: getIntensityColor(count, theme),
                                                            // Selected ring must contrast the page bg in both themes — theme text color does exactly that.
                                                            borderColor: isSelected ? palette.text : isToday ? NEON_LIME : getIntensityBorder(count, theme),
                                                            borderWidth: isSelected ? 1.5 : isToday ? 1.5 : 0.5,
                                                        },
                                                    ]}
                                                />
                                            );
                                        })}
                                    </View>
                                ))}
                            </View>

                            {/* Month labels */}
                            <View style={[styles.monthRow, { width: totalWidth }]}>
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
                    </ScrollView>
                </View>

                {/* Selected day tooltip */}
                {selectedDay && (
                    <View style={styles.tooltip}>
                        <Text style={styles.tooltipDate}>
                            {new Date(selectedDay.dateStr + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </Text>
                        <Text style={styles.tooltipCount}>
                            {selectedDay.count === 0
                                ? 'No workouts'
                                : `${selectedDay.count} workout${selectedDay.count > 1 ? 's' : ''}`}
                        </Text>
                    </View>
                )}

                {/* Legend */}
                <View style={styles.legendRow}>
                    <Text style={styles.legendHint}>
                        {streakDays > 0
                            ? `You're on a ${streakDays}-day streak!`
                            : 'Start a workout to build your streak'}
                    </Text>
                    <View style={styles.legend}>
                        <Text style={styles.legendText}>Less</Text>
                        <View style={[styles.legendCell, { backgroundColor: getIntensityColor(0, theme) }]} />
                        <View style={[styles.legendCell, { backgroundColor: `${NEON_LIME}55` }]} />
                        <View style={[styles.legendCell, { backgroundColor: `${NEON_LIME}99` }]} />
                        <View style={[styles.legendCell, { backgroundColor: NEON_LIME }]} />
                        <Text style={styles.legendText}>More</Text>
                    </View>
                </View>
            </BlurView>
        </View>
    );
}

const getStyles = (palette: any, theme: string) => StyleSheet.create({
    section: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: palette.mutedText,
        letterSpacing: 2,
    },
    totalLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: palette.mutedText,
    },
    statsScroll: {
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    statCard: {
        backgroundColor: palette.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: palette.border,
        paddingVertical: 12,
        paddingHorizontal: 14,
        alignItems: 'center',
        minWidth: 80,
    },
    statIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '900',
        color: palette.text,
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: palette.mutedText,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginTop: 2,
    },
    heatmapCard: {
        borderRadius: 20,
        overflow: 'hidden',
        padding: 16,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
    },
    heatmapInner: {
        flexDirection: 'row',
    },
    dayLabelsCol: {
        marginRight: 6,
        justifyContent: 'flex-start',
    },
    dayLabelCell: {
        height: CELL_SIZE,
        marginBottom: CELL_GAP,
        justifyContent: 'center',
    },
    dayLabelText: {
        fontSize: 8,
        fontWeight: '700',
        color: palette.mutedText,
        width: 20,
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
        borderRadius: 3,
    },
    monthRow: {
        height: 16,
        marginTop: 8,
        position: 'relative',
    },
    monthText: {
        fontSize: 9,
        fontWeight: '800',
        color: palette.mutedText,
    },
    tooltip: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginTop: 10,
    },
    tooltipDate: {
        fontSize: 11,
        fontWeight: '700',
        color: palette.text,
    },
    tooltipCount: {
        fontSize: 11,
        fontWeight: '800',
        color: NEON_LIME,
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    },
    legendHint: {
        fontSize: 10,
        fontWeight: '600',
        color: palette.mutedText,
        fontStyle: 'italic',
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendText: {
        fontSize: 8,
        fontWeight: '900',
        color: palette.mutedText,
        textTransform: 'uppercase',
    },
    legendCell: {
        width: 10,
        height: 10,
        borderRadius: 2,
    },
});
