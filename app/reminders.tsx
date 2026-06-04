import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import {
  Bell,
  ChevronLeft,
  Cookie,
  Droplet,
  Dumbbell,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { Screen } from '@/src/components/ui/Screen';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { SegmentedControl } from '@/src/components/ui/SegmentedControl';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import {
  type Reminder,
  type ReminderSchedule,
  type ReminderType,
  deleteReminder,
  describeSchedule,
  ensurePermission,
  sendTestNotification,
  setReminderEnabled,
  upsertReminder,
  useReminders,
} from '@/src/lib/reminders';
import { elevation, radii, spacing, type as t } from '@/src/styles/tokens';

const TYPE_META: Record<
  ReminderType,
  { label: string; icon: (color: string) => React.ReactNode; tint: string }
> = {
  workout: {
    label: 'Workout',
    icon: (c) => <Dumbbell size={20} color={c} strokeWidth={1.8} />,
    tint: '#5fc793',
  },
  water: {
    label: 'Water',
    icon: (c) => <Droplet size={20} color={c} strokeWidth={1.8} />,
    tint: '#38BDF8',
  },
  food: {
    label: 'Food',
    icon: (c) => <UtensilsCrossed size={20} color={c} strokeWidth={1.8} />,
    tint: '#F59E0B',
  },
  snack: {
    label: 'Snack',
    icon: (c) => <Cookie size={20} color={c} strokeWidth={1.8} />,
    tint: '#F472B6',
  },
  custom: {
    label: 'Custom',
    icon: (c) => <Bell size={20} color={c} strokeWidth={1.8} />,
    tint: '#A78BFA',
  },
};

type ScheduleKind = ReminderSchedule['kind'];

export default function RemindersScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { items, refresh } = useReminders();
  const activeCount = items.filter((r) => r.enabled).length;
  const pausedCount = items.length - activeCount;
  const [editor, setEditor] = useState<Reminder | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);

  useEffect(() => {
    ensurePermission();
  }, []);

  const openNew = () => {
    setEditor(null);
    setEditorOpen(true);
  };
  const openEdit = (r: Reminder) => {
    setEditor(r);
    setEditorOpen(true);
  };
  const closeEditor = () => {
    setEditorOpen(false);
    setEditor(null);
  };

  const handleToggle = async (r: Reminder, v: boolean) => {
    await setReminderEnabled(r.id, v);
    await refresh();
  };

  const handleDelete = (r: Reminder) => setDeleteTarget(r);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteReminder(deleteTarget.id);
    setDeleteTarget(null);
    await refresh();
  };

  const handleSaved = async () => {
    closeEditor();
    await refresh();
  };

  return (
    <Screen scroll contentContainerStyle={styles.screen}>
      <View style={styles.headerRow}>
        <PressableScale
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
          style={[styles.backBtn, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <ChevronLeft size={22} color={c.text} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: c.mutedText }]}>HABITS</Text>
          <Text style={[styles.h1, { color: c.text }]}>Reminders</Text>
        </View>
        <PressableScale
          onPress={openNew}
          style={[styles.addBtn, { backgroundColor: c.primary }]}
        >
          <Plus size={20} color={c.primaryText} />
        </PressableScale>
      </View>

      {items.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: `${c.primary}1A` }]}>
            <Bell size={28} color={c.primary} strokeWidth={1.8} />
          </View>
          <Text style={[styles.emptyTitle, { color: c.text }]}>No reminders yet</Text>
          <Text style={[styles.emptyText, { color: c.mutedText }]}>
            Set alarms for workouts, hydration, meals or anything custom.
          </Text>
          <Button title="Create reminder" onPress={openNew} style={{ alignSelf: 'stretch', marginTop: spacing.md }} />
        </View>
      ) : (
        <>
          <View style={[styles.summaryCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.summaryIcon, { backgroundColor: `${c.primary}1A` }]}>
              <Bell size={18} color={c.primary} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryTitle, { color: c.text }]}>
                <Text style={{ color: c.primary }}>{activeCount} active</Text>
                {pausedCount > 0 ? `  ·  ${pausedCount} paused` : ''}
              </Text>
              <Text style={[styles.summarySub, { color: c.mutedText }]}>
                {activeCount > 0
                  ? 'Notifications scheduled for your habits'
                  : 'All reminders are paused'}
              </Text>
            </View>
          </View>
          <SectionHeader eyebrow="Active" title="Your reminders" />
          <View style={[styles.listCard, { backgroundColor: c.card, borderColor: c.border }]}>
            {items.map((r, i) => {
              const meta = TYPE_META[r.type];
              return (
                <Pressable
                  key={r.id}
                  onPress={() => openEdit(r)}
                  style={[
                    styles.itemRow,
                    i < items.length - 1 ? { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth } : null,
                  ]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: `${meta.tint}1F`, opacity: r.enabled ? 1 : 0.4 }]}>
                    {meta.icon(meta.tint)}
                  </View>
                  <View style={{ flex: 1, opacity: r.enabled ? 1 : 0.4 }}>
                    <Text style={[styles.itemLabel, { color: c.text }]}>{r.label}</Text>
                    <Text style={[styles.itemSub, { color: c.mutedText }]}>
                      {describeSchedule(r.schedule)}
                    </Text>
                  </View>
                  <View style={styles.itemActions}>
                    <Switch
                      value={r.enabled}
                      onValueChange={(v) => handleToggle(r, v)}
                      trackColor={{ false: c.border, true: c.primary }}
                      thumbColor="#fff"
                    />
                    <Pressable onPress={() => handleDelete(r)} hitSlop={10}>
                      <Trash2 size={16} color={c.mutedText} />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <ReminderEditor
        visible={editorOpen}
        existing={editor}
        onClose={closeEditor}
        onSaved={handleSaved}
      />

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete reminder"
        message={deleteTarget ? `"${deleteTarget.label}" will be removed permanently.` : ''}
        confirmLabel="Delete"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </Screen>
  );
}

function ReminderEditor({
  visible,
  existing,
  onClose,
  onSaved,
}: {
  visible: boolean;
  existing: Reminder | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const c = useThemeColors();
  const [type, setType] = useState<ReminderType>('workout');
  const [label, setLabel] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [kind, setKind] = useState<ScheduleKind>('daily');

  // daily / first-time
  const [time, setTime] = useState(() => buildDate(8, 0));
  const [pickerOpen, setPickerOpen] = useState<null | number>(null);

  // times
  const [times, setTimes] = useState<Date[]>([buildDate(8, 0), buildDate(13, 0), buildDate(19, 0)]);

  // interval
  const [intervalMin, setIntervalMin] = useState(30);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(22);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (existing) {
      setType(existing.type);
      setLabel(existing.label);
      setEnabled(existing.enabled);
      setKind(existing.schedule.kind);
      if (existing.schedule.kind === 'daily') {
        setTime(buildDate(existing.schedule.hour, existing.schedule.minute));
      } else if (existing.schedule.kind === 'times') {
        setTimes(
          existing.schedule.times.map((s) => {
            const [h, m] = s.split(':').map(Number);
            return buildDate(h, m);
          })
        );
      } else {
        setIntervalMin(existing.schedule.minutes);
        setStartHour(existing.schedule.startHour);
        setEndHour(existing.schedule.endHour);
      }
    } else {
      setType('workout');
      setLabel('');
      setEnabled(true);
      setKind('daily');
      setTime(buildDate(8, 0));
      setTimes([buildDate(8, 0), buildDate(13, 0), buildDate(19, 0)]);
      setIntervalMin(30);
      setStartHour(8);
      setEndHour(22);
    }
    setError(null);
  }, [visible, existing]);

  const labelPlaceholder = useMemo(() => {
    return ({
      workout: 'Workout time',
      water: 'Drink water',
      food: 'Meal',
      snack: 'Healthy snack',
      custom: 'Reminder',
    } as Record<ReminderType, string>)[type];
  }, [type]);

  const onTypePress = (next: ReminderType) => {
    setType(next);
    if (next === 'water') setKind('interval');
    else if (next === 'food') setKind('times');
    else setKind('daily');
  };

  const handleSave = async () => {
    const finalLabel = label.trim() || labelPlaceholder;
    let schedule: ReminderSchedule;
    if (kind === 'daily') {
      schedule = { kind: 'daily', hour: time.getHours(), minute: time.getMinutes() };
    } else if (kind === 'times') {
      schedule = {
        kind: 'times',
        times: times.map((d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`),
      };
    } else {
      if (endHour <= startHour) {
        setError('End hour must be after start hour.');
        return;
      }
      schedule = { kind: 'interval', minutes: intervalMin, startHour, endHour };
    }
    setError(null);
    await upsertReminder({
      id: existing?.id,
      type,
      label: finalLabel,
      enabled,
      schedule,
    });
    onSaved();
  };

  const updateTimeAt = (idx: number, next: Date) => {
    setTimes((prev) => prev.map((d, i) => (i === idx ? next : d)));
  };

  const addTimeSlot = () => setTimes((prev) => [...prev, buildDate(12, 0)]);
  const removeTimeSlot = (idx: number) =>
    setTimes((prev) => prev.filter((_, i) => i !== idx));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: c.text }]}>
            {existing ? 'Edit reminder' : 'New reminder'}
          </Text>
          <Pressable onPress={onClose}>
            <Text style={[styles.sheetDone, { color: c.mutedText }]}>Cancel</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: spacing.lg, gap: spacing.lg }}>
          {/* Type chips */}
          <View>
            <Text style={[styles.fieldLabel, { color: c.mutedText }]}>TYPE</Text>
            <View style={styles.typeRow}>
              {(Object.keys(TYPE_META) as ReminderType[]).map((tk) => {
                const meta = TYPE_META[tk];
                const active = tk === type;
                return (
                  <Pressable
                    key={tk}
                    onPress={() => onTypePress(tk)}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: active ? `${meta.tint}26` : c.surface,
                        borderColor: active ? meta.tint : c.border,
                      },
                    ]}
                  >
                    {meta.icon(active ? meta.tint : c.mutedText)}
                    <Text
                      style={[
                        styles.typeChipText,
                        { color: active ? c.text : c.mutedText },
                      ]}
                    >
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Label */}
          <View>
            <Text style={[styles.fieldLabel, { color: c.mutedText }]}>LABEL</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder={labelPlaceholder}
              placeholderTextColor={c.mutedText}
              style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
            />
          </View>

          {/* Schedule kind */}
          <View>
            <Text style={[styles.fieldLabel, { color: c.mutedText }]}>SCHEDULE</Text>
            <SegmentedControl
              options={[
                { label: 'Daily', value: 'daily' },
                { label: 'Times', value: 'times' },
                { label: 'Interval', value: 'interval' },
              ]}
              value={kind}
              onChange={(v) => setKind(v as ScheduleKind)}
            />
          </View>

          {kind === 'daily' && (
            <TimePickRow
              label="Time"
              value={time}
              onChange={setTime}
              open={pickerOpen === -1}
              setOpen={(v) => setPickerOpen(v ? -1 : null)}
            />
          )}

          {kind === 'times' && (
            <View style={{ gap: spacing.sm }}>
              {times.map((d, i) => (
                <View key={i} style={styles.timeRowWrap}>
                  <View style={{ flex: 1 }}>
                    <TimePickRow
                      label={`Time ${i + 1}`}
                      value={d}
                      onChange={(next) => updateTimeAt(i, next)}
                      open={pickerOpen === i}
                      setOpen={(v) => setPickerOpen(v ? i : null)}
                    />
                  </View>
                  {times.length > 1 ? (
                    <Pressable onPress={() => removeTimeSlot(i)} hitSlop={10} style={styles.removeBtn}>
                      <Trash2 size={16} color={c.mutedText} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
              <Pressable
                onPress={addTimeSlot}
                style={[styles.addTimeBtn, { borderColor: c.border }]}
              >
                <Plus size={16} color={c.primary} />
                <Text style={[styles.addTimeText, { color: c.primary }]}>Add another time</Text>
              </Pressable>
            </View>
          )}

          {kind === 'interval' && (
            <View style={{ gap: spacing.md }}>
              <View>
                <Text style={[styles.fieldLabel, { color: c.mutedText }]}>EVERY</Text>
                <View style={styles.intervalRow}>
                  {[15, 30, 60, 90, 120].map((m) => {
                    const active = intervalMin === m;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => setIntervalMin(m)}
                        style={[
                          styles.intervalChip,
                          {
                            backgroundColor: active ? c.primary : c.surface,
                            borderColor: active ? c.primary : c.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.intervalText,
                            { color: active ? c.primaryText : c.text },
                          ]}
                        >
                          {m < 60 ? `${m}m` : `${m / 60}h`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <HourRangeRow
                startHour={startHour}
                endHour={endHour}
                onStartChange={setStartHour}
                onEndChange={setEndHour}
              />
            </View>
          )}

          {/* Enabled */}
          <View style={[styles.enabledRow, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.enabledLabel, { color: c.text }]}>Enabled</Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor="#fff"
            />
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: `${c.destructive}1A`, borderColor: c.destructive }]}>
              <Text style={[styles.errorText, { color: c.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <Button title={existing ? 'Save changes' : 'Create reminder'} onPress={handleSave} />

          <Button
            title="Send test notification (8s)"
            variant="ghost"
            onPress={async () => {
              const draftLabel = label.trim() || labelPlaceholder;
              const draft: Reminder = {
                id: existing?.id || 'test',
                type,
                label: draftLabel,
                enabled: true,
                schedule: { kind: 'daily', hour: 0, minute: 0 },
                createdAt: new Date().toISOString(),
              };
              const ok = await sendTestNotification(draft);
              setError(ok ? null : 'Permission denied. Enable notifications in settings.');
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

function TimePickRow({
  label,
  value,
  onChange,
  open,
  setOpen,
}: {
  label: string;
  value: Date;
  onChange: (next: Date) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const c = useThemeColors();
  const display = `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: c.mutedText }]}>{label.toUpperCase()}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.input, styles.timeBtn, { backgroundColor: c.surface, borderColor: c.border }]}
      >
        <Text style={[styles.timeText, { color: c.text }]}>{display}</Text>
      </Pressable>
      {open && Platform.OS === 'ios' ? (
        <Modal transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setOpen(false)} />
          <View style={[styles.pickerSheet, { backgroundColor: c.card, borderColor: c.border }]}>
            <DateTimePicker
              value={value}
              mode="time"
              display="spinner"
              themeVariant="dark"
              onChange={(_, d) => d && onChange(d)}
            />
            <Button title="Done" onPress={() => setOpen(false)} />
          </View>
        </Modal>
      ) : open ? (
        <DateTimePicker
          value={value}
          mode="time"
          is24Hour
          onChange={(_, d) => {
            setOpen(false);
            if (d) onChange(d);
          }}
        />
      ) : null}
    </View>
  );
}

function HourRangeRow({
  startHour,
  endHour,
  onStartChange,
  onEndChange,
}: {
  startHour: number;
  endHour: number;
  onStartChange: (h: number) => void;
  onEndChange: (h: number) => void;
}) {
  const c = useThemeColors();
  const bump = useCallback((kind: 'start' | 'end', delta: number) => {
    if (kind === 'start') onStartChange(clampHour(startHour + delta));
    else onEndChange(clampHour(endHour + delta));
  }, [startHour, endHour, onStartChange, onEndChange]);
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: c.mutedText }]}>ACTIVE HOURS</Text>
      <View style={[styles.rangeWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
        <RangeStepper label="From" value={startHour} onBump={(d) => bump('start', d)} />
        <View style={[styles.rangeDivider, { backgroundColor: c.border }]} />
        <RangeStepper label="To" value={endHour} onBump={(d) => bump('end', d)} />
      </View>
    </View>
  );
}

function RangeStepper({
  label,
  value,
  onBump,
}: {
  label: string;
  value: number;
  onBump: (delta: number) => void;
}) {
  const c = useThemeColors();
  return (
    <View style={styles.rangeCol}>
      <Text style={[styles.rangeLabel, { color: c.mutedText }]}>{label}</Text>
      <View style={styles.rangeStepRow}>
        <Pressable onPress={() => onBump(-1)} style={[styles.rangeStepBtn, { backgroundColor: c.card }]}>
          <Text style={[styles.rangeStepText, { color: c.text }]}>−</Text>
        </Pressable>
        <Text style={[styles.rangeValue, { color: c.text }]}>{pad(value)}:00</Text>
        <Pressable onPress={() => onBump(1)} style={[styles.rangeStepBtn, { backgroundColor: c.card }]}>
          <Text style={[styles.rangeStepText, { color: c.text }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function buildDate(hour: number, minute: number): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function clampHour(h: number): number {
  if (h < 0) return 0;
  if (h > 23) return 23;
  return h;
}

const styles = StyleSheet.create({
  screen: { paddingBottom: spacing['3xl'], paddingHorizontal: 0, gap: spacing.xs },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.sm,
  },
  eyebrow: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.xs,
    letterSpacing: t.tracking.eyebrow,
    textTransform: 'uppercase',
  },
  h1: { fontFamily: t.weight.extrabold, fontSize: t.size.h1, letterSpacing: t.tracking.tight, marginTop: 2 },
  emptyCard: {
    marginHorizontal: spacing.base,
    padding: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontFamily: t.weight.bold, fontSize: t.size.h3 },
  emptyText: { fontFamily: t.weight.regular, fontSize: t.size.sm, textAlign: 'center' },
  listCard: {
    marginHorizontal: spacing.base,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md + 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: { fontFamily: t.weight.semibold, fontSize: t.size.body },
  itemSub: { fontFamily: t.weight.regular, fontSize: t.size.xs, marginTop: 2 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.base,
    marginTop: spacing.xs,
    padding: spacing.base,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: { fontFamily: t.weight.bold, fontSize: t.size.body },
  summarySub: { fontFamily: t.weight.regular, fontSize: t.size.xs, marginTop: 2 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing['3xl'],
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '92%',
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 999, alignSelf: 'center', marginBottom: spacing.md },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontFamily: t.weight.bold, fontSize: t.size.h3 },
  sheetDone: { fontFamily: t.weight.semibold, fontSize: t.size.body },
  fieldLabel: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.xs,
    letterSpacing: t.tracking.eyebrow,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  typeChipText: { fontFamily: t.weight.semibold, fontSize: t.size.sm },
  input: {
    height: 48,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.base,
    fontFamily: t.weight.medium,
    fontSize: t.size.body,
  },
  timeBtn: { justifyContent: 'center' },
  timeText: { fontFamily: t.weight.bold, fontSize: t.size.h3 },
  timeRowWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  removeBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTimeBtn: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  addTimeText: { fontFamily: t.weight.bold, fontSize: t.size.sm },
  intervalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  intervalChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  intervalText: { fontFamily: t.weight.bold, fontSize: t.size.sm },
  rangeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
  },
  rangeCol: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  rangeLabel: { fontFamily: t.weight.semibold, fontSize: t.size.xs, letterSpacing: t.tracking.wide },
  rangeStepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rangeStepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeStepText: { fontFamily: t.weight.bold, fontSize: 18 },
  rangeValue: { fontFamily: t.weight.bold, fontSize: t.size.body, minWidth: 60, textAlign: 'center' },
  rangeDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginHorizontal: spacing.sm },
  enabledRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  enabledLabel: { fontFamily: t.weight.semibold, fontSize: t.size.body },
  errorBox: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorText: { fontFamily: t.weight.semibold, fontSize: t.size.sm },
  pickerSheet: {
    margin: spacing.base,
    padding: spacing.base,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    gap: spacing.md,
  },
});
