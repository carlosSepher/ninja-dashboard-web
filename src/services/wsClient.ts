import { nanoid } from "nanoid/non-secure";

import { STREAM_MAX_RECONNECT_DELAY_MS, STREAM_RECONNECT_BASE_DELAY_MS } from "@/lib/constants";
import type { StreamEvent } from "@/store/types/dashboard";
import { mockEventsEmitter } from "@/mocks/mockEvents";

export type EventListener = (event: StreamEvent) => void;

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:4000/events";
const USE_MOCK_STREAM =
  import.meta.env.VITE_ENABLE_MSW === "true" || import.meta.env.DEV || import.meta.env.MODE === "test";

class EventsClient {
  private listeners = new Set<EventListener>();
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private shouldReconnect = true;
  private mockUnsubscribe: (() => void) | null = null;

  public connect() {
    this.shouldReconnect = true;
    if (USE_MOCK_STREAM) {
      if (!this.mockUnsubscribe) {
        const handler = (event: StreamEvent) => this.dispatch(event);
        mockEventsEmitter.subscribe(handler);
        this.mockUnsubscribe = () => mockEventsEmitter.unsubscribe(handler);
      }
      return;
    }

    this.socket = new WebSocket(WS_URL);
    this.socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as StreamEvent;
        this.dispatch(event);
      } catch (error) {
        console.error("Failed to parse event", error);
      }
    };

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.socket.onerror = () => {
      this.handleClose(true);
    };

    this.socket.onclose = () => {
      this.handleClose();
    };
  }

  public disconnect() {
    this.shouldReconnect = false;
    if (USE_MOCK_STREAM) {
      this.mockUnsubscribe?.();
      this.mockUnsubscribe = null;
      return;
    }
    this.socket?.close();
  }

  public subscribe(listener: EventListener) {
    this.listeners.add(listener);
  }

  public unsubscribe(listener: EventListener) {
    this.listeners.delete(listener);
  }

  private dispatch(event: StreamEvent) {
    this.listeners.forEach((listener) => listener(event));
  }

  private handleClose(isError = false) {
    if (!this.shouldReconnect) return;
    const jitter = Math.random() * 500;
    const backoff = Math.min(
      STREAM_MAX_RECONNECT_DELAY_MS,
      STREAM_RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts,
    );
    this.reconnectAttempts += 1;
    setTimeout(() => this.connect(), backoff + jitter);
    if (isError) {
      const errorEvent: StreamEvent = {
        id: nanoid(),
        type: "service.metric",
        payload: {
          service: "events-stream",
          status: "degraded",
          latencyP95: backoff,
          errorRate: 1,
          throughput: 0,
          updatedAt: new Date().toISOString(),
        },
        occurredAt: new Date().toISOString(),
      };
      this.dispatch(errorEvent);
    }
  }
}

export const eventsClient = new EventsClient();
