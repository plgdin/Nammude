import { describe, it, expect } from 'vitest';
import { platformAdminService } from '@/features/platform/services/platformAdminService';

describe('Platform: usage records & webhook visibility', () => {
  it('returns metered usage records', async () => {
    const usage = await platformAdminService.getUsageRecords();
    expect(usage.length).toBeGreaterThan(0);
    for (const record of usage) {
      expect(record.metric).toBeTruthy();
      expect(record.quantity).toBeGreaterThanOrEqual(0);
      expect(record.period_end >= record.period_start).toBe(true);
    }
  });

  it('returns billing webhook events', async () => {
    const events = await platformAdminService.getWebhookEvents();
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.provider).toBeTruthy();
      expect(event.event_id).toBeTruthy();
      expect(['received', 'processed', 'failed']).toContain(event.status);
    }
  });

  it('filters usage records by organization', async () => {
    const usage = await platformAdminService.getUsageRecords('11111111-1111-1111-1111-111111111111');
    expect(usage.every((u) => u.organization_id === '11111111-1111-1111-1111-111111111111')).toBe(true);
  });
});
