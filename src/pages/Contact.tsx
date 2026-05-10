import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Send, CheckCircle2, AlertCircle, Mail, MessageSquare, Clock } from 'lucide-react';

const SUBJECT_OPTIONS = [
  'General Feedback',
  'Bug Report',
  'Feature Request',
  'Billing / Subscription',
  'Account Issue',
  'Content Concern',
  'Other',
];

const MAX_MESSAGE_CHARS = 1000;

export default function Contact() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.user_metadata?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Anti-bot field
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const charsLeft = MAX_MESSAGE_CHARS - message.length;
  const isOverLimit = charsLeft < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (isOverLimit) {
      setError(`Message must be under ${MAX_MESSAGE_CHARS} characters.`);
      return;
    }

    setSending(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('contact-form', {
        body: { name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim(), honeypot },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setSent(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      const msg = err.message || 'Failed to send message. Please try again.';
      if (msg.includes('Too many')) {
        setError('You\'ve sent too many messages recently. Please wait a while before trying again.');
      } else {
        setError(msg);
      }
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Message Sent!</h2>
          <p className="text-navy-400 mb-6">
            Thanks for reaching out. We'll get back to you at <span className="text-gold-400">{user?.email}</span> within 24 hours.
          </p>
          <button
            onClick={() => setSent(false)}
            className="px-6 py-3 bg-gold-gradient text-navy-950 font-bold rounded-xl hover:scale-105 transition-all"
          >
            Send Another Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gold-400/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-8 h-8 text-gold-400" />
          </div>
          <h1 className="text-4xl font-black text-white mb-4">Get in Touch</h1>
          <p className="text-navy-400 text-lg">
            Have feedback, a bug report, or need support? We read every message.
          </p>
        </div>

        {/* Contact Form */}
        <div className="bg-navy-900 border border-navy-800 rounded-2xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Honeypot field — hidden from real users */}
            <input
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full bg-navy-950 border border-navy-800 rounded-xl px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-gold-400/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full bg-navy-950 border border-navy-800 rounded-xl px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-gold-400/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full bg-navy-950 border border-navy-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-400/50 transition-all"
              >
                <option value="">Select a subject...</option>
                {SUBJECT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider">
                  Message
                </label>
                <span className={`text-xs font-medium ${isOverLimit ? 'text-red-400' : charsLeft < 100 ? 'text-amber-400' : 'text-navy-500'}`}>
                  {charsLeft} characters remaining
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind..."
                rows={6}
                required
                className={`w-full bg-navy-950 border rounded-xl px-4 py-3 text-white placeholder-navy-500 focus:outline-none transition-all resize-none ${
                  isOverLimit ? 'border-red-500/50 focus:border-red-400' : 'border-navy-800 focus:border-gold-400/50'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={sending || isOverLimit}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gold-gradient text-navy-950 font-bold rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Send className="w-5 h-5" />
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-navy-800 space-y-3">
            <div className="flex items-center gap-3 text-sm text-navy-400">
              <Mail className="w-4 h-4 text-gold-400 flex-shrink-0" />
              <span>Or email us directly at{' '}
                <a href="mailto:bibleaiofficialcontact@gmail.com" className="text-gold-400 hover:text-gold-300 transition-colors">
                  bibleaiofficialcontact@gmail.com
                </a>
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-navy-400">
              <Clock className="w-4 h-4 text-gold-400 flex-shrink-0" />
              <span>We typically respond within 24 hours.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
