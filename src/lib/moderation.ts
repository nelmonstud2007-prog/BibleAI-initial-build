import { supabase } from './supabase';

interface ModerationResult {
  flagged: boolean;
  category?: string;
  reason?: string;
}

// Local profanity filter as fallback
const profanityList = [
  'damn', 'hell', 'crap', 'piss', 'ass', 'bastard', 'bitch', 'dammit',
  // Add more as needed - this is a basic list
];

function containsProfanity(text: string): boolean {
  const lowerText = text.toLowerCase();
  return profanityList.some(word => 
    new RegExp(`\\b${word}\\b`, 'i').test(lowerText)
  );
}

export async function moderateContent(
  content: string,
  userId: string,
  contentType: 'post' | 'comment'
): Promise<ModerationResult> {
  try {
    // First check: local profanity filter
    if (containsProfanity(content)) {
      // Log flagged content
      await supabase.from('flagged_content').insert({
        content: content.substring(0, 500),
        reason: 'Profanity detected',
        user_id: userId,
        content_type: contentType,
      });

      return {
        flagged: true,
        category: 'profanity',
        reason: 'Your post contains language that isn\'t allowed on BibleAI. Please review and resubmit.',
      };
    }

    // Second check: length validation
    const maxLength = contentType === 'post' ? 2000 : 500;
    if (content.length > maxLength) {
      return {
        flagged: true,
        category: 'length',
        reason: `Your ${contentType} exceeds the ${maxLength} character limit.`,
      };
    }

    // Third check: spam detection (repeated characters, all caps, etc.)
    if (/(.)\1{9,}/.test(content) || (content.length > 20 && content === content.toUpperCase())) {
      await supabase.from('flagged_content').insert({
        content: content.substring(0, 500),
        reason: 'Spam detected',
        user_id: userId,
        content_type: contentType,
      });

      return {
        flagged: true,
        category: 'spam',
        reason: 'Your post appears to be spam. Please try again with meaningful content.',
      };
    }

    // If all checks pass
    return { flagged: false };
  } catch (error) {
    console.error('Moderation error:', error);
    // On error, allow the content but log it
    return { flagged: false };
  }
}

export async function checkRateLimit(
  userId: string,
  type: 'post' | 'comment',
  isPro: boolean
): Promise<{ allowed: boolean; remaining: number; message?: string }> {
  try {
    const today = new Date().toISOString().split('T')[0];

    if (type === 'post') {
      const limit = isPro ? 10 : 3;
      const { data: todayPosts } = await supabase
        .from('forum_posts')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      const count = todayPosts?.length || 0;
      const remaining = Math.max(0, limit - count);

      if (count >= limit) {
        return {
          allowed: false,
          remaining: 0,
          message: `You've reached your daily post limit (${limit}). ${
            !isPro ? 'Upgrade to Pro for more.' : ''
          }`,
        };
      }

      return { allowed: true, remaining };
    } else {
      // Comments: 20 per day for all users
      const limit = 20;
      const { data: todayComments } = await supabase
        .from('forum_comments')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      const count = todayComments?.length || 0;
      const remaining = Math.max(0, limit - count);

      if (count >= limit) {
        return {
          allowed: false,
          remaining: 0,
          message: `You've reached your daily comment limit (${limit}).`,
        };
      }

      return { allowed: true, remaining };
    }
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the action
    return { allowed: true, remaining: -1 };
  }
}
