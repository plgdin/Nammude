const STORAGE_KEY = 'nammude_offline_order_queue';

export interface QueuedOrder {
  id: string;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
}

function readQueue(): QueuedOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedOrder[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedOrder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
  } catch {
    // ignore
  }
}

export const offlineQueue = {
  _reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },

  getPending(): QueuedOrder[] {
    return readQueue();
  },

  enqueue(payload: Record<string, unknown>): QueuedOrder {
    const entry: QueuedOrder = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    const q = readQueue();
    q.push(entry);
    writeQueue(q);
    return entry;
  },

  remove(id: string): void {
    writeQueue(readQueue().filter((e) => e.id !== id));
  },

  isOnline(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  },

  async flush(): Promise<{ processed: number; failed: number; remaining: number }> {
    const { orderService } = await import('./orderService');
    const queue = readQueue();
    let processed = 0;
    let failed = 0;
    const remaining: QueuedOrder[] = [];

    for (const entry of queue) {
      try {
        const res = await orderService.createOrder(entry.payload as any);
        if (res.success) {
          processed++;
        } else {
          failed++;
          entry.attempts += 1;
          remaining.push(entry);
        }
      } catch {
        failed++;
        entry.attempts += 1;
        remaining.push(entry);
      }
    }

    writeQueue(remaining);
    return { processed, failed, remaining: remaining.length };
  },
};
