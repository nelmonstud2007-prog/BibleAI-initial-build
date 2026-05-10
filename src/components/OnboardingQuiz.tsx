import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Cross, ArrowRight, Check, Sparkles, Heart, BookOpen, Compass, Loader2 } from 'lucide-react';

interface QuizStep {
  id: number;
  question: string;
  subtitle: string;
  options: { id: string; label: string; description: string; icon: any }[];
  field: string;
}

const QUIZ_STEPS: QuizStep[] = [
  {
    id: 1,
    question: 'What brings you to BibleAI?',
    subtitle: 'This helps us personalise your daily devotionals.',
    field: 'spiritual_goal',
    options: [
      { id: 'grow', label: 'Grow spiritually', description: 'Deepen my faith and understanding', icon: Sparkles },
      { id: 'pray', label: 'Strengthen prayer life', description: 'Build a consistent prayer habit', icon: Heart },
      { id: 'study', label: 'Study the Bible', description: 'Learn scripture in depth', icon: BookOpen },
      { id: 'guidance', label: 'Find guidance', description: 'Navigate life\'s challenges with faith', icon: Compass },
    ],
  },
  {
    id: 2,
    question: 'How would you describe your faith journey?',
    subtitle: 'We\'ll tailor the AI tone and depth to match your experience.',
    field: 'faith_level',
    options: [
      { id: 'exploring', label: 'Exploring', description: 'New to faith or just curious', icon: Compass },
      { id: 'growing', label: 'Growing', description: 'Committed but still learning', icon: Sparkles },
      { id: 'mature', label: 'Mature', description: 'Deeply rooted in scripture', icon: BookOpen },
      { id: 'returning', label: 'Returning', description: 'Coming back after a season away', icon: Heart },
    ],
  },
  {
    id: 3,
    question: 'When do you prefer to spend time with God?',
    subtitle: 'We\'ll remind you at the right time each day.',
    field: 'preferred_time',
    options: [
      { id: 'morning', label: 'Morning', description: 'Start the day in His presence', icon: Sparkles },
      { id: 'midday', label: 'Midday', description: 'A midday pause and reflection', icon: BookOpen },
      { id: 'evening', label: 'Evening', description: 'Wind down with the Word', icon: Heart },
      { id: 'flexible', label: 'Flexible', description: 'Whenever the Spirit leads', icon: Compass },
    ],
  },
];

export default function OnboardingQuiz() {
  const { user, refreshProfile } = useAuth();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Check if user has completed the quiz
    const checkQuiz = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('onboarding_quiz_completed, profile_completed')
        .eq('id', user.id)
        .maybeSingle();
      // Show quiz if profile is complete but quiz hasn't been done
      if (data?.profile_completed && !data?.onboarding_quiz_completed) {
        setTimeout(() => setShow(true), 1500);
      }
    };
    checkQuiz();
  }, [user]);

  const currentStep = QUIZ_STEPS[step];

  const selectOption = (optionId: string) => {
    setAnswers((prev) => ({ ...prev, [currentStep.field]: optionId }));
  };

  const handleNext = async () => {
    if (!answers[currentStep.field]) return;

    if (step < QUIZ_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      // Save answers
      setSaving(true);
      try {
        const reminderTimeMap: Record<string, string> = {
          morning: '08:00:00',
          midday: '12:00:00',
          evening: '20:00:00',
          flexible: '08:00:00',
        };
        await supabase
          .from('profiles')
          .update({
            onboarding_quiz_completed: true,
            spiritual_goal: answers.spiritual_goal,
            faith_level: answers.faith_level,
            preferred_time: answers.preferred_time,
            daily_reminder_enabled: answers.preferred_time !== 'flexible',
            daily_reminder_time: reminderTimeMap[answers.preferred_time] ?? '08:00:00',
          })
          .eq('id', user!.id);
        await refreshProfile();
        setDone(true);
        setTimeout(() => setShow(false), 2500);
      } catch (err) {
        console.error('Failed to save quiz:', err);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSkip = async () => {
    await supabase
      .from('profiles')
      .update({ onboarding_quiz_completed: true })
      .eq('id', user!.id);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-navy-950/90 backdrop-blur-md" />

      <div className="relative bg-navy-900 border border-gold-400/20 rounded-[2.5rem] p-8 sm:p-10 max-w-lg w-full shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] animate-scale-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gold-gradient rounded-2xl flex items-center justify-center shadow-lg">
            <Cross className="w-5 h-5 text-navy-950" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gold-400 uppercase tracking-widest">
              {done ? 'All set!' : `Step ${step + 1} of ${QUIZ_STEPS.length}`}
            </p>
            <div className="flex gap-1 mt-1">
              {QUIZ_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i <= step ? 'bg-gold-400' : 'bg-navy-800'
                  } ${i === step ? 'w-8' : 'w-4'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {done ? (
          <div className="text-center py-8 space-y-4 animate-scale-in">
            <div className="w-20 h-20 bg-gold-gradient rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-gold-400/20 animate-glow-pulse">
              <Check className="w-10 h-10 text-navy-950" />
            </div>
            <h2 className="text-2xl font-bold text-white">Your journey is personalised!</h2>
            <p className="text-navy-300 text-sm">
              BibleAI has been tailored to your spiritual goals and schedule. Welcome to your sacred space.
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white mb-2">{currentStep.question}</h2>
            <p className="text-navy-400 text-sm mb-8">{currentStep.subtitle}</p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {currentStep.options.map((option) => {
                const Icon = option.icon;
                const selected = answers[currentStep.field] === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => selectOption(option.id)}
                    className={`relative p-4 rounded-2xl border text-left transition-all duration-200 ${
                      selected
                        ? 'border-gold-400/50 bg-gold-400/10 shadow-lg shadow-gold-400/5'
                        : 'border-navy-800 bg-navy-800/40 hover:border-navy-700 hover:bg-navy-800/60'
                    }`}
                  >
                    {selected && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-gold-400 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-navy-950" />
                      </div>
                    )}
                    <Icon className={`w-5 h-5 mb-2 ${selected ? 'text-gold-400' : 'text-navy-500'}`} />
                    <p className={`text-sm font-bold ${selected ? 'text-white' : 'text-navy-300'}`}>
                      {option.label}
                    </p>
                    <p className="text-[11px] text-navy-500 mt-0.5">{option.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleNext}
                disabled={!answers[currentStep.field] || saving}
                className="flex-1 bg-gold-gradient text-navy-950 font-black py-4 rounded-2xl shadow-xl shadow-gold-400/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {step < QUIZ_STEPS.length - 1 ? 'Continue' : 'Finish Setup'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <button
                onClick={handleSkip}
                className="px-5 py-4 text-navy-500 hover:text-navy-300 text-sm font-bold transition-colors"
              >
                Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
