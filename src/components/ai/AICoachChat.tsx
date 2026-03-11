import React, { useEffect, useRef, useState } from 'react';
import {
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
import { Send, Sparkles, User, X } from 'lucide-react-native';

import { useAICoach } from '@/src/providers/AICoachProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { sanitizeGeneralText, MAX_LONG_TEXT } from '@/src/lib/validators';

const SUGGESTED_PROMPTS = ['How\'s my progress looking?', 'What should I focus on today?', 'Any tips for recovery?'];

export function AICoachChat() {
  const palette = useThemeColors();
  const scrollRef = useRef<ScrollView>(null);
  const { user, avatarUrl } = useAuth();
  const { messages, isOpen, isLoading, toggleChat, sendMessage, clearHistory } = useAICoach();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timeout);
  }, [messages, isOpen, isLoading]);

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
            <View style={[styles.header, { borderColor: palette.border }]}> 
              <View style={styles.headerLeft}>
                <View style={[styles.botIcon, { backgroundColor: `${palette.primary}22` }]}> 
                  <Sparkles color={palette.primary} size={16} />
                </View>
                <View>
                  <Text style={[styles.headerTitle, { color: palette.text }]}>FitNyx Coach</Text>
                  <Text style={[styles.headerSub, { color: palette.mutedText }]}>AI Fitness Expert</Text>
                </View>
              </View>

              <View style={styles.headerActions}>
                <Pressable onPress={clearHistory}>
                  <Text style={[styles.clearText, { color: palette.mutedText }]}>Clear</Text>
                </Pressable>
                <Pressable onPress={toggleChat} style={styles.closeBtn}>
                  <X color={palette.text} size={16} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.messagesWrap}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyTitle, { color: palette.text }]}>Hey, I\'m your coach.</Text>
                  <Text style={[styles.emptySub, { color: palette.mutedText }]}>Ask me anything about training, nutrition, or recovery.</Text>
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
                        <Sparkles color={palette.primary} size={14} />
                      </View>
                    )}

                    <View
                      style={[
                        styles.bubble,
                        {
                          backgroundColor: message.role === 'user' ? palette.primary : palette.card,
                        },
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
                          <Text style={[styles.avatarInitial, { color: palette.primary }]}>
                            {(user?.email?.charAt(0) || 'U').toUpperCase()}
                          </Text>
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
                    <Sparkles color={palette.primary} size={14} />
                  </View>
                  <View style={[styles.bubble, styles.bubbleAssistant, { backgroundColor: palette.card }]}> 
                    <Text style={{ color: palette.mutedText }}>Thinking...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={[styles.inputWrap, { borderColor: palette.border }]}> 
              <TextInput
                multiline
                numberOfLines={3}
                placeholder="What\'s on your mind?"
                placeholderTextColor={palette.mutedText}
                style={[styles.input, { backgroundColor: palette.card, color: palette.text, borderColor: palette.border }]}
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
    gap: 10,
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
    gap: 10,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  messagesWrap: {
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
  avatarInitial: {
    fontSize: 12,
    fontWeight: '700',
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
