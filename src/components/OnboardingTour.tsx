import { useEffect, useMemo, useState } from 'react';

const TOUR_STORAGE_KEY = 'bibleai_onboarding_completed';

type Step = {
  target: string;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    target: 'bible-chat-nav',
    title: 'Bible Chat',
    description: 'Ask scripture questions and get faith-centered responses in real time.',
  },
  {
    target: 'prayer-journal-nav',
    title: 'Prayer Journal',
    description: 'Capture prayer requests and mark them answered as you see God move.',
  },
  {
    target: 'daily-verse-nav',
    title: 'Daily Verse',
    description: 'Start each day with a devotional verse and reflection.',
  },
  {
    target: 'upgrade-button',
    title: 'Upgrade to Pro',
    description: 'Unlock unlimited chat, deeper analytics, and premium growth tools.',
  },
];

export default function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
    if (!completed) {
      const timer = setTimeout(() => setActive(true), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const step = STEPS[stepIndex];

  const targetElement = useMemo(() => {
    if (!active || !step) return null;
    const matches = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour-id="${step.target}"]`));
    return (
      matches.find((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
      }) || null
    );
  }, [active, stepIndex, step?.target]);

  useEffect(() => {
    if (!active) return;
    if (!step) {
      completeTour();
      return;
    }

    if (!targetElement) {
      goNext();
      return;
    }

    const updateRect = () => setRect(targetElement.getBoundingClientRect());
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [active, stepIndex, targetElement]);

  const completeTour = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setActive(false);
  };

  const goNext = () => {
    setStepIndex((prev) => {
      if (prev >= STEPS.length - 1) {
        completeTour();
        return prev;
      }
      return prev + 1;
    });
  };

  const tooltipStyle = () => {
    if (!rect) return { top: 24, right: 24 } as const;
    const top = Math.min(window.innerHeight - 220, rect.bottom + 12);
    const left = Math.min(window.innerWidth - 320, Math.max(12, rect.left));
    return { top, left };
  };

  if (!active || !step || !rect) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/70" />
      <div
        className="fixed z-[71] rounded-xl ring-2 ring-gold-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] pointer-events-none"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
        }}
      />
      <div
        className="fixed z-[72] w-[300px] max-w-[calc(100vw-24px)] bg-navy-900 border border-gold-400/30 rounded-2xl p-4 shadow-2xl"
        style={tooltipStyle()}
      >
        <p className="text-[11px] uppercase tracking-wider text-gold-400 mb-1">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
        <h3 className="text-white font-semibold mb-1">{step.title}</h3>
        <p className="text-sm text-navy-300 mb-4">{step.description}</p>
        <div className="flex gap-2">
          <button
            onClick={completeTour}
            className="flex-1 bg-navy-800 border border-navy-700 text-navy-200 px-3 py-2 rounded-lg hover:bg-navy-700 transition-colors text-sm"
          >
            Skip
          </button>
          <button
            onClick={goNext}
            className="flex-1 bg-gold-400 text-navy-950 font-semibold px-3 py-2 rounded-lg hover:bg-gold-300 transition-colors text-sm"
          >
            {stepIndex === STEPS.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
}
