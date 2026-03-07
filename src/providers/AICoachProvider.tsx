import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { fetchWithAuth } from '@/src/lib/api';
import { supabase } from '@/src/lib/supabase';

export type AICoachMessage = {
  role: 'user' | 'assistant';
  content: string;
};

interface AICoachContextType {
  messages: AICoachMessage[];
  isOpen: boolean;
  isLoading: boolean;
  isCentered: boolean;
  toggleChat: () => void;
  openCenteredChat: () => void;
  sendMessage: (text: string) => Promise<void>;
  clearHistory: () => void;
}

const AICoachContext = createContext<AICoachContextType | undefined>(undefined);

export function AICoachProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<AICoachMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCentered, setIsCentered] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) return;

        const history = await fetchWithAuth('/agent/history');
        const formatted = (history || []).map((message: any) => ({
          role: message.Role === 'assistant' ? 'assistant' : 'user',
          content: message.Message,
        }));

        setMessages(formatted);
      } catch (error) {
        console.error('Failed to load chat history', error);
      }
    };

    loadHistory();
  }, []);

  const toggleChat = () => {
    if (isOpen) {
      setIsOpen(false);
      setIsCentered(false);
    } else {
      setIsOpen(true);
    }
  };

  const openCenteredChat = () => {
    setIsCentered(true);
    setIsOpen(true);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: AICoachMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetchWithAuth('/agent/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });

      const assistantMessage: AICoachMessage = {
        role: 'assistant',
        content: response.response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    fetchWithAuth('/agent/history', { method: 'DELETE' })
      .then(() => setMessages([]))
      .catch((error) => {
        console.error('Failed to clear history', error);
      });
  };

  const value = useMemo(
    () => ({
      messages,
      isOpen,
      isLoading,
      isCentered,
      toggleChat,
      openCenteredChat,
      sendMessage,
      clearHistory,
    }),
    [messages, isOpen, isLoading, isCentered]
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
