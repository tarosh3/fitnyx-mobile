import {
  Archive,
  ChevronDown,
  History,
  MessageSquarePlus,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/src/hooks/useThemeColors';
import { MAX_LONG_TEXT, sanitizeGeneralText } from '@/src/lib/validators';
import { useAICoach } from '@/src/providers/AICoachProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { elevation, radii, spacing, type as t } from '@/src/styles/tokens';

const SCREEN_H = Dimensions.get('window').height;

const SUGGESTED_PROMPTS = [
  { icon: '💪', text: "How's my progress?" },
  { icon: '🎯', text: 'What should I focus on today?' },
  { icon: '🍳', text: 'Quick high-protein meal idea?' },
  { icon: '🧘', text: 'Recovery tips' },
];

export function AICoachChat() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { user, avatarUrl } = useAuth();
  const {
    threads,
    currentThreadId,
    currentThreadTitle,
    messages,
    isOpen,
    isLoading,
    isThreadListOpen,
    toggleChat,
    sendMessage,
    startNewChat,
    switchThread,
    archiveCurrentThread,
    toggleThreadList,
    loadThreads,
  } = useAICoach();
  const [inputValue, setInputValue] = useState('');
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates?.height ?? 0));
    const hideSub = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(timeout);
  }, [messages, isOpen, isLoading, kbHeight]);

  useEffect(() => {
    if (isOpen) loadThreads();
  }, [isOpen]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={isOpen}
      onRequestClose={toggleChat}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={toggleChat} />
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View
            style={[
              styles.panel,
              {
                backgroundColor: c.card,
                borderColor: c.border,
                paddingBottom: kbHeight > 0 ? spacing.sm : Math.max(insets.bottom, spacing.md),
                marginBottom: kbHeight,
                height: Math.max(SCREEN_H * 0.88 - kbHeight, SCREEN_H * 0.45),
              },
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: c.border }]} />

            {/* Header */}
            <View style={[styles.header, { borderColor: c.border }]}>
              <Pressable onPress={toggleThreadList} style={styles.headerLeft}>
                <View style={[styles.botAvatar, { backgroundColor: `${c.primary}1A`, borderColor: c.primary }]}>
                  <LottieView
                    source={require('@/assets/animations/chatbot.json')}
                    autoPlay
                    loop
                    style={{ width: 28, height: 28 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>
                      {currentThreadTitle || 'Filo'}
                    </Text>
                    <ChevronDown color={c.mutedText} size={14} />
                  </View>
                  <View style={styles.subRow}>
                    <View style={[styles.statusDot, { backgroundColor: c.success }]} />
                    <Text style={[styles.headerSub, { color: c.mutedText }]} numberOfLines={1}>
                      {threads.length > 0 ? `${threads.length} chat${threads.length === 1 ? '' : 's'}` : 'AI Fitness Coach'}
                    </Text>
                  </View>
                </View>
              </Pressable>

              <View style={styles.headerActions}>
                <Pressable onPress={startNewChat} hitSlop={8} style={[styles.iconBtn, { backgroundColor: `${c.primary}1A` }]}>
                  <MessageSquarePlus color={c.primary} size={18} strokeWidth={2} />
                </Pressable>
                {currentThreadId ? (
                  <Pressable onPress={archiveCurrentThread} hitSlop={8} style={[styles.iconBtn, { backgroundColor: c.surface }]}>
                    <Archive color={c.mutedText} size={16} strokeWidth={2} />
                  </Pressable>
                ) : null}
                <Pressable onPress={toggleChat} hitSlop={8} style={[styles.iconBtn, { backgroundColor: c.surface }]}>
                  <X color={c.text} size={16} strokeWidth={2} />
                </Pressable>
              </View>
            </View>

            {/* Thread list drawer */}
            {isThreadListOpen ? (
              <View style={[styles.threadDrawer, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.threadDrawerHead}>
                  <View style={styles.rowGap}>
                    <History color={c.mutedText} size={14} />
                    <Text style={[styles.threadDrawerLabel, { color: c.mutedText }]}>RECENT CHATS</Text>
                  </View>
                  <Pressable
                    onPress={startNewChat}
                    style={[styles.newChatBtn, { backgroundColor: c.primary }]}
                  >
                    <MessageSquarePlus color={c.primaryText} size={12} strokeWidth={2.4} />
                    <Text style={[styles.newChatBtnText, { color: c.primaryText }]}>NEW</Text>
                  </Pressable>
                </View>
                <FlatList
                  data={threads}
                  keyExtractor={(item) => item.id}
                  style={{ maxHeight: 220 }}
                  ItemSeparatorComponent={() => (
                    <View style={[styles.separator, { backgroundColor: c.border }]} />
                  )}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => switchThread(item.id)}
                      style={[
                        styles.threadRow,
                        item.id === currentThreadId && { backgroundColor: `${c.primary}11` },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={[
                            styles.threadRowText,
                            { color: item.id === currentThreadId ? c.primary : c.text },
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        {item.last_message_at ? (
                          <Text style={[styles.threadDate, { color: c.mutedText }]}>
                            {formatThreadDate(item.last_message_at)}
                          </Text>
                        ) : null}
                      </View>
                      {item.id === currentThreadId ? (
                        <View style={[styles.activeDot, { backgroundColor: c.primary }]} />
                      ) : null}
                    </Pressable>
                  )}
                />
              </View>
            ) : null}

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={styles.messages}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <View style={[styles.heroAvatar, { borderColor: c.primary }]}>
                    <LottieView
                      source={require('@/assets/animations/chatbot.json')}
                      autoPlay
                      loop
                      style={{ width: 92, height: 92 }}
                    />
                  </View>
                  <Text style={[styles.emptyEyebrow, { color: c.primary }]}>FILO · YOUR AI COACH</Text>
                  <Text style={[styles.emptyTitle, { color: c.text }]}>How can I help you today?</Text>
                  <Text style={[styles.emptySub, { color: c.mutedText }]}>
                    Ask anything about training, nutrition, or recovery.
                  </Text>

                  <View style={styles.promptGrid}>
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <Pressable
                        key={prompt.text}
                        onPress={() => sendMessage(prompt.text)}
                        style={[styles.promptCard, { backgroundColor: c.surface, borderColor: c.border }]}
                      >
                        <Text style={styles.promptIcon}>{prompt.icon}</Text>
                        <Text style={[styles.promptText, { color: c.text }]} numberOfLines={2}>
                          {prompt.text}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
                messages.map((message, index) => (
                  <View
                    key={`${message.role}-${index}`}
                    style={[
                      styles.row,
                      message.role === 'user' ? styles.rowUser : styles.rowAssistant,
                    ]}
                  >
                    {message.role === 'assistant' ? (
                      <View style={[styles.msgAvatar, { backgroundColor: `${c.primary}1A` }]}>
                        <Sparkles color={c.primary} size={14} strokeWidth={2.2} />
                      </View>
                    ) : null}

                    <View
                      style={[
                        styles.bubble,
                        message.role === 'user'
                          ? { backgroundColor: c.primary, borderTopRightRadius: radii.sm }
                          : { backgroundColor: c.surface, borderTopLeftRadius: radii.sm, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth },
                      ]}
                    >
                      {message.role === 'assistant' ? (
                        <Markdown
                          style={{
                            body: { color: c.text, fontSize: t.size.sm, lineHeight: 21, margin: 0, fontFamily: t.weight.regular },
                            paragraph: { marginTop: 0, marginBottom: 6 },
                            strong: { fontFamily: t.weight.bold, color: c.text },
                            em: { fontFamily: t.weight.medium },
                            bullet_list: { marginVertical: 4 },
                            list_item: { marginVertical: 2 },
                          }}
                        >
                          {message.content}
                        </Markdown>
                      ) : (
                        <Text style={[styles.userMessageText, { color: c.primaryText }]}>
                          {message.content}
                        </Text>
                      )}
                    </View>

                    {message.role === 'user' ? (
                      <View style={[styles.msgAvatar, { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 }]}>
                        {avatarUrl ? (
                          <Image source={{ uri: avatarUrl }} style={styles.msgAvatarImg} />
                        ) : (
                          <User color={c.mutedText} size={14} strokeWidth={2} />
                        )}
                      </View>
                    ) : null}
                  </View>
                ))
              )}

              {isLoading ? <TypingIndicator c={c} /> : null}
            </ScrollView>

            {/* Input */}
            <View style={[styles.inputBar, { borderColor: c.border }]}>
              <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
                <TextInput
                  multiline
                  placeholder="Message Filo…"
                  placeholderTextColor={c.mutedText}
                  style={[styles.input, { color: c.text }]}
                  value={inputValue}
                  onChangeText={(v) => setInputValue(sanitizeGeneralText(v, MAX_LONG_TEXT))}
                  maxLength={MAX_LONG_TEXT}
                />
                <Pressable
                  onPress={handleSend}
                  disabled={isLoading || !inputValue.trim()}
                  style={[
                    styles.sendBtn,
                    {
                      backgroundColor: inputValue.trim() && !isLoading ? c.primary : `${c.primary}33`,
                    },
                  ]}
                >
                  <Send
                    color={inputValue.trim() && !isLoading ? c.primaryText : c.mutedText}
                    size={18}
                    strokeWidth={2.2}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TypingIndicator({ c }: { c: ReturnType<typeof useThemeColors> }) {
  const d1 = useSharedValue(0.4);
  const d2 = useSharedValue(0.4);
  const d3 = useSharedValue(0.4);

  useEffect(() => {
    const make = () =>
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.4, { duration: 400 })
        ),
        -1,
        false
      );
    d1.value = make();
    setTimeout(() => (d2.value = make()), 130);
    setTimeout(() => (d3.value = make()), 260);
  }, [d1, d2, d3]);

  const a1 = useAnimatedStyle(() => ({ opacity: d1.value, transform: [{ scale: 0.7 + d1.value * 0.6 }] }));
  const a2 = useAnimatedStyle(() => ({ opacity: d2.value, transform: [{ scale: 0.7 + d2.value * 0.6 }] }));
  const a3 = useAnimatedStyle(() => ({ opacity: d3.value, transform: [{ scale: 0.7 + d3.value * 0.6 }] }));

  return (
    <View style={[styles.row, styles.rowAssistant]}>
      <View style={[styles.msgAvatar, { backgroundColor: `${c.primary}1A` }]}>
        <Sparkles color={c.primary} size={14} strokeWidth={2.2} />
      </View>
      <View
        style={[
          styles.bubble,
          { backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: radii.sm },
          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 14 },
        ]}
      >
        <Animated.View style={[styles.typingDot, { backgroundColor: c.primary }, a1]} />
        <Animated.View style={[styles.typingDot, { backgroundColor: c.primary }, a2]} />
        <Animated.View style={[styles.typingDot, { backgroundColor: c.primary }, a3]} />
      </View>
    </View>
  );
}

function formatThreadDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  panel: {
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...elevation.lg,
  },
  grabber: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  botAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontFamily: t.weight.bold,
    fontSize: t.size.body,
    maxWidth: 180,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerSub: {
    fontFamily: t.weight.medium,
    fontSize: t.size.micro,
    letterSpacing: t.tracking.wide,
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadDrawer: {
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  threadDrawerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowGap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  threadDrawerLabel: {
    fontFamily: t.weight.bold,
    fontSize: t.size.micro,
    letterSpacing: t.tracking.eyebrow,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  newChatBtnText: {
    fontFamily: t.weight.bold,
    fontSize: t.size.micro,
    letterSpacing: t.tracking.wide,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md,
  },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  threadRowText: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.sm,
  },
  threadDate: {
    fontFamily: t.weight.medium,
    fontSize: t.size.micro,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.base,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xl,
  },
  heroAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    marginBottom: spacing.sm,
  },
  emptyEyebrow: {
    fontFamily: t.weight.extrabold,
    fontSize: t.size.micro,
    letterSpacing: t.tracking.eyebrow,
    textTransform: 'uppercase',
  },
  emptyTitle: {
    fontFamily: t.weight.bold,
    fontSize: t.size.h2,
    letterSpacing: t.tracking.tight,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  emptySub: {
    fontFamily: t.weight.regular,
    fontSize: t.size.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  promptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    width: '100%',
    paddingHorizontal: spacing.xs,
  },
  promptCard: {
    flexGrow: 1,
    flexBasis: '46%',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    minHeight: 80,
  },
  promptIcon: {
    fontSize: 20,
  },
  promptText: {
    fontFamily: t.weight.semibold,
    fontSize: t.size.sm,
    lineHeight: 19,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  msgAvatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.xl,
  },
  userMessageText: {
    fontFamily: t.weight.medium,
    fontSize: t.size.sm,
    lineHeight: 21,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  inputBar: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontFamily: t.weight.regular,
    fontSize: t.size.body,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    maxHeight: 120,
    minHeight: 40,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
