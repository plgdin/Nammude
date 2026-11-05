import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { OnboardingState } from '../types';

const isMock = (): boolean => !env.isConfigured || env.isMockAuthEnabled;

let localOnboardingStore: Record<string, OnboardingState> = {
  '11111111-1111-1111-1111-111111111111': {
    organization_id: '11111111-1111-1111-1111-111111111111',
    current_step: 9,
    completed_steps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    is_completed: true,
    step_data: {
      org_name: 'Bella Italia Bistro',
      org_slug: 'bella-italia',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      branch_name: 'Main Downtown',
      selected_plan_id: 'plan-pro',
    },
  },
};

export const onboardingService = {
  async getOnboardingState(orgId: string): Promise<OnboardingState> {
    if (isMock()) {
      if (!localOnboardingStore[orgId]) {
        localOnboardingStore[orgId] = {
          organization_id: orgId,
          current_step: 1,
          completed_steps: [],
          is_completed: false,
          step_data: {},
        };
      }
      return { ...localOnboardingStore[orgId] };
    }

    try {
      const { data, error } = await (supabase.from('organization_onboarding') as any)
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return {
          organization_id: orgId,
          current_step: 1,
          completed_steps: [],
          is_completed: false,
          step_data: {},
        };
      }

      return {
        organization_id: data.organization_id,
        current_step: data.current_step,
        completed_steps: data.completed_steps || [],
        is_completed: data.is_completed,
        step_data: (data.step_data as any) || {},
      };
    } catch {
      return localOnboardingStore[orgId] || {
        organization_id: orgId,
        current_step: 1,
        completed_steps: [],
        is_completed: false,
        step_data: {},
      };
    }
  },

  async saveStep(
    orgId: string,
    step: number,
    stepData: Record<string, any>,
    markCompleted: boolean = true
  ): Promise<OnboardingState> {
    if (isMock()) {
      const current = await this.getOnboardingState(orgId);
      const newCompleted = markCompleted && !current.completed_steps.includes(step)
        ? [...current.completed_steps, step]
        : current.completed_steps;

      const isAllDone = [1, 2, 3, 4, 5, 6, 7, 8, 9].every((s) => newCompleted.includes(s));
      const updated: OnboardingState = {
        organization_id: orgId,
        current_step: step,
        completed_steps: newCompleted,
        is_completed: isAllDone,
        step_data: { ...current.step_data, ...stepData },
      };
      localOnboardingStore[orgId] = updated;
      return { ...updated };
    }

    const { error } = await (supabase.rpc as any)('save_onboarding_step', {
      p_org_id: orgId,
      p_step: step,
      p_step_data: stepData,
      p_mark_completed: markCompleted,
    });

    if (error) throw error;
    return await this.getOnboardingState(orgId);
  },

  async completeOnboarding(orgId: string): Promise<void> {
    if (isMock()) {
      if (localOnboardingStore[orgId]) {
        localOnboardingStore[orgId].is_completed = true;
        localOnboardingStore[orgId].completed_steps = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      }
      return;
    }

    const { error } = await (supabase.rpc as any)('complete_organization_onboarding', {
      p_org_id: orgId,
    });
    if (error) throw error;
  },
};
