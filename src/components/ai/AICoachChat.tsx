import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
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
import LottieView from 'lottie-react-native';
import { Archive, ChevronDown, MessageSquarePlus, Send, User, X } from 'lucide-react-native';

import { useAICoach } from '@/src/providers/AICoachProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { sanitizeGeneralText, MAX_LONG_TEXT } from '@/src/lib/validators';

const SUGGESTED_PROMPTS = ['How\'s my progress looking?', 'What should I focus on today?', 'Any tips for recovery?'];

export function AICoachChat() {
  const palette = useThemeColors();
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

  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(timeout);
  }, [messages, isOpen, isLoading]);

  // Reload threads when chat opens
  useEffect(() => {
    if (isOpen) {
      loadThreads();
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  return (
    <Modal transparent animationType="fade" visible={isOpen} onRequestClose={toggleChat}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={90}
          style={styles.modalWrap}
        >
          <View style={[styles.panel, { backgroundColor: palette.background, borderColor: palette.border }]}>
            {/* Header */}
            <View style={[styles.header, { borderColor: palette.border }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.botIcon, { backgroundColor: `${palette.primary}22` }]}>
                  <LottieView
                    source={require('@/assets/animations/chatbot.json')}
                    autoPlay
                    loop
                    style={{ width: 28, height: 28 }}
                  />
                </View>
                <Pressable onPress={toggleThreadList} style={styles.titleRow}>
                  <View>
                    <Text style={[styles.headerTitle, { color: palette.text }]} numberOfLines={1}>
                      {currentThreadTitle}
                    </Text>
                    <Text style={[styles.headerSub, { color: palette.mutedText }]}>
                      {threads.length > 0 ? `${threads.length} chats` : 'AI Fitness Expert'}
                    </Text>
                  </View>
                  <ChevronDown color={palette.mutedText} size={14} style={{ marginLeft: 4 }} />
                </Pressable>
              </View>

              <View style={styles.headerActions}>
                <Pressable onPress={startNewChat} hitSlop={8}>
                  <MessageSquarePlus color={palette.primary} size={18} />
                </Pressable>
                {currentThreadId && (
                  <Pressable onPress={archiveCurrentThread} hitSlop={8}>
                    <Archive color={palette.mutedText} size={16} />
                  </Pressable>
                )}
                <Pressable onPress={toggleChat} style={styles.closeBtn}>
                  <X color={palette.text} size={16} />
                </Pressable>
              </View>
            </View>

            {/* Thread list dropdown */}
            {isThreadListOpen && (
              <View style={[styles.threadList, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Pressable
                  onPress={startNewChat}
                  style={[styles.threadRow, { borderColor: palette.border }]}
                >
                  <MessageSquarePlus color={palette.primary} size={14} />
                  <Text style={[styles.threadRowText, { color: palette.primary, fontWeight: '700' }]}>
                    New Chat
                  </Text>
                </Pressable>
                <FlatList
                  data={threads}
                  keyExtractor={(item) => item.id}
                  style={{ maxHeight: 200 }}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => switchThread(item.id)}
                      style={[
                        styles.threadRow,
                        { borderColor: palette.border },
                        item.id === currentThreadId && { backgroundColor: `${palette.primary}11` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.threadRowText,
                          { color: item.id === currentThreadId ? palette.primary : palette.text },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {item.last_message_at && (
                        <Text style={[styles.threadDate, { color: palette.mutedText }]}>
                          {formatThreadDate(item.last_message_at)}
                        </Text>
                      )}
                    </Pressable>
                  )}
                />
              </View>
            )}

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesWrap}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <LottieView
                    source={require('@/assets/animations/chatbot.json')}
                    autoPlay
                    loop
                    style={{ width: 80, height: 80, marginBottom: 8 }}
                  />
                  <Text style={[styles.emptyTitle, { color: palette.text }]}>Hey, I'm your coach.</Text>
                  <Text style={[styles.emptySub, { color: palette.mutedText }]}>
                    Ask me anything about training, nutrition, or recovery.
                  </Text>
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <Pressable
                      key={prompt}
                      onPress={() => sendMessage(prompt)}
                      style={[styles.promptBtn, { backgroundColor: palette.card, borderColor: palette.border }]}
                    >
                      <Text style={[styles.promptText, { color: palette.text }]}>{prompt}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                messages.map((message, index) => (
                  <View
                    key={`${message.role}-${index}`}
                    style={[styles.row, message.role === 'user' ? styles.rowUser : styles.rowAssistant]}
                  >
                    {message.role === 'assistant' && (
                      <View style={[styles.avatar, { backgroundColor: palette.card }]}>
                        <LottieView
                          source={require('@/assets/animations/chatbot.json')}
                          autoPlay
                          loop
                          style={{ width: 26, height: 26 }}
                        />
                      </View>
                    )}

                    <View
                      style={[
                        styles.bubble,
                        { backgroundColor: message.role === 'user' ? palette.primary : palette.card },
                        message.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                      ]}
                    >
                      {message.role === 'assistant' ? (
                        <Markdown
                          style={{
                            body: { color: palette.text, fontSize: 13, lineHeight: 19, margin: 0 },
                            paragraph: { marginTop: 0, marginBottom: 6 },
                          }}
                        >
                          {message.content}
                        </Markdown>
                      ) : (
                        <Text style={[styles.messageText, { color: palette.primaryText }]}>{message.content}</Text>
                      )}
                    </View>

                    {message.role === 'user' && (
                      <View style={[styles.avatar, { backgroundColor: `${palette.primary}33` }]}>
                        {avatarUrl || user?.user_metadata?.avatar_url ? (
                          <Image
                            source={{ uri: avatarUrl || user?.user_metadata?.avatar_url }}
                            style={styles.avatarImage}
                          />
                        ) : (
                          <User color={palette.primary} size={14} />
                        )}
                      </View>
                    )}
                  </View>
                ))
              )}

              {isLoading && (
                <View style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: palette.card }]}>
                    <LottieView
                      source={require('@/assets/animations/chatbot.json')}
                      autoPlay
                      loop
                      style={{ width: 26, height: 26 }}
                    />
                  </View>
                  <View
                    style={[
                      styles.bubble,
                      styles.bubbleAssistant,
                      { backgroundColor: palette.card, flexDirection: 'row', alignItems: 'center', gap: 6 },
                    ]}
                  >
                    <LottieView
                      source={require('@/assets/animations/chatbot.json')}
                      autoPlay
                      loop
                      style={{ width: 24, height: 24 }}
                    />
                    <Text style={{ color: palette.mutedText }}>Thinking...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View style={[styles.inputWrap, { borderColor: palette.border }]}>
              <TextInput
                multiline
                numberOfLines={3}
                placeholder="What's on your mind?"
                placeholderTextColor={palette.mutedText}
                style={[
                  styles.input,
                  { backgroundColor: palette.card, color: palette.text, borderColor: palette.border },
                ]}
                value={inputValue}
                onChangeText={(v) => setInputValue(sanitizeGeneralText(v, MAX_LONG_TEXT))}
                maxLength={MAX_LONG_TEXT}
              />
              <Pressable
                onPress={handleSend}
                disabled={isLoading || !inputValue.trim()}
                style={[styles.send, { backgroundColor: `${palette.primary}22` }]}
              >
                <Send color={palette.primary} size={15} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  modalWrap: {
    maxHeight: '90%',
  },
  panel: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: 10,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  botIcon: {
    alignItems: 'center',
    borderRadius: 10,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    maxWidth: 160,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  closeBtn: {
    padding: 4,
  },
  threadList: {
    borderBottomWidth: 1,
    maxHeight: 260,
  },
  threadRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  threadRowText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  threadDate: {
    fontSize: 10,
    fontWeight: '500',
  },
  messagesList: {
    maxHeight: Dimensions.get('window').height * 0.55,
  },
  messagesWrap: {
    flexGrow: 1,
    gap: 12,
    padding: 14,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  promptBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
  },
  promptText: {
    fontSize: 13,
    fontWeight: '500',
  },
  row: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 999,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  avatarImage: {
    width: 26,
    height: 26,
    borderRadius: 999,
  },
  bubble: {
    borderRadius: 16,
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bubbleUser: {
    borderBottomRightRadius: 6,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
  },
  inputWrap: {
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  send: {
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});
