import { describe, it, expect } from 'vitest';
import { crmService } from '@/features/crm/services/crmService';

const orgId = '11111111-1111-1111-1111-111111111111';

describe('CRM Extras: feedback, consent, promotions', () => {
  it('records feedback and walks the follow-up status flow', async () => {
    const created = await crmService.createFeedback({
      organizationId: orgId,
      rating: 4,
      comment: 'Great food, slightly slow service at peak hour.',
      channel: 'in_store',
    });
    expect(created.success).toBe(true);
    expect(created.feedback?.status).toBe('new');

    const ack = await crmService.updateFeedbackStatus(created.feedback!.id, 'acknowledged');
    expect(ack.success).toBe(true);

    const resolved = await crmService.updateFeedbackStatus(created.feedback!.id, 'resolved');
    expect(resolved.success).toBe(true);

    const list = await crmService.getFeedback(orgId);
    expect(list.find((f) => f.id === created.feedback!.id)?.status).toBe('resolved');
  });

  it('validates feedback ratings', async () => {
    const bad = await crmService.createFeedback({
      organizationId: orgId,
      rating: 9,
      comment: 'Invalid rating test comment.',
    });
    expect(bad.success).toBe(false);
  });

  it('stores explicit consent choices per customer', async () => {
    const customers = await crmService.getCustomers(orgId);
    const customer = customers[0];

    const granted = await crmService.setConsent({
      organizationId: orgId,
      customerId: customer.id,
      consentType: 'marketing_email',
      granted: true,
      source: 'crm_profile',
    });
    expect(granted.success).toBe(true);

    const consents = await crmService.getConsents(orgId, customer.id);
    expect(consents.find((c) => c.consent_type === 'marketing_email')?.granted).toBe(true);

    const revoked = await crmService.setConsent({
      organizationId: orgId,
      customerId: customer.id,
      consentType: 'marketing_email',
      granted: false,
    });
    expect(revoked.success).toBe(true);

    const after = await crmService.getConsents(orgId, customer.id);
    expect(after.find((c) => c.consent_type === 'marketing_email')?.granted).toBe(false);
  });

  it('creates promotions and validates codes against order totals', async () => {
    const promo = await crmService.createPromotion({
      organizationId: orgId,
      name: 'Festive Feast',
      code: 'fest20',
      discountType: 'percent',
      discountValue: 20,
      minOrderValue: 50,
    });
    expect(promo.success).toBe(true);
    expect(promo.promotion?.code).toBe('FEST20');

    const below = await crmService.validatePromotionCode(orgId, 'FEST20', 40);
    expect(below.valid).toBe(false);

    const ok = await crmService.validatePromotionCode(orgId, 'FEST20', 100);
    expect(ok.valid).toBe(true);
    expect(ok.discount).toBe(20);

    const paused = await crmService.togglePromotion(promo.promotion!.id, false);
    expect(paused.success).toBe(true);

    const inactive = await crmService.validatePromotionCode(orgId, 'FEST20', 100);
    expect(inactive.valid).toBe(false);
  });

  it('rejects duplicate promo codes and invalid percent values', async () => {
    const first = await crmService.createPromotion({
      organizationId: orgId,
      name: 'Dup Test',
      code: 'DUP10',
      discountType: 'percent',
      discountValue: 10,
    });
    expect(first.success).toBe(true);

    const duplicate = await crmService.createPromotion({
      organizationId: orgId,
      name: 'Dup Test Again',
      code: 'DUP10',
      discountType: 'percent',
      discountValue: 10,
    });
    expect(duplicate.success).toBe(false);

    const badPercent = await crmService.createPromotion({
      organizationId: orgId,
      name: 'Bad Percent',
      code: 'BAD150',
      discountType: 'percent',
      discountValue: 150,
    });
    expect(badPercent.success).toBe(false);
  });
});
