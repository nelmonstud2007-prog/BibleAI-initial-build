import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

interface StreakData {
  streak: number;
  prayedToday: boolean;
  loading: boolean;
}

// Module-level cache for session persistence
let cachedData: { streak: number; prayedToday: boolean; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

export function useStreak(userId: string | undefined) {
  const [data, setData] = useState<StreakData>(() => {
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return { streak: cachedData.streak, prayedToday: cachedData.prayedToday, loading: false };
    }
    return { streak: 0, prayedToday: false, loading: true };
  });

  const fetchStreak = useCallback(async (uid: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    try {
      // 1. Check if prayed today (using profiles table as per DashboardHome pattern)
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_prayer_added_date')
        .eq('id', uid)
        .maybeSingle();

      const prayedToday = profile?.last_prayer_added_date === today;

      // 2. Fetch streaks for count
      const { data: streaks } = await supabase
        .from('prayer_streaks')
        .select('date')
        .eq('user_id', uid)
        .order('date', { ascending: false })
        .limit(365);

      let streak = 0;
      if (streaks && streaks.length > 0) {
        // Start counting if they prayed today OR yesterday
        const hasStarted = streaks[0].date === today || streaks[0].date === yesterdayStr;
        
        if (hasStarted) {
          let checkDate = new Date();
          // If they haven't prayed today, start checking from yesterday
          if (streaks[0].date !== today) {
            checkDate.setDate(checkDate.getDate() - 1);
          }
          
          const dateStrings = streaks.map(s => s.date);
          for (let i = 0; i < streaks.length; i++) {
            const dStr = checkDate.toISOString().split('T')[0];
            if (dateStrings.includes(dStr)) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
        }
      }

      const result = { streak, prayedToday, loading: false };
      setData(result);
      
      // Update cache
      cachedData = { ...result, timestamp: Date.now() };
    } catch (err) {
      console.error('Failed to fetch streak:', err);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    
    // Use cache if valid, otherwise fetch
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
       // already set in initial state
       return;
    }

    fetchStreak(userId);
  }, [userId, fetchStreak]);

  return data;
}
