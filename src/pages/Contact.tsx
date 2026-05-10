import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Contact() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.user_metadata?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setSending(true);
    try {
      const { error: insertError } = await supabase.from('contact_messages').insert({
        user_id: user?.id || null,
        name,
        email,
        subject,
        message,
      });

      if (insertError) throw insertError;

      setSent(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');

      setTimeout(() => setSent(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-white mb-4">Get in Touch</h1>
          <p className="text-navy-400 text-lg">
            Have feedback, suggestions, or need support? We'd love to hear from you.
          </p>
        </div>

        {/* Contact Form */}
        <div className="bg-navy-900 border border-navy-800 rounded-lg p-8">
          {sent && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-green-400">Message sent successfully!</p>
                <p className="text-sm text-green-400/80">
                  We'll get back to you at {email} within 24 hours.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="w-full bg-navy-950 border border-navy-800 rounded-lg px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-gold-400/50 transition-all"
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
                  className="w-full bg-navy-950 border border-navy-800 rounded-lg px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-gold-400/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What is this about?"
                className="w-full bg-navy-950 border border-navy-800 rounded-lg px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-gold-400/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind..."
                rows={6}
                className="w-full bg-navy-950 border border-navy-800 rounded-lg px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-gold-400/50 transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gold-gradient text-navy-950 font-bold rounded-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-navy-800">
            <p className="text-sm text-navy-400 text-center">
              Or email us directly at{' '}
              <a href="mailto:bibleaiofficialcontact@gmail.com" className="text-gold-400 hover:text-gold-300">
                bibleaiofficialcontact@gmail.com
              </a>
            </p>
          </div>
        </div>

        {/* FAQ Link */}
        <div className="mt-8 text-center">
          <p className="text-navy-400 mb-3">Still have questions?</p>
          <a href="/faq" className="text-gold-400 hover:text-gold-300 font-medium transition-colors">
            Check out our FAQ →
          </a>
        </div>
      </div>
    </div>
  );
}
