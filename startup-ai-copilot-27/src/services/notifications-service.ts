/**
 * Notifications Service
 * Centralized client for listing, marking as read, and deleting notifications.
 */

import { apiClient } from "@/lib/api-client";
import { eventBus, EVENTS } from "@/lib/events";

export interface AppNotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export const notificationsService = {
  async listNotifications(skip = 0, limit = 50, unreadOnly = false): Promise<AppNotificationItem[]> {
    const res = await apiClient.get<{ success: boolean; data: AppNotificationItem[] }>(
      `/api/v1/notifications?skip=${skip}&limit=${limit}&unread_only=${unreadOnly}`
    );
    return res?.data ?? [];
  },

  async markRead(id: string): Promise<AppNotificationItem> {
    const res = await apiClient.patch<{ success: boolean; data: AppNotificationItem }>(
      `/api/v1/notifications/${id}/read`
    );
    eventBus.emit(EVENTS.NOTIFICATIONS_UPDATED);
    return res.data;
  },

  async markAllRead(): Promise<boolean> {
    const res = await apiClient.post<{ success: boolean; data: boolean }>("/api/v1/notifications/read-all");
    eventBus.emit(EVENTS.NOTIFICATIONS_UPDATED);
    return res?.data ?? true;
  },

  async deleteNotification(id: string): Promise<boolean> {
    const res = await apiClient.delete<{ success: boolean; data: boolean }>(`/api/v1/notifications/${id}`);
    eventBus.emit(EVENTS.NOTIFICATIONS_UPDATED);
    return res?.data ?? true;
  },
};
