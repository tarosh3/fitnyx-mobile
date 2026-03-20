import { fetchWithAuth } from '@/src/lib/api';

// --- AI Profile ---

export interface AIProfile {
  user_id: string;
  manual_memory_note: string | null;
  manual_memory_updated_at: string | null;
  fixed_context_version: number;
  live_context_version: number;
  created_at: string;
  updated_at: string;
}

export async function getAIProfile(): Promise<AIProfile> {
  return fetchWithAuth('/agent/profile');
}

export async function updateAIProfile(manualMemoryNote: string): Promise<AIProfile> {
  return fetchWithAuth('/agent/profile', {
    method: 'PUT',
    body: JSON.stringify({ manual_memory_note: manualMemoryNote }),
  });
}

// --- Threads ---

export interface AIThread {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  last_message_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  ID: string;
  UserID: string;
  ThreadID: string;
  Role: 'user' | 'assistant';
  Message: string;
  CreatedAt: string;
}

export async function listThreads(includeArchived = false): Promise<AIThread[]> {
  const qs = includeArchived ? '?include_archived=true' : '';
  return fetchWithAuth(`/agent/threads${qs}`);
}

export async function createThread(title?: string): Promise<AIThread> {
  return fetchWithAuth('/agent/threads', {
    method: 'POST',
    body: JSON.stringify({ title: title || '' }),
  });
}

export async function getThreadMessages(threadId: string): Promise<AIMessage[]> {
  return fetchWithAuth(`/agent/threads/${threadId}/messages`);
}

export async function sendThreadMessage(threadId: string, message: string): Promise<{ response: string }> {
  return fetchWithAuth(`/agent/threads/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function archiveThread(threadId: string): Promise<void> {
  return fetchWithAuth(`/agent/threads/${threadId}/archive`, {
    method: 'POST',
  });
}

export async function deleteThread(threadId: string): Promise<void> {
  return fetchWithAuth(`/agent/threads/${threadId}`, {
    method: 'DELETE',
  });
}

export async function clearThread(threadId: string): Promise<void> {
  return fetchWithAuth(`/agent/threads/${threadId}/clear`, {
    method: 'POST',
  });
}

// --- Daily Insight ---

export async function getDailyInsight(): Promise<{ insight: string }> {
  return fetchWithAuth('/agent/daily-insight');
}
