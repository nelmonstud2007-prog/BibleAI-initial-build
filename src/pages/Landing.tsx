import { Link } from 'react-router-dom';
import {
  Cross,
  MessageCircle,
  BookOpen,
  Sun,
  ChevronRight,
  ChevronDown,
  Quote,
  Check,
  X,
  Send,
  Bot,
  Sparkles,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const features = [
  {
    icon: MessageCircle,
    emoji: '\uD83D\uDCAC',
    title: 'Bible AI Chat',
    description: 'Ask any question and get scripture-backed answers instantly.',
  },
  {
    icon: BookOpen,
    emoji: '\uD83D\uDE4F',
    title: 'Prayer Journal',
    description: 'Log, track and celebrate your answered prayers.',
  },
  {
    icon: Sun,
    emoji: '\uD83D\uDCD6',
    title: 'Daily Devotionals',
    description: 'Start every morning with an AI-curated verse and reflection.',
  },
];

const testimonials = [
  {
    name: 'Sarah Mitchell',
    role: 'Youth Ministry Leader',
    photo: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    quote: 'BibleAI has completely transformed my quiet time. I ask questions I\'ve always wondered about and get thoughtful, scripture-grounded answers within seconds.',
  },
  {
    name: 'David Okonkwo',
    role: 'Pastor & Seminary Student',
    photo: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    quote: 'The prayer journal feature keeps me accountable. I\'ve seen God answer so many prayers I would have otherwise forgotten I even prayed. It strengthens my faith daily.',
  },
  {
    name: 'Emily Chen',
    role: 'Homeschool Mom',
    photo: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    quote: 'Every morning, my kids and I start the day with the daily devotional. It\'s become our favorite family routine. The reflections are always spot-on and encouraging.',
  },
];

const faqs = [
  {
    question: 'Is BibleAI free to use?',
    answer: 'Yes! BibleAI offers a generous free plan that includes 5 AI chat messages per day, up to 10 prayer journal entries, and daily devotionals. For unlimited access, you can upgrade to Pro for just $4.99/month.',
  },
  {
    question: 'What Bible translation does the AI use?',
    answer: 'BibleAI draws from multiple translations including ESV, NIV, KJV, and NASB to provide well-rounded answers. When you ask a question, the AI cites specific verses so you can look them up in your preferred translation.',
  },
  {
    question: 'Is my prayer journal private?',
    answer: 'Absolutely. Your prayer journal is protected by Row Level Security in our database, meaning only you can see your entries. We never share your personal prayers with anyone.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes, you can cancel your Pro subscription at any time with no questions asked. You\'ll continue to have access to Pro features until the end of your current billing period, then you\'ll be moved to the free plan.',
  },
  {
    question: 'How is this different from just googling Bible verses?',
    answer: 'Google gives you links. BibleAI gives you understanding. Instead of sifting through dozens of websites, you get a direct, scripture-backed answer with specific verse citations. Plus, the prayer journal and daily devotionals create a complete spiritual growth routine that search engines simply can\'t offer.',
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-navy-800">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-sm sm:text-base font-medium text-white group-hover:text-gold-400 transition-colors pr-4">
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-navy-400 flex-shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? 'max-h-48 pb-5' : 'max-h-0'
        }`}
      >
        <p className="text-sm text-navy-300 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

function DemoChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'bot'; text: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);

  const demoScript = [
    { role: 'user', text: "What does the Bible say about finding peace in hard times?" },
    { role: 'bot', text: "Philippians 4:6-7 says: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.'" },
    { role: 'user', text: "That's encouraging. Thank you!" },
    { role: 'bot', text: "You're welcome! Remember that God is always with you. 'The Lord is close to the brokenhearted and saves those who are crushed in spirit.' (Psalm 34:18)" }
  ];

  useEffect(() => {
    if (!open) {
      setStep(0);
      setMessages([]);
      return;
    }

    if (step < demoScript.length) {
      const timer = setTimeout(() => {
        if (demoScript[step].role === 'user') {
          setMessages(prev => [...prev, demoScript[step]]);
          setStep(s => s + 1);
        } else {
          setIsTyping(true);
          setTimeout(() => {
            setMessages(prev => [...prev, demoScript[step]]);
            setIsTyping(false);
            setStep(s => s + 1);
          }, 1500);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [open, step]);

  if (!open) return null;

  return (
    <div className="fixed bottom-24 right-6 z-[60] w-full max-w-[350px] animate-scale-in">
      <div className="bg-navy-900 border border-gold-400/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[450px]">
        {/* Header */}
        <div className="bg-navy-800 p-4 border-b border-navy-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gold-400 rounded-lg flex items-center justify-center">
              <Cross className="w-4 h-4 text-navy-950" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">BibleAI Demo</p>
              <p className="text-[10px] text-emerald-400">Online & Ready</p>
            </div>
          </div>
          <button onClick={onClose} className="text-navy-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-navy-950/50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-gold-400 text-navy-950 rounded-tr-none' 
                  : 'bg-navy-800 text-navy-100 border border-navy-700 rounded-tl-none'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-navy-800 border border-navy-700 p-3 rounded-2xl rounded-tl-none">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-gold-400 rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-gold-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1 h-1 bg-gold-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-navy-800 bg-navy-900">
          <Link 
            to="/signup"
            className="w-full bg-gold-400 text-navy-950 font-bold py-2 rounded-xl text-center text-sm hover:bg-gold-300 transition-colors block"
          >
            Start Your Own Chat
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <div className="min-h-screen bg-navy-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-950/80 backdrop-blur-md border-b border-navy-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gold-400 rounded-lg flex items-center justify-center">
              <Cross className="w-4 h-4 text-navy-950" />
            </div>
            <span className="text-xl font-bold text-white">BibleAI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-navy-300 hover:text-white transition-colors">Features</a>
            <a href="#testimonials" className="text-sm text-navy-300 hover:text-white transition-colors">Testimonials</a>
            <a href="#faq" className="text-sm text-navy-300 hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/signin"
              className="text-sm text-navy-300 hover:text-white transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="text-sm font-medium bg-gold-400 text-navy-950 px-5 py-2 rounded-lg hover:bg-gold-300 transition-colors"
            >
              Start Free Today
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gold-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-gold-400/10 border border-gold-400/20 rounded-full px-4 py-1.5 mb-8">
            <span className="text-xs font-medium text-gold-400">AI-Powered Spiritual Growth</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight">
            Your AI-Powered
            <br />
            <span className="text-gold-400">Bible Companion</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-navy-300 max-w-2xl mx-auto leading-relaxed">
            Chat with the Bible, track your prayers, and grow your faith — powered by AI
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gold-400 text-navy-950 font-semibold px-8 py-3.5 rounded-xl hover:bg-gold-300 transition-all duration-150 shadow-lg shadow-gold-400/20"
            >
              Start Free Today
              <ChevronRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-navy-800 text-white font-medium px-8 py-3.5 rounded-xl hover:bg-navy-700 transition-all duration-150 border border-navy-700"
            >
              Learn More
            </a>
          </div>

          <p className="mt-4 text-xs text-navy-500">No credit card required. Free forever plan available.</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Everything You Need to <span className="text-gold-400">Grow</span>
            </h2>
            <p className="mt-4 text-navy-300 max-w-xl mx-auto">
              Tools designed to deepen your relationship with God through scripture, prayer, and reflection.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group bg-navy-900/50 border border-navy-800 rounded-2xl p-6 hover:border-gold-400/30 hover:bg-navy-900/80 transition-all duration-200"
                >
                  <div className="w-12 h-12 bg-gold-400/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-gold-400/20 transition-colors">
                    <Icon className="w-6 h-6 text-gold-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-navy-300 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 sm:py-28 border-t border-navy-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Loved by <span className="text-gold-400">Believers</span>
            </h2>
            <p className="mt-4 text-navy-300 max-w-xl mx-auto">
              Hear from Christians who are growing deeper in their faith with BibleAI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-navy-900/50 border border-navy-800 rounded-2xl p-6 flex flex-col"
              >
                <Quote className="w-8 h-8 text-gold-400/30 mb-4 flex-shrink-0" />
                <p className="text-sm text-navy-200 leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 mt-6 pt-5 border-t border-navy-800">
                  <img
                    src={t.photo}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-navy-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 sm:py-28 border-t border-navy-800/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Frequently Asked <span className="text-gold-400">Questions</span>
            </h2>
            <p className="mt-4 text-navy-300 max-w-xl mx-auto">
              Got questions? We have answers.
            </p>
          </div>

          <div className="bg-navy-900/50 border border-navy-800 rounded-2xl px-6 sm:px-8">
            {faqs.map((faq) => (
              <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28 border-t border-navy-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-navy-900 to-navy-900/50 border border-gold-400/20 rounded-2xl p-8 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Start Growing in Faith <span className="text-gold-400">Today</span>
            </h2>
            <p className="text-navy-300 mb-8 max-w-lg mx-auto">
              Join thousands of believers using AI to deepen their understanding of scripture and strengthen their prayer life.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gold-400 text-navy-950 font-semibold px-8 py-3.5 rounded-xl hover:bg-gold-300 transition-all duration-150 shadow-lg shadow-gold-400/20"
              >
                Start Free Today
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex items-center justify-center gap-4 mt-6 text-xs text-navy-400">
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400" /> Free plan available</span>
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400" /> No credit card required</span>
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400" /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-800/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gold-400 rounded-lg flex items-center justify-center">
                <Cross className="w-3.5 h-3.5 text-navy-950" />
              </div>
              <span className="text-sm font-bold text-white">BibleAI</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="text-xs text-navy-400 hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="text-xs text-navy-400 hover:text-white transition-colors">Terms</Link>
              <a href="mailto:bibleaisupportcontact@gmail.com" className="text-xs text-navy-400 hover:text-white transition-colors">Contact</a>
            </div>
            <p className="text-xs text-navy-500">&copy; 2026 BibleAI. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Floating Demo Button */}
      {!demoOpen && (
        <button
          onClick={() => setDemoOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gold-400 text-navy-950 font-bold px-6 py-3 rounded-full shadow-2xl hover:bg-gold-300 transition-all hover:-translate-y-1 flex items-center gap-2 group"
        >
          <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Try Bible AI
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        </button>
      )}

      <DemoChat open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
