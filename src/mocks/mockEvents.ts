import { addMinutes } from "date-fns";
import { nanoid } from "nanoid/non-secure";

import type { StreamEvent } from "@/store/types/dashboard";
import { payments, serviceMetrics } from "@/mocks/data/fixtures";

export type EventsSubscriber = (event: StreamEvent) => void;

class MockEventsEmitter {
  private subscribers = new Set<EventsSubscriber>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private pointer = 0;

  public subscribe(cb: EventsSubscriber) {
    this.subscribers.add(cb);
    if (!this.timer) {
      this.start();
    }
  }

  public unsubscribe(cb: EventsSubscriber) {
    this.subscribers.delete(cb);
    if (this.subscribers.size === 0) {
      this.stop();
    }
  }

  public unsubscribeAll() {
    this.subscribers.clear();
    this.stop();
  }

  private start() {
    this.timer = setInterval(() => {
      const payment = payments[this.pointer % payments.length];
      const service = serviceMetrics[this.pointer % serviceMetrics.length];
      const timestamp = addMinutes(new Date(payment.updatedAt), this.pointer % 15).toISOString();

      const paymentEvent: StreamEvent = {
        id: nanoid(),
        type: "payment.updated",
        payload: {
          ...payment,
          status: this.pointer % 7 === 0 ? "AUTHORIZED" : payment.status,
          updatedAt: timestamp,
        },
        occurredAt: timestamp,
      };

      const serviceEvent: StreamEvent = {
        id: nanoid(),
        type: "service.metric",
        payload: {
          ...service,
          latencyP95: service.latencyP95 + (this.pointer % 5) * 15,
          errorRate: service.errorRate + (this.pointer % 3) * 0.01,
          updatedAt: timestamp,
        },
        occurredAt: timestamp,
      };

      this.subscribers.forEach((cb) => {
        cb(paymentEvent);
        cb(serviceEvent);
      });
      this.pointer += 1;
    }, 5000);
  }

  private stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const mockEventsEmitter = new MockEventsEmitter();
