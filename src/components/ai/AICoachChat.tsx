import { BrandLoader } from '@/src/components/ui/BrandLoader';
import { Illustration } from '@/src/components/art/Illustration';
import {
  Archive, ArrowUp, ArrowUpRight, ChartSpline, Check, ChevronDown,
  ChevronRight, History, Leaf, MessageCircle, Plus, Target, Utensils, WifiOff, X,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FiloMark } from '@/src/components/ai/FiloMark';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { MAX_LONG_TEXT, sanitizeGeneralText } from '@/src/lib/validators';
import { useAICoach } from '@/src/providers/AICoachProvider';
import { radii, spacing, type as t } from '@/src/styles/tokens';

const PROMPTS = [
  { icon: ChartSpline, title: 'See the bigger picture', detail: 'Check in on my progress', message: "How's my progress?" },
  { icon: Utensils, title: 'Fuel my day', detail: 'Find a high-protein meal', message: 'Quick high-protein meal idea?' },
  { icon: Leaf, title: 'Recover a little better', detail: 'Make my rest days count', message: 'Recovery tips' },
];

export function AICoachChat() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const followLatest = useRef(true);
  const sending = useRef(false);
  const {
    threads, currentThreadId, currentThreadTitle, messages, isOpen, isLoading,
    isThreadListOpen, toggleChat, sendMessage, startNewChat, switchThread,
    archiveCurrentThread, toggleThreadList, loadThreads,
  } = useAICoach();
  const { isOnline } = useNetworkStatus();
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(44);
  const [showLatest, setShowLatest] = useState(false);
  const canSend = isOnline && !isLoading && !isSending;
  const roomy = width >= 600;
  const compact = height < 740 || fontScale > 1.2;

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => { if (isOpen) void loadThreads(); }, [isOpen, loadThreads]);
  useEffect(() => {
    followLatest.current = true;
    setShowLatest(false);
  }, [currentThreadId, isOpen]);

  const close = () => { Keyboard.dismiss(); toggleChat(); };
  const scrollToLatest = () => {
    followLatest.current = true;
    setShowLatest(false);
    scrollRef.current?.scrollToEnd({ animated: true });
  };
  // Lock immediately, including while the provider creates the first thread.
  const submit = async (text: string, fromComposer = false) => {
    if (!text.trim() || !canSend || sending.current) return;
    sending.current = true;
    setIsSending(true);
    followLatest.current = true;
    if (fromComposer) { setInputValue(''); setInputHeight(44); }
    try { await sendMessage(text.trim()); }
    finally { sending.current = false; setIsSending(false); }
  };

  return (
    <Modal transparent animationType="slide" visible={isOpen} onRequestClose={close} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={close} />
        <KeyboardAvoidingView
          pointerEvents="box-none"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalLayout, {
            paddingTop: insets.top + spacing.sm,
            paddingLeft: insets.left, paddingRight: insets.right,
            paddingBottom: roomy ? Math.max(insets.bottom, spacing.xl) : 0,
          }]}
        >
          <View accessibilityViewIsModal style={[styles.panel, {
            backgroundColor: c.background, borderColor: c.border,
            maxHeight: Math.min(height * 0.94, 900),
            borderBottomLeftRadius: roomy ? radii['2xl'] : 0,
            borderBottomRightRadius: roomy ? radii['2xl'] : 0,
            paddingBottom: keyboardVisible ? spacing.sm : Math.max(roomy ? spacing.md : insets.bottom, spacing.md),
          }]}>
            <View accessible={false} style={[styles.grabber, { backgroundColor: c.border }]} />
            <View style={styles.header}>
              <FiloMark size={44} />
              <View style={styles.flex}>
                <Text style={[styles.headerTitle, { color: c.text }]}>Filo<Text style={{ color: c.accent }}>.</Text></Text>
                <Text style={[styles.headerSub, { color: c.mutedText }]}>Your AI fitness coach</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close coach" onPress={close}
                style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? c.border : c.surface }]}>
                <X size={20} strokeWidth={1.8} color={c.text} />
              </Pressable>
            </View>

            <View style={[styles.toolbar, { borderBottomColor: c.border }]}>
              <Pressable accessibilityRole="button" accessibilityLabel="Chat history"
                accessibilityState={{ expanded: isThreadListOpen }}
                onPress={() => { Keyboard.dismiss(); toggleThreadList(); }}
                style={({ pressed }) => [styles.historyButton, { backgroundColor: pressed || isThreadListOpen ? c.accentSoft : c.surface }]}>
                <History size={16} color={c.mutedText} />
                <Text numberOfLines={1} style={[styles.toolbarText, styles.flex, { color: c.text }]}>
                  {isThreadListOpen ? 'Your conversations' : messages.length ? currentThreadTitle : 'Chat history'}
                </Text>
                <ChevronDown size={14} color={c.mutedText} style={isThreadListOpen ? { transform: [{ rotate: '180deg' }] } : undefined} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Start new chat" disabled={!canSend}
                accessibilityState={{ disabled: !canSend }} onPress={() => { setInputValue(''); void startNewChat(); }}
                style={({ pressed }) => [styles.newChatButton, { backgroundColor: pressed ? c.accentSoft : 'transparent', opacity: canSend ? 1 : 0.45 }]}>
                <Plus size={18} color={c.accent} /><Text style={[styles.toolbarText, { color: c.accent }]}>New chat</Text>
              </Pressable>
            </View>

            {isThreadListOpen ? (
              <View style={styles.flex}>
                <FlatList data={threads} keyExtractor={(item) => item.id} contentContainerStyle={styles.historyContent}
                  ListHeaderComponent={<Text style={[styles.eyebrow, { color: c.mutedText }]}>PICK UP WHERE YOU LEFT OFF</Text>}
                  ListEmptyComponent={<View style={styles.historyEmpty}><Illustration name="start" size={140} /><Text style={[styles.promptTitle, { color: c.text }]}>A fresh start</Text><Text style={[styles.body, { color: c.mutedText }]}>Your conversations will appear here.</Text></View>}
                  renderItem={({ item }) => (
                    <Pressable accessibilityRole="button" accessibilityState={{ selected: item.id === currentThreadId, disabled: !canSend }}
                      disabled={!canSend} onPress={() => { setInputValue(''); void switchThread(item.id); }}
                      style={({ pressed }) => [styles.threadRow, { backgroundColor: item.id === currentThreadId || pressed ? c.accentSoft : c.surface, borderColor: c.border }]}>
                      <MessageCircle size={20} color={item.id === currentThreadId ? c.accent : c.mutedText} />
                      <View style={styles.flex}>
                        <Text style={[styles.promptTitle, { color: c.text }]} numberOfLines={2}>{item.title}</Text>
                        {item.last_message_at ? <Text style={[styles.detail, { color: c.mutedText }]}>{formatThreadDate(item.last_message_at)}</Text> : null}
                      </View>
                      {item.id === currentThreadId ? <Check size={18} color={c.accent} /> : <ChevronRight size={18} color={c.mutedText} />}
                    </Pressable>
                  )}
                />
                {currentThreadId ? <Pressable accessibilityRole="button" accessibilityLabel="Archive current chat" disabled={!canSend}
                  onPress={() => { void archiveCurrentThread(); }} style={[styles.archiveButton, { borderTopColor: c.border, opacity: canSend ? 1 : 0.45 }]}>
                  <Archive size={17} color={c.mutedText} /><Text style={[styles.toolbarText, { color: c.mutedText }]}>Archive current chat</Text>
                </Pressable> : null}
              </View>
            ) : (
              <View style={styles.flex}>
                <ScrollView ref={scrollRef} style={styles.flex}
                  contentContainerStyle={[styles.messagesContent, messages.length === 0 && styles.welcomeContent, compact && { paddingVertical: spacing.md }]}
                  keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" showsVerticalScrollIndicator={compact}
                  onContentSizeChange={() => { if (followLatest.current && messages.length) scrollRef.current?.scrollToEnd({ animated: true }); }}
                  onLayout={() => { if (followLatest.current && messages.length) scrollRef.current?.scrollToEnd({ animated: false }); }}
                  onScroll={({ nativeEvent: { contentOffset, contentSize, layoutMeasurement } }) => {
                    const nearEnd = contentSize.height - layoutMeasurement.height - contentOffset.y < 100;
                    followLatest.current = nearEnd;
                    setShowLatest(!nearEnd && messages.length > 0);
                  }} scrollEventThrottle={100}>
                  {messages.length === 0 && !isLoading ? (
                    <View style={[styles.welcome, compact && { paddingTop: 0 }]}>
                      <View style={[styles.welcomeIntro, compact && { gap: spacing.sm, marginBottom: spacing.xs }]}><Illustration name="filo" size={compact ? 64 : 104} />
                        <Text style={[styles.eyebrow, { color: c.accent }]}>IN YOUR CORNER. EVERY DAY.</Text>
                        <Text accessibilityRole="header" style={[styles.welcomeTitle, { color: c.text }, compact && { fontSize: 30, lineHeight: 36 }]}>
                          A LITTLE GUIDANCE.{'\n'}<Text style={{ color: c.accent }}>A STRONGER YOU.</Text>
                        </Text>
                        <Text style={[styles.body, { color: c.mutedText }]}>Training, food, or a fresh perspective.{'\n'}Let’s find your next step.</Text>
                      </View>
                      <Pressable accessibilityRole="button" accessibilityLabel="Find my focus. What should I focus on today?" disabled={!canSend}
                        accessibilityState={{ disabled: !canSend }} onPress={() => void submit('What should I focus on today?')}
                        style={({ pressed }) => [styles.featuredPrompt, { backgroundColor: c.accentSoft, borderColor: c.nav.edge, opacity: !canSend ? 0.45 : pressed ? 0.7 : 1 }]}>
                        <View style={[styles.promptIcon, { backgroundColor: c.primary }]}><Target size={22} color={c.primaryText} strokeWidth={1.8} /></View>
                        <View style={styles.flex}><Text style={[styles.promptTitle, { color: c.text }]}>Find my focus</Text><Text style={[styles.detail, { color: c.mutedText }]}>What should I work on today?</Text></View>
                        <ArrowUpRight size={20} color={c.accent} />
                      </Pressable>
                      <View style={[styles.promptList, { backgroundColor: c.surface, borderColor: c.border }]}>
                        {PROMPTS.map(({ icon: Icon, title, detail, message }, index) => (
                          <Pressable key={title} accessibilityRole="button" accessibilityState={{ disabled: !canSend }} disabled={!canSend}
                            onPress={() => void submit(message)}
                            style={({ pressed }) => [styles.promptRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth }, { borderColor: c.border, opacity: !canSend ? 0.45 : pressed ? 0.6 : 1 }]}>
                            <Icon size={21} strokeWidth={1.7} color={c.accent} />
                            <View style={styles.flex}><Text style={[styles.promptTitle, { color: c.text }]}>{title}</Text><Text style={[styles.detail, { color: c.mutedText }]}>{detail}</Text></View>
                            <ChevronRight size={16} color={c.mutedText} />
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ) : messages.map((message, index) => message.role === 'user' ? (
                    <View key={`user-${index}`} style={[styles.userBubble, { backgroundColor: c.accentSoft, borderColor: c.nav.edge }]}>
                      <Text selectable style={[styles.messageText, { color: c.text }]}>{message.content}</Text>
                    </View>
                  ) : (
                    <View key={`assistant-${index}`} style={styles.assistantMessage}>
                      <View style={styles.author}><FiloMark size={28} /><Text style={[styles.authorName, { color: c.accent }]}>Filo</Text></View>
                      <Markdown style={{
                        body: { color: c.text, fontFamily: t.weight.regular, fontSize: 15, lineHeight: 24 },
                        paragraph: { marginTop: 0, marginBottom: 12 },
                        strong: { fontFamily: t.weight.bold },
                        heading1: { fontFamily: t.weight.bold, fontSize: 24, lineHeight: 30, marginVertical: 12 },
                        heading2: { fontFamily: t.weight.bold, fontSize: 20, lineHeight: 27, marginVertical: 10 },
                        heading3: { fontFamily: t.weight.semibold, fontSize: 17, lineHeight: 24, marginVertical: 8 },
                        bullet_list: { marginBottom: 12 }, list_item: { marginVertical: 3 },
                        link: { color: c.accent }, blockquote: { backgroundColor: c.accentSoft, borderColor: c.accent },
                        code_inline: { backgroundColor: c.surface, color: c.text },
                        fence: { backgroundColor: c.surface, color: c.text, borderColor: c.border },
                        code_block: { backgroundColor: c.surface, color: c.text, borderColor: c.border },
                        table: { borderColor: c.border }, tr: { borderColor: c.border },
                        hr: { backgroundColor: c.border },
                      }}>{message.content}</Markdown>
                    </View>
                  ))}
                  {isLoading || isSending ? <View accessibilityLiveRegion="polite" style={styles.thinking}>
                    <FiloMark size={28} /><BrandLoader size="small" color={c.accent} /><Text style={[styles.detail, { color: c.mutedText }]}>Filo is thinking…</Text>
                  </View> : null}
                </ScrollView>
                {showLatest ? <Pressable accessibilityRole="button" accessibilityLabel="Jump to latest message" onPress={scrollToLatest}
                  style={[styles.latestButton, { backgroundColor: c.card, borderColor: c.border }]}><ChevronDown size={16} color={c.accent} /><Text style={[styles.detail, { color: c.text }]}>Latest reply</Text></Pressable> : null}
              </View>
            )}

            {!isThreadListOpen ? <View style={[styles.composer, { backgroundColor: c.background, borderTopColor: c.border }]}>
              {!isOnline ? <View accessibilityLiveRegion="polite" style={styles.offlineNote}><WifiOff size={15} color={c.mutedText} /><Text style={[styles.detail, styles.flex, { color: c.mutedText }]}>You’re offline. Reconnect to chat with Filo.</Text></View> : null}
              <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: inputFocused ? c.accent : c.border }]}>
                <TextInput accessibilityLabel="Message Filo" multiline placeholder="What’s on your mind?" placeholderTextColor={c.mutedText}
                  style={[styles.input, { color: c.text, height: inputHeight }]} value={inputValue} selectionColor={c.accent}
                  onContentSizeChange={({ nativeEvent }) => setInputHeight(Math.max(44, Math.min(120, nativeEvent.contentSize.height)))}
                  onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
                  onChangeText={(value) => setInputValue(sanitizeGeneralText(value, MAX_LONG_TEXT))} maxLength={MAX_LONG_TEXT} />
                <Pressable accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: !canSend || !inputValue.trim() }}
                  disabled={!canSend || !inputValue.trim()} onPress={() => void submit(inputValue, true)}
                  style={({ pressed }) => [styles.sendButton, { backgroundColor: canSend && inputValue.trim() ? c.primary : c.border, opacity: pressed ? 0.7 : 1 }]}>
                  <ArrowUp size={22} strokeWidth={2.2} color={canSend && inputValue.trim() ? c.primaryText : c.mutedText} />
                </Pressable>
              </View>
              <Text style={[styles.composerHint, { color: c.mutedText }]}>A little support for your everyday progress.</Text>
            </View> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function formatThreadDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalLayout: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  panel: { width: '100%', maxWidth: 600, height: '100%', flexShrink: 1, borderWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], overflow: 'hidden' },
  grabber: { width: 32, height: 4, borderRadius: radii.pill, alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { fontFamily: t.weight.bold, fontSize: 24, letterSpacing: -0.8 },
  headerSub: { fontFamily: t.weight.regular, fontSize: 12, marginTop: 2 },
  iconButton: { width: 44, height: 44, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  historyButton: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, minHeight: 44, borderRadius: radii.md },
  toolbarText: { fontFamily: t.weight.semibold, fontSize: 12 },
  newChatButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44, paddingHorizontal: spacing.sm, borderRadius: radii.md },
  messagesContent: { flexGrow: 1, padding: spacing.lg, gap: spacing.xl },
  welcomeContent: { gap: 0 },
  welcome: { flex: 1, justifyContent: 'center', paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.md },
  welcomeIntro: { gap: spacing.md, marginBottom: spacing.sm },
  eyebrow: { fontFamily: t.weight.bold, fontSize: t.size.micro, letterSpacing: 1.6, lineHeight: 16 },
  welcomeTitle: { ...t.display, fontSize: 38, lineHeight: 44, letterSpacing: -0.4 },
  body: { fontFamily: t.weight.regular, fontSize: 14, lineHeight: 22 },
  featuredPrompt: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, minHeight: 84, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth },
  promptIcon: { width: 42, height: 42, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  promptTitle: { fontFamily: t.weight.semibold, fontSize: 14, lineHeight: 20 },
  detail: { fontFamily: t.weight.regular, fontSize: 12, lineHeight: 18, marginTop: 2 },
  promptList: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.base },
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, minHeight: 66 },
  userBubble: { alignSelf: 'flex-end', maxWidth: '88%', paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderRadius: radii.xl, borderBottomRightRadius: spacing.xs, borderWidth: StyleSheet.hairlineWidth },
  messageText: { fontFamily: t.weight.regular, fontSize: 15, lineHeight: 23 },
  assistantMessage: { gap: spacing.md },
  author: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  authorName: { fontFamily: t.weight.semibold, fontSize: 12 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  latestButton: { position: 'absolute', bottom: spacing.sm, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44, paddingHorizontal: spacing.base, borderRadius: radii.pill, borderWidth: 1 },
  composer: { paddingHorizontal: spacing.base, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  inputWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.sm, borderRadius: radii.xl, borderWidth: 1 },
  input: { flex: 1, fontFamily: t.weight.regular, fontSize: 15, paddingHorizontal: spacing.sm, paddingVertical: spacing.md, minHeight: 44, maxHeight: 120 },
  sendButton: { width: 44, height: 44, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  composerHint: { fontFamily: t.weight.regular, fontSize: t.size.micro, lineHeight: 16, textAlign: 'center', marginTop: spacing.sm },
  offlineNote: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.sm },
  historyContent: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  threadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, minHeight: 76 },
  historyEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  archiveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 52, gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
});
