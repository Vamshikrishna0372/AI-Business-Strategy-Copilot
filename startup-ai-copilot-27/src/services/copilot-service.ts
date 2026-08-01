/**
 * Copilot Service
 * Centralized API client for the AI Copilot chat engine & conversation memory.
 */

import { apiClient } from "@/lib/api-client";
import { eventBus, EVENTS } from "@/lib/events";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  is_pinned?: boolean;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface BackendConversation {
  id: string;
  startup_id: string;
  user_id: string;
  title: string;
  module?: string;
  is_pinned?: boolean;
  summary?: string;
  recent_topics?: string[];
  suggested_followups?: string[];
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface SendMessageResponse {
  assistant_message: {
    id: string;
    sender: string;
    content: string;
    timestamp: string;
    module?: string;
    is_pinned: boolean;
    metadata?: Record<string, any>;
  };
  conversation: BackendConversation;
}

export const copilotService = {
  async listConversations(skip = 0, limit = 50, search?: string): Promise<BackendConversation[]> {
    let url = `/api/v1/chat/conversations?skip=${skip}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const res = await apiClient.get<{ success: boolean; data: BackendConversation[] }>(url);
    return res?.data ?? [];
  },

  async createConversation(title = "New Conversation", module = "general"): Promise<BackendConversation> {
    const res = await apiClient.post<{ success: boolean; data: BackendConversation }>("/api/v1/chat/conversations", {
      title,
      module,
    });
    eventBus.emit(EVENTS.CHAT_UPDATED, res.data);
    return res.data;
  },

  async getConversationDetails(id: string): Promise<BackendConversation | null> {
    const res = await apiClient.get<{ success: boolean; data: BackendConversation }>(
      `/api/v1/chat/conversations/${id}`
    );
    return res?.data ?? null;
  },

  async sendMessage(conversationId: string, content: string, module = "general"): Promise<SendMessageResponse> {
    const res = await apiClient.post<{ success: boolean; data: SendMessageResponse }>(
      `/api/v1/chat/conversations/${conversationId}/messages`,
      { content, module }
    );
    eventBus.emit(EVENTS.CHAT_UPDATED, res.data);
    return res.data;
  },

  async updateConversation(id: string, updates: { title?: string; is_pinned?: boolean }): Promise<BackendConversation> {
    const res = await apiClient.patch<{ success: boolean; data: BackendConversation }>(
      `/api/v1/chat/conversations/${id}`,
      updates
    );
    eventBus.emit(EVENTS.CHAT_UPDATED, res.data);
    return res.data;
  },

  async deleteConversation(id: string): Promise<boolean> {
    const res = await apiClient.delete<{ success: boolean; data: boolean }>(`/api/v1/chat/conversations/${id}`);
    eventBus.emit(EVENTS.CHAT_UPDATED, { deleted: id });
    return res?.data ?? true;
  },

  async pinMessage(conversationId: string, messageId: string, isPinned = true): Promise<BackendConversation> {
    const res = await apiClient.post<{ success: boolean; data: BackendConversation }>(
      `/api/v1/chat/conversations/${conversationId}/messages/${messageId}/pin?is_pinned=${isPinned}`
    );
    return res.data;
  },
};
