import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  AIThread,
  archiveThread,
  clearThread,
  createThread,
  getThreadMessages,
  listThreads,
  sendThreadMessage,
} from '@/src/lib/api/agent';
import { isAuthError } from '@/src/lib/api';
import { useAuth } from '@/src/providers/AuthProvider';

export type AICoachMessage = {
  role: 'user' | 'assistant';
  content: string;
};

interface AICoachContextType {
  // Thread state
  threads: AIThread[];
  currentThreadId: string | null;
  currentThreadTitle: string;
  messages: AICoachMessage[];

  // UI state
  isOpen: boolean;
  isLoading: boolean;
  isThreadListOpen: boolean;
  isCentered: boolean;

  // Actions
  toggleChat: () => void;
  openCenteredChat: () => void;
  sendMessage: (text: string) => Promise<void>;
  startNewChat: () => Promise<void>;
  switchThread: (threadId: string) => Promise<void>;
  archiveCurrentThread: () => Promise<void>;
  clearCurrentThread: () => Promise<void>;
  toggleThreadList: () => void;
  loadThreads: () => Promise<void>;
}

const AICoachContext = createContext<AICoachContextType | undefined>(undefined);

export function AICoachProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<AIThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCentered, setIsCentered] = useState(false);
  const [isThreadListOpen, setIsThreadListOpen] = useState(false);
  const prevUserIdRef = useRef<string | null>(null);

  // Per-thread message store — keyed by threadId, eliminates cross-thread races.
  // Only the slice for currentThreadId is exposed via context as `messages`.
  const messagesByThread = useRef<Record<string, AICoachMessage[]>>({});

  // A counter that bumps whenever the *current thread's* messages change,
  // so React sees a new value and re-renders consumers.
  const [msgVersion, setMsgVersion] = useState(0);
  const bumpMsgVersion = useCallback(() => setMsgVersion((v) => v + 1), []);

  // Helpers that always operate on a specific threadId
  const getMessages = useCallback((threadId: string): AICoachMessage[] => {
    return messagesByThread.current[threadId] ?? [];
  }, []);

  const setMessagesFor = useCallback(
    (threadId: string, updater: AICoachMessage[] | ((prev: AICoachMessage[]) => AICoachMessage[])) => {
      const prev = messagesByThread.current[threadId] ?? [];
      const next = typeof updater === 'function' ? updater(prev) : updater;
      messagesByThread.current[threadId] = next;
      bumpMsgVersion();
    },
    [bumpMsgVersion]
  );

  const clearAllMessages = useCallback(() => {
    messagesByThread.current = {};
    bumpMsgVersion();
  }, [bumpMsgVersion]);

  // Derived: messages for the currently-selected thread
  const messages = useMemo(() => {
    // msgVersion is in the dep array purely to trigger re-derive on writes
    void msgVersion;
    if (!currentThreadId) return [];
    return messagesByThread.current[currentThreadId] ?? [];
  }, [currentThreadId, msgVersion]);

  // React to user changes: clear on sign-out, reload on sign-in / account switch
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    const prevUserId = prevUserIdRef.current;
    prevUserIdRef.current = currentUserId;

    if (!currentUserId) {
      clearAllMessages();
      setThreads([]);
      setCurrentThreadId(null);
      setIsOpen(false);
      setIsCentered(false);
      setIsThreadListOpen(false);
      return;
    }

    if (prevUserId === currentUserId) return;

    // Load threads for new user
    loadThreadsInternal();
  }, [user?.id]);

  const loadThreadsInternal = async (autoSelect = true) => {
    try {
      const threadList = await listThreads();
      setThreads(threadList || []);

      if (!autoSelect) return;

      setCurrentThreadId((currentId) => {
        // If we already have a selected thread that still exists in the list, keep it
        if (currentId && threadList?.some((t) => t.id === currentId)) {
          return currentId;
        }
        // Otherwise, auto-select most recent
        if (threadList && threadList.length > 0) {
          const mostRecent = threadList[0];
          loadThreadMessagesFor(mostRecent.id);
          return mostRecent.id;
        }
        clearAllMessages();
        return null;
      });
    } catch (error) {
      if (isAuthError(error)) return; // signed out elsewhere — handled globally
      console.warn('Failed to load threads', error);
    }
  };

  const loadThreadMessagesFor = async (threadId: string) => {
    try {
      const msgs = await getThreadMessages(threadId);
      const formatted = (msgs || []).map((msg: any) => ({
        role: msg.Role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: msg.Message,
      }));
      setMessagesFor(threadId, formatted);
    } catch (error) {
      setMessagesFor(threadId, []);
      if (isAuthError(error)) return; // signed out elsewhere — handled globally
      console.warn('Failed to load thread messages', error);
    }
  };

  const loadThreads = useCallback(async () => {
    await loadThreadsInternal();
  }, []);

  const toggleChat = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
      setIsCentered(false);
      setIsThreadListOpen(false);
    } else {
      setIsOpen(true);
    }
  }, [isOpen]);

  const openCenteredChat = useCallback(() => {
    setIsCentered(true);
    setIsOpen(true);
  }, []);

  const toggleThreadList = useCallback(() => {
    setIsThreadListOpen((prev) => !prev);
  }, []);

  const startNewChat = useCallback(async () => {
    try {
      const thread = await createThread();
      setMessagesFor(thread.id, []);
      setCurrentThreadId(thread.id);
      setIsThreadListOpen(false);
      setThreads((prev) => [thread, ...prev]);
    } catch (error) {
      console.error('Failed to create thread', error);
    }
  }, [setMessagesFor]);

  const switchThread = useCallback(async (threadId: string) => {
    setCurrentThreadId(threadId);
    setIsThreadListOpen(false);
    // Load messages into that thread's bucket — does not touch any other thread
    await loadThreadMessagesFor(threadId);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // If no current thread, create one first
    let threadId = currentThreadId;
    if (!threadId) {
      try {
        const thread = await createThread();
        threadId = thread.id;
        setMessagesFor(thread.id, []);
        setCurrentThreadId(thread.id);
        setThreads((prev) => [thread, ...prev]);
      } catch (error) {
        console.error('Failed to create thread', error);
        return;
      }
    }

    // Capture threadId at send time — the response is written to this thread's
    // bucket regardless of what the user navigates to while waiting.
    const targetThreadId = threadId;

    // Optimistic UI
    const userMessage: AICoachMessage = { role: 'user', content: text };
    setMessagesFor(targetThreadId, (prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendThreadMessage(targetThreadId, text);
      const assistantMessage: AICoachMessage = {
        role: 'assistant',
        content: response.response,
      };

      // Write to the target thread's bucket — safe even if the user switched away
      setMessagesFor(targetThreadId, (prev) => [...prev, assistantMessage]);

      // Refresh thread list from server (picks up title changes, ordering)
      try {
        const freshThreads = await listThreads();
        if (freshThreads) {
          setThreads(freshThreads);
        }
      } catch {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === targetThreadId
              ? { ...t, last_message_at: new Date().toISOString() }
              : t
          )
        );
      }
    } catch (error) {
      console.error('Failed to send message', error);
      setMessagesFor(targetThreadId, (prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [currentThreadId, setMessagesFor]);

  const archiveCurrentThread = useCallback(async () => {
    if (!currentThreadId) return;

    try {
      await archiveThread(currentThreadId);
      // Clean up this thread's messages
      delete messagesByThread.current[currentThreadId];
      setThreads((prev) => prev.filter((t) => t.id !== currentThreadId));
      setCurrentThreadId(null);
      bumpMsgVersion();
    } catch (error) {
      console.error('Failed to archive thread', error);
    }
  }, [currentThreadId, bumpMsgVersion]);

  const clearCurrentThread = useCallback(async () => {
    if (!currentThreadId) return;

    try {
      await clearThread(currentThreadId);
      setMessagesFor(currentThreadId, []);
    } catch (error) {
      console.error('Failed to clear thread', error);
    }
  }, [currentThreadId, setMessagesFor]);

  const currentThreadTitle = useMemo(() => {
    if (!currentThreadId) return 'New Chat';
    const thread = threads.find((t) => t.id === currentThreadId);
    return thread?.title || 'New Chat';
  }, [currentThreadId, threads]);

  const value = useMemo(
    () => ({
      threads,
      currentThreadId,
      currentThreadTitle,
      messages,
      isOpen,
      isLoading,
      isThreadListOpen,
      isCentered,
      toggleChat,
      openCenteredChat,
      sendMessage,
      startNewChat,
      switchThread,
      archiveCurrentThread,
      clearCurrentThread,
      toggleThreadList,
      loadThreads,
    }),
    [
      threads,
      currentThreadId,
      currentThreadTitle,
      messages,
      isOpen,
      isLoading,
      isThreadListOpen,
      isCentered,
      toggleChat,
      openCenteredChat,
      sendMessage,
      startNewChat,
      switchThread,
      archiveCurrentThread,
      clearCurrentThread,
      toggleThreadList,
      loadThreads,
    ]
  );

  return <AICoachContext.Provider value={value}>{children}</AICoachContext.Provider>;
}

export function useAICoach() {
  const context = useContext(AICoachContext);
  if (!context) {
    throw new Error('useAICoach must be used within AICoachProvider');
  }
  return context;
}
