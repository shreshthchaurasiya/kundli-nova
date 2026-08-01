import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import { supabaseAdmin } from '../config/supabase';
import { ApiError } from '../errors/ApiError';

export const getMyPlan = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Get active subscription
    const { data: subData, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // If no plan, return FREE (should be handled by trigger, but just in case)
    let planData = subData;
    if (subError || !subData) {
      planData = { plan: 'FREE', status: 'ACTIVE', expiry_date: null };
    }

    // Get today's usage
    const today = new Date().toISOString().split('T')[0];
    const { data: usageData } = await supabaseAdmin
      .from('ai_usage')
      .select('questions_used')
      .eq('user_id', userId)
      .eq('usage_date', today)
      .maybeSingle();

    const used = usageData ? usageData.questions_used : 0;
    
    let limit = 5;
    const { data: currentPlanDetails } = await supabaseAdmin
      .from('subscription_plans')
      .select('ai_limit_per_day')
      .eq('name', planData.plan)
      .eq('is_active', true)
      .single();

    if (currentPlanDetails) {
      limit = currentPlanDetails.ai_limit_per_day;
    }

    res.status(200).json({
      status: 'success',
      data: {
        subscription: planData,
        usage: {
          used,
          limit,
          remaining: Math.max(0, limit - used)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const upgradeWithWallet = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { plan } = req.body; // 'PRO' or 'ELITE'

    if (!['PRO', 'ELITE'].includes(plan)) {
      throw new ApiError(400, 'Invalid plan selected.');
    }

    const amount = plan === 'PRO' ? 199 : 499;
    const durationMonths = 1;

    const { data, error } = await supabaseAdmin.rpc('upgrade_subscription_wallet', {
      p_user_id: userId,
      p_plan: plan,
      p_amount: amount,
      p_duration_months: durationMonths
    });

    if (error) {
      throw new ApiError(400, error.message || 'Failed to upgrade using wallet.');
    }

    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getPlans = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      throw new ApiError(500, 'Failed to fetch subscription plans');
    }

    res.json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};
