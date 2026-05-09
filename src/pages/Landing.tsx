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
  Sparkles,
  Zap,
  ShieldCheck,
  Heart,
  Users,
  Star
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: MessageCircle,
    title: 'Biblical AI Scholar',
    description: 'Ask deep theological questions or simple scripture lookups. Get compassionate, accurate answers in seconds.',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10'
  },
  {
    icon: Heart,
    title: 'Prayer Journal',
    description: 'A sacred space to log your prayers and watch God work. Track trends and celebrate answered petitions.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10'
  },
  {
    icon: Sun,
    title: 'Morning Reflections',
    description: 'Personalized daily devotionals curated by AI to match your current spiritual season and walk.',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10'
  },
  {
    icon: ShieldCheck,
    title: 'Safe & Secure',
    description: 'Your spiritual life is private. We use industry-leading encryption and RLS to ensure your data stays yours.',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10'
  },
];

const churchIcons = [
  { icon: Cross, label: 'Biblical Truth' },
  { icon: Users, label: 'Community Focus' },
  { icon: Sparkles, label: 'Divine Wisdom' },
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
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-navy-800/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <span className="text-base font-semibold text-white group-hover:text-gold-400 transition-colors pr-4">
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-navy-400 flex-shrink-0 transition-transform duration-300 ${
            open ? 'rotate-180 text-gold-400' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? 'max-h-48 pb-6 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="text-sm text-navy-300 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

function AnimatedSection({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  return (
    <div
      ref={ref}
      id={id}
      className={`transition-all duration-1000 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'} ${className}`}
    >
      {children}
    </div>
  );
}

export default function Landing() {
  const { user, profileCompleted } = useAuth();
  const isLoggedIn = Boolean(user && profileCompleted);
  const [isScrolled, setIsScrolled] = useState(false);

  const ctaLink = isLoggedIn ? '/dashboard' : '/signup';
  const ctaText = isLoggedIn ? 'Go to Dashboard' : 'Start Your Journey Free';
  const navCtaText = isLoggedIn ? 'Dashboard' : 'Start Free';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-navy-950 selection:bg-gold-400/30 selection:text-white">
      
      {/* Dynamic Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? 'bg-navy-950/80 backdrop-blur-xl border-b border-white/5 py-4 shadow-2xl' : 'bg-transparent py-6'
      }`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gold-gradient rounded-xl flex items-center justify-center shadow-lg shadow-gold-400/20 group-hover:scale-110 transition-transform">
              <Cross className="w-5 h-5 text-navy-950" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">BibleAI</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-sm font-semibold text-navy-300 hover:text-white transition-colors">Features</a>
            <a href="#demo" className="text-sm font-semibold text-navy-300 hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="text-sm font-semibold text-navy-300 hover:text-white transition-colors">Pricing</a>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live Status</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {!isLoggedIn && (
              <Link to="/signin" className="text-sm font-bold text-navy-300 hover:text-white transition-colors">Sign In</Link>
            )}
            <Link 
              to={ctaLink} 
              className="bg-gold-gradient text-navy-950 text-xs sm:text-sm font-black px-6 py-2.5 rounded-full hover:scale-105 transition-all shadow-xl shadow-gold-400/10 active:scale-95"
            >
              {navCtaText}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-32 pb-24 overflow-hidden mesh-gradient">
        {/* Cinematic Background Elements */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gold-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold-400/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-5 py-2 mb-10 animate-fade-in">
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span className="text-[11px] font-bold text-gold-400 uppercase tracking-[0.2em]">The Future of Bible Study</span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold text-white leading-[0.9] tracking-tighter mb-8 animate-slide-up-fade">
            Your Bible. <br />
            <span className="text-gold-gradient">Smarter.</span>
          </h1>

          <p className="max-w-xl mx-auto text-lg sm:text-xl text-navy-200 mb-12 leading-relaxed animate-slide-up-fade [animation-delay:0.2s]">
            Ask questions, log prayers, and grow closer to God with an AI companion built on biblical truth.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-slide-up-fade [animation-delay:0.4s]">
            <Link
              to={ctaLink}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-gold-gradient text-navy-950 font-black px-10 py-5 rounded-2xl hover:scale-105 transition-all shadow-2xl shadow-gold-400/20 active:scale-95 text-lg"
            >
              {ctaText}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-navy-900/50 backdrop-blur-xl border border-white/10 text-white font-bold px-10 py-5 rounded-2xl hover:bg-navy-800 transition-all hover:border-white/20 text-lg"
            >
              <Play className="w-5 h-5 fill-white" />
              Watch Demo
            </a>
          </div>

          {/* Social Proof Symbols */}
          <div className="mt-20 flex items-center justify-center gap-12 sm:gap-20 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700 animate-fade-in [animation-delay:0.6s]">
            {churchIcons.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex flex-col items-center gap-3">
                  <Icon className="w-8 h-8 text-white" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <AnimatedSection className="py-32 relative bg-navy-900/20 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">Built for <span className="text-gold-400">Spiritual Growth</span></h2>
            <p className="text-navy-300 max-w-xl mx-auto">Everything you need to experience the Word in a more profound, personal way every day.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={feature.title} 
                  className="group bg-navy-900 border border-white/5 p-8 rounded-[2rem] hover:border-gold-400/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-gold-400/5"
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className={`w-14 h-14 ${feature.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-3 shadow-inner`}>
                    <Icon className={`w-7 h-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-gold-400 transition-colors">{feature.title}</h3>
                  <p className="text-sm text-navy-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </AnimatedSection>

      {/* Interactive Demo Section */}
      <AnimatedSection id="demo" className="py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-400/10 border border-emerald-400/20 rounded-lg text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                Real-time Intelligence
              </div>
              <h2 className="text-4xl sm:text-6xl font-bold text-white leading-tight">
                Understand scripture like never before.
              </h2>
              <p className="text-navy-300 text-lg leading-relaxed">
                Ask deep theological questions or simple lookups. Get compassionate, accurate answers grounded in biblical truth.
              </p>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { label: 'Scripture-Based', desc: 'Every answer uses real verses' },
                  { label: 'Fast & Direct', desc: 'Get answers in seconds' },
                  { label: 'Private', desc: 'Your data is always secure' },
                  { label: 'Daily Tracking', desc: 'Build a habit that sticks' }
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-bold text-white">{item.label}</span>
                    </div>
                    <p className="text-xs text-navy-400 ml-6">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat UI Frame */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-br from-gold-400/30 to-navy-950 rounded-[3rem] blur-2xl opacity-30 group-hover:opacity-50 transition-all duration-700" />
              <div className="relative bg-navy-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl aspect-[4/5] sm:aspect-[4/4.5] flex flex-col group-hover:scale-[1.01] transition-transform duration-500">
                <div className="p-6 border-b border-white/5 bg-navy-950/50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gold-gradient rounded-xl flex items-center justify-center shadow-lg shadow-gold-400/20">
                      <Cross className="w-6 h-6 text-navy-950" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white uppercase tracking-wider">BibleAI Assistant</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-navy-400 uppercase tracking-widest">Active & Guiding</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 bg-navy-700 rounded-full" />)}
                  </div>
                </div>

                <div className="flex-1 p-6 space-y-8 overflow-hidden relative">
                   {/* Chat bubbles container */}
                   <div className="space-y-8">
                      <div className="flex justify-end animate-slide-up-fade [animation-delay:0.5s]">
                        <div className="bg-white/5 border border-white/10 text-white text-sm px-6 py-4 rounded-3xl rounded-tr-none max-w-[85%] font-medium">
                           "How do I find strength during a difficult season?"
                        </div>
                      </div>
                      <div className="flex justify-start animate-slide-up-fade [animation-delay:1.5s]">
                         <div className="bg-navy-800 border border-gold-400/20 text-navy-100 text-sm px-6 py-5 rounded-3xl rounded-tl-none max-w-[90%] leading-relaxed shadow-xl relative group/msg">
                            <div className="absolute inset-0 bg-gold-400/5 blur-xl opacity-0 group-hover/msg:opacity-100 transition-opacity" />
                            <p className="relative">"Isaiah 41:10 says, 'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.' Remember that He is your source of peace."</p>
                         </div>
                      </div>
                      <div className="flex justify-end animate-slide-up-fade [animation-delay:2.5s]">
                        <div className="bg-white/5 border border-white/10 text-white text-sm px-6 py-4 rounded-3xl rounded-tr-none max-w-[80%] font-medium">
                           "Thank you. That's beautiful."
                        </div>
                      </div>
                   </div>
                </div>

                <div className="p-6 bg-navy-950/80 border-t border-white/5 flex gap-4">
                  <div className="flex-1 h-12 bg-navy-900 rounded-2xl border border-white/5" />
                  <div className="w-12 h-12 bg-gold-gradient rounded-2xl flex items-center justify-center shadow-lg">
                    <Zap className="w-5 h-5 text-navy-950" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Trust & Testimonial Section */}
      <AnimatedSection className="py-32 bg-white/2 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
             <div className="flex justify-center gap-1 mb-4 text-gold-400">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-gold-400" />)}
             </div>
             <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6">Loved by Thousands</h2>
             <p className="text-navy-300">Join a global community of believers growing through technology.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-navy-900 border border-white/5 p-8 rounded-[2.5rem] hover:border-white/10 transition-all duration-300 group">
                 <div className="flex items-center gap-4 mb-6">
                    <img src={t.photo} alt={t.name} className="w-14 h-14 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                    <div>
                       <h4 className="font-bold text-white">{t.name}</h4>
                       <p className="text-[10px] font-bold text-navy-500 uppercase tracking-widest">{t.role}</p>
                    </div>
                 </div>
                 <p className="text-navy-200 text-sm leading-relaxed italic">"{t.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* FAQ Section */}
      <AnimatedSection className="py-32">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6">Common Questions</h2>
            <p className="text-navy-300">Everything you need to know about your new spiritual assistant.</p>
          </div>
          <div className="bg-navy-900/40 border border-white/5 p-4 sm:p-10 rounded-[3rem]">
            {faqs.map(faq => (
              <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Final Call to Action */}
      <AnimatedSection className="py-32 px-6">
        <div className="max-w-5xl mx-auto relative group">
           <div className="absolute -inset-1 bg-gold-gradient rounded-[3rem] blur-2xl opacity-10 group-hover:opacity-20 transition-all duration-700" />
           <div className="relative bg-navy-900 border border-gold-400/20 rounded-[3rem] p-12 sm:p-20 text-center overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gold-400/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold-400/5 rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/2" />
              
              <h2 className="text-4xl sm:text-6xl font-bold text-white mb-8 tracking-tighter leading-tight">
                Ready to Deepen Your <br />
                <span className="text-gold-gradient">Relationship with God?</span>
              </h2>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
                 <Link
                   to={ctaLink}
                   className="w-full sm:w-auto bg-gold-gradient text-navy-950 font-black px-12 py-5 rounded-2xl hover:scale-105 transition-all shadow-2xl shadow-gold-400/20 text-xl"
                 >
                   {ctaText}
                 </Link>
                 {!isLoggedIn && (
                   <Link to="/signin" className="w-full sm:w-auto text-white font-bold px-12 py-5 rounded-2xl hover:bg-white/5 transition-all">
                     Existing User? Sign In
                   </Link>
                 )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-[10px] font-black text-navy-500 uppercase tracking-[0.2em]">
                 <span className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> No Card Required</span>
                 <span className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Free Forever Plan</span>
                 <span className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Cancel Anytime</span>
              </div>
           </div>
        </div>
      </AnimatedSection>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 bg-navy-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gold-gradient rounded-lg flex items-center justify-center">
                 <Cross className="w-4 h-4 text-navy-950" />
              </div>
              <span className="text-xl font-bold text-white">BibleAI</span>
           </div>
           
           <div className="flex gap-8 text-[11px] font-bold text-navy-500 uppercase tracking-widest">
              <Link to="/privacy" className="hover:text-gold-400 transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-gold-400 transition-colors">Terms</Link>
              <a href="mailto:bibleaisupportcontact@gmail.com" className="hover:text-gold-400 transition-colors">Contact</a>
           </div>

           <p className="text-[11px] text-navy-600 font-medium tracking-wide">&copy; 2026 BibleAI. Built with faith & precision.</p>
        </div>
      </footer>
    </div>
  );
}
