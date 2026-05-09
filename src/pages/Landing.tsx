import { Link } from 'react-router-dom';
import {
  Cross,
  MessageCircle,
  BookOpen,
  Sun,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Play,
  ArrowRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: MessageCircle,
    title: 'Bible AI Chat',
    description: 'Ask any question and get scripture-backed answers instantly.',
  },
  {
    icon: BookOpen,
    title: 'Prayer Journal',
    description: 'Log, track and celebrate your answered prayers.',
  },
  {
    icon: Sun,
    title: 'Daily Devotionals',
    description: 'Start every morning with an AI-curated verse and reflection.',
  },
  {
    icon: BookOpen,
    title: 'Bible Reader',
    description: 'A full, modern Bible reading experience with audio and highlighting.',
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
  {
    name: 'Marcus Thorne',
    role: 'Theology Professor',
    photo: 'https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    quote: 'An incredible tool for cross-referencing and deep theological exploration. The AI is remarkably accurate with citations.',
  }
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
          className={`w-5 h-5 text-navy-400 flex-shrink-0 transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? 'max-h-48 pb-5 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="text-sm text-navy-300 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

function DemoChat({ open, onClose, isLoggedIn }: { open: boolean; onClose: () => void; isLoggedIn: boolean }) {
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'bot'; text: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);

  const demoScript: Array<{ role: 'user' | 'bot'; text: string }> = [
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

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-navy-950/50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gold-gradient text-navy-950 rounded-tr-none'
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

        <div className="p-4 border-t border-navy-800 bg-navy-900">
          <Link
            to={isLoggedIn ? "/dashboard/bible-chat" : "/signup"}
            className="w-full bg-gold-400 text-navy-950 font-bold py-2 rounded-xl text-center text-sm hover:bg-gold-300 transition-colors block"
          >
            {isLoggedIn ? 'Open Bible Chat' : 'Start Your Own Chat'}
          </Link>
        </div>
      </div>
    </div>
  );
}

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  );
}

export default function Landing() {
  const { user, profileCompleted } = useAuth();
  const isLoggedIn = Boolean(user && profileCompleted);
  const [demoOpen, setDemoOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  const ctaLink = isLoggedIn ? '/dashboard' : '/signup';
  const ctaText = isLoggedIn ? 'Go to Dashboard' : 'Start Free Today';
  const navCtaText = isLoggedIn ? 'Dashboard' : 'Start Free';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIndex(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Sticky Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b ${
        isScrolled
          ? 'bg-navy-950/95 backdrop-blur-md border-navy-800 py-3 translate-y-0 opacity-100'
          : 'bg-transparent border-transparent py-5 -translate-y-full opacity-0'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to={isLoggedIn ? '/dashboard' : '/'} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gold-400 rounded-lg flex items-center justify-center">
              <Cross className="w-4 h-4 text-navy-950" />
            </div>
            <span className="text-xl font-bold text-white">BibleAI</span>
          </Link>
          <div className="flex items-center gap-4">
            {!isLoggedIn && (
              <Link to="/signin" className="text-sm text-navy-300 hover:text-white transition-colors">Sign In</Link>
            )}
            <Link to={ctaLink} className="bg-gold-gradient text-navy-950 text-xs font-bold px-5 py-2.5 rounded-full hover:scale-105 transition-transform shadow-lg shadow-gold-400/20">
              {navCtaText}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-40 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
          <Link to={isLoggedIn ? '/dashboard' : '/'} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gold-400 rounded-lg flex items-center justify-center">
              <Cross className="w-4 h-4 text-navy-950" />
            </div>
            <span className="text-xl font-bold text-white">BibleAI</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-navy-300 hover:text-white transition-colors">Features</a>
            <a href="#demo" className="text-sm text-navy-300 hover:text-white transition-colors">Live Demo</a>
            <a href="#testimonials" className="text-sm text-navy-300 hover:text-white transition-colors">Testimonials</a>
          </div>
          <div className="flex items-center gap-3">
            {!isLoggedIn && (
              <Link to="/signin" className="text-sm text-navy-300 hover:text-white transition-colors px-4 py-2">Sign In</Link>
            )}
            <Link to={ctaLink} className="text-sm font-medium bg-gold-400 text-navy-950 px-5 py-2 rounded-lg hover:bg-gold-300 transition-colors shadow-lg shadow-gold-400/20">
              {navCtaText}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gold-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-gold-400/3 rounded-full blur-2xl pointer-events-none animate-float" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-gold-400/10 border border-gold-400/20 rounded-full px-4 py-1.5 mb-8 animate-fade-in">
            <span className="text-[10px] font-bold text-gold-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-gold-400 rounded-full animate-pulse" />
              Just Launched
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight animate-fade-in-up">
            Meet BibleAI — A New Way to
            <br />
            <span className="text-gold-400 font-serif italic">Experience Scripture</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-navy-300 max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            The first AI-powered Bible companion built for modern Christians.
            Chat, study, pray and track your faith journey all in one place.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link
              to={ctaLink}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gold-400 text-navy-950 font-bold px-8 py-4 rounded-xl hover:bg-gold-300 transition-all duration-200 shadow-lg shadow-gold-400/20 animate-glow"
            >
              {ctaText}
              <ChevronRight className="w-4 h-4" />
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-navy-800 text-white font-medium px-8 py-4 rounded-xl hover:bg-navy-700 transition-all duration-200 border border-navy-700"
            >
              See How It Works
            </a>
          </div>

          <p className="mt-4 text-xs text-navy-500">No credit card required. Free forever plan available.</p>

          {/* Social Proof Bar */}
          <div className="mt-20 py-8 border-y border-navy-800/50">
            <p className="text-[10px] uppercase tracking-[0.2em] text-navy-500 font-bold mb-6">Trusted by Christians worldwide</p>
            <div className="relative h-12 overflow-hidden">
              <div
                className="absolute inset-0 flex flex-col transition-transform duration-1000 ease-in-out"
                style={{ transform: `translateY(-${testimonialIndex * 100}%)` }}
              >
                {testimonials.map((t, i) => (
                  <div key={i} className="h-full flex items-center justify-center gap-4 text-navy-300">
                    <img src={t.photo} alt={t.name} className="w-6 h-6 rounded-full grayscale opacity-50" />
                    <span className="text-sm italic">&ldquo;{t.quote.slice(0, 80)}...&rdquo;</span>
                    <span className="text-xs font-bold text-navy-500">— {t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Early Adopter Section */}
      <AnimatedSection>
        <section className="py-24 bg-navy-900/30 border-y border-navy-800/50">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="inline-block p-1 rounded-2xl bg-gold-gradient mb-6">
              <div className="bg-navy-950 rounded-[14px] px-6 py-8">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Be Among The First</h2>
                <p className="text-navy-200 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
                  BibleAI is brand new. Join early and help shape the future of faith-based technology.
                  Early members get locked in at our <span className="text-gold-400 font-bold">lowest price forever</span>.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    to={ctaLink}
                    className="w-full sm:w-auto bg-gold-400 text-navy-950 font-bold px-8 py-4 rounded-xl hover:bg-gold-300 transition-all shadow-lg shadow-gold-400/20"
                  >
                    Join the Early Adopter Program
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* Live Demo Section */}
      <AnimatedSection>
        <section id="demo" className="py-24 sm:py-32 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6">
                  Watch the <span className="text-gold-400">Word</span> Come to Life
                </h2>
                <p className="text-lg text-navy-300 mb-8 leading-relaxed">
                  BibleAI isn&apos;t just a chat bot. It&apos;s a dedicated spiritual assistant that understands the nuance of scripture, context of theology, and the power of prayer.
                </p>
                <ul className="space-y-4">
                  {[
                    'Instant scripture-backed answers',
                    'Fuzzy matching for difficult references',
                    'Deep theological context',
                    'Encouraging, faith-centered tone'
                  ].map(item => (
                    <li key={item} className="flex items-center gap-3 text-navy-200">
                      <div className="w-5 h-5 bg-emerald-400/10 rounded-full flex items-center justify-center border border-emerald-400/20">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Scrolling Chat Demo */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-gold-400/20 to-navy-900 rounded-[32px] blur opacity-25 group-hover:opacity-40 transition-opacity duration-500" />
                <div className="relative bg-navy-950 border border-navy-800 rounded-[32px] overflow-hidden shadow-2xl aspect-[4/3] flex flex-col">
                  <div className="p-6 border-b border-navy-800 flex items-center gap-3 bg-navy-900/50">
                    <div className="w-10 h-10 bg-gold-400 rounded-xl flex items-center justify-center">
                      <Cross className="w-5 h-5 text-navy-950" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">BibleAI Interactive</p>
                      <p className="text-xs text-navy-400">Always learning, always teaching</p>
                    </div>
                  </div>
                  <div className="flex-1 p-6 space-y-6 overflow-hidden relative">
                    <div className="space-y-6 animate-[scroll-demo_20s_linear_infinite]">
                      {[
                        { r: 'user', t: 'What is the most repeated command in the Bible?' },
                        { r: 'bot', t: 'The most repeated command is "Do not be afraid" (or some variation of "Fear not"). It appears over 365 times, once for every day of the year.' },
                        { r: 'user', t: 'Wow. Why is that?' },
                        { r: 'bot', t: 'Because God knows our human nature. He constantly reassures us of His presence: "So do not fear, for I am with you; do not be dismayed, for I am your God." (Isaiah 41:10)' },
                        { r: 'user', t: 'Explain the meaning of John 3:16' },
                        { r: 'bot', t: 'John 3:16 captures the heart of the Gospel: God\'s love was so great that He gave His only Son, so that through faith in Him, we could have eternal life instead of perish.' },
                        { r: 'user', t: 'How do I start a prayer routine?' },
                        { r: 'bot', t: 'Start small. Jesus taught the Lord\'s Prayer as a model. Focus on Gratitude, Repentance, and Petition. BibleAI\'s prayer journal can help track these daily.' },
                      ].map((m, i) => (
                        <div key={i} className={`flex ${m.r === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-5 py-4 rounded-2xl text-[13px] leading-relaxed shadow-lg ${
                            m.r === 'user' ? 'bg-gold-gradient text-navy-950 font-medium' : 'bg-navy-900 border border-navy-800 text-navy-100'
                          }`}>
                            {m.t}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-navy-950 to-transparent z-10" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* Bible Reader Feature Section */}
      <AnimatedSection>
        <section className="py-24 bg-navy-900/20 border-y border-navy-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                A Complete <span className="text-gold-400">Reading Experience</span>
              </h2>
              <p className="text-navy-300 max-w-2xl mx-auto">
                Our full-featured Bible reader allows you to highlight verses, search with fuzzy logic, and even listen to chapters aloud.
              </p>
            </div>
            <div className="relative max-w-5xl mx-auto">
              <div className="absolute -inset-4 bg-gold-400/10 rounded-[40px] blur-2xl" />
              <div className="relative bg-navy-950 border border-navy-800 rounded-[32px] overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800 bg-navy-900/50">
                  <div className="flex gap-4">
                    <div className="px-3 py-1 bg-navy-800 border border-navy-700 rounded-lg text-xs text-gold-400">Genesis</div>
                    <div className="px-3 py-1 bg-navy-800 border border-navy-700 rounded-lg text-xs text-gold-400">Chapter 1</div>
                  </div>
                  <div className="w-32 h-6 bg-navy-800 rounded-full" />
                </div>
                <div className="p-8 sm:p-12 space-y-6">
                  {[1, 2, 3, 4, 5].map(v => (
                    <div key={v} className="flex gap-4">
                      <span className="text-gold-400 font-bold text-sm mt-1">{v}</span>
                      <div className={`h-4 bg-navy-800 rounded-full ${v % 2 === 0 ? 'w-full' : 'w-2/3'}`} />
                    </div>
                  ))}
                  <div className="pt-8 flex justify-center">
                    <button className="bg-navy-800 border border-gold-400/20 text-gold-400 px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                      <Play className="w-4 h-4 fill-gold-400" />
                      Listen to Chapter
                    </button>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 sm:right-12 bg-navy-900 border border-gold-400/40 rounded-2xl p-4 shadow-2xl animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gold-400/10 rounded-lg flex items-center justify-center border border-gold-400/20">
                    <BookOpen className="w-4 h-4 text-gold-400" />
                  </div>
                  <p className="text-xs font-bold text-white italic">"Highlight & Ask AI"</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* Features */}
      <AnimatedSection>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up-stagger">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group bg-navy-900/50 border border-navy-800 rounded-2xl p-6 hover:border-gold-400/30 hover:bg-navy-900/80 hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="w-12 h-12 bg-gold-400/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-gold-400/20 group-hover:scale-110 transition-all duration-300">
                      <Icon className="w-6 h-6 text-gold-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-xs text-navy-300 leading-relaxed">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* Testimonials */}
      <AnimatedSection>
        <section id="testimonials" className="py-20 sm:py-28 border-t border-navy-800/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-12">Building the <span className="text-gold-400 font-serif italic">Future of Faith</span></h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { t: 'The AI is incredibly respectful and scripture-accurate.', a: 'Initial Beta Member' },
                { t: 'Finally, a prayer journal that actually helps me stay consistent.', a: 'Early Adopter' },
                { t: 'The daily devotionals are a breath of fresh air every morning.', a: 'Beta Tester' }
              ].map((test, i) => (
                <div key={i} className="p-6 bg-navy-900/40 border border-navy-800 rounded-2xl hover:border-gold-400/20 transition-all duration-300 hover:-translate-y-1">
                  <p className="text-navy-200 italic mb-4 text-sm">"{test.t}"</p>
                  <p className="text-[10px] text-gold-400 font-bold uppercase tracking-wider">— {test.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* FAQ */}
      <AnimatedSection>
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
      </AnimatedSection>

      {/* Final CTA */}
      <AnimatedSection>
        <section className="py-20 sm:py-28 border-t border-navy-800/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="bg-gradient-to-br from-navy-900 to-navy-900/50 border border-gold-400/20 rounded-2xl p-8 sm:p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gold-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 relative">
                Start Growing in Faith <span className="text-gold-400">Today</span>
              </h2>
              <p className="text-navy-300 mb-8 max-w-lg mx-auto relative">
                Join thousands of believers using AI to deepen their understanding of scripture and strengthen their prayer life.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative">
                <Link
                  to={ctaLink}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gold-400 text-navy-950 font-semibold px-8 py-3.5 rounded-xl hover:bg-gold-300 transition-all duration-200 shadow-lg shadow-gold-400/20"
                >
                  {ctaText}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="flex items-center justify-center gap-4 mt-6 text-xs text-navy-400 relative">
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400" /> Free plan available</span>
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400" /> No credit card required</span>
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400" /> Cancel anytime</span>
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* Footer */}
      <footer className="border-t border-navy-800/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link to={isLoggedIn ? '/dashboard' : '/'} className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gold-400 rounded-lg flex items-center justify-center">
                <Cross className="w-3.5 h-3.5 text-navy-950" />
              </div>
              <span className="text-sm font-bold text-white">BibleAI</span>
            </Link>
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
          className="fixed bottom-6 right-6 z-50 bg-gold-400 text-navy-950 font-bold px-6 py-3 rounded-full shadow-2xl hover:bg-gold-300 transition-all hover:-translate-y-1 flex items-center gap-2 group animate-glow-pulse"
        >
          <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Try Bible AI
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        </button>
      )}

      <DemoChat open={demoOpen} onClose={() => setDemoOpen(false)} isLoggedIn={isLoggedIn} />
    </div>
  );
}
