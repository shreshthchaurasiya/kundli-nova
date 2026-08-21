import { supabaseAdmin } from '../config/supabase';
import { ApiError } from '../errors/ApiError';

export class AIUsageService {
  /**
   * Checks if a user has available AI questions and increments their usage if so.
   * Throws an error if the limit is reached.
   */
  static async checkAndIncrementUsage(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    // 1. Get user's active subscription
    const { data: subData, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let planName = 'FREE';
    if (!subError && subData) {
      planName = subData.plan;
    }

    // Fetch plan details to get limit
    const { data: planData } = await supabaseAdmin
      .from('subscription_plans')
      .select('ai_limit_per_day')
      .eq('name', planName)
      .eq('is_active', true)
      .single();

    const limit = planData?.ai_limit_per_day || 5;

    // 2. Get today's usage
    const today = new Date().toISOString().split('T')[0];
    
    let { data: usageData, error: usageError } = await supabaseAdmin
      .from('ai_usage')
      .select('id, questions_used')
      .eq('user_id', userId)
      .eq('usage_date', today)
      .maybeSingle();

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('Error fetching ai usage:', usageError);
      throw new ApiError(500, 'Error checking AI limits');
    }

    let questionsUsed = usageData ? usageData.questions_used : 0;

    // 3. Check limit
    if (questionsUsed >= limit) {
      throw new ApiError(403, `Daily AI Question Limit Reached. Upgrade if needed. (Limit: ${limit})`);
    }

    // 4. Increment usage
    if (usageData) {
      await supabaseAdmin
        .from('ai_usage')
        .update({ questions_used: questionsUsed + 1 })
        .eq('id', usageData.id);
    } else {
      await supabaseAdmin
        .from('ai_usage')
        .insert({ user_id: userId, usage_date: today, questions_used: 1 });
    }

    return { allowed: true, remaining: limit - (questionsUsed + 1) };
  }
}
