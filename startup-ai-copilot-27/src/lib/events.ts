/**
 * Global Event Bus for live cross-component reactive updates.
 * Dispatches events when AI generation finishes, startup switches, or notifications change.
 */

type Listener = (data?: any) => void;

class EventBus {
  private listeners: Record<string, Listener[]> = {};

  on(event: string, fn: Listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(fn);
    return () => this.off(event, fn);
  }

  off(event: string, fn: Listener) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event]!.filter((l) => l !== fn);
  }

  emit(event: string, data?: any) {
    if (!this.listeners[event]) return;
    this.listeners[event]!.forEach((fn) => {
      try {
        fn(data);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    });
  }
}

export const eventBus = new EventBus();

export const EVENTS = {
  AI_REPORT_GENERATED: "AI_REPORT_GENERATED",
  INTERVIEW_UPDATED: "INTERVIEW_UPDATED",
  STARTUP_CHANGED: "STARTUP_CHANGED",
  NOTIFICATIONS_UPDATED: "NOTIFICATIONS_UPDATED",
  CHAT_UPDATED: "CHAT_UPDATED",
};
