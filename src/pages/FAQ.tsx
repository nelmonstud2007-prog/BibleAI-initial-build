import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqItems: FAQItem[] = [
  {
    id: '1',
    category: 'General',
    question: 'What is BibleAI?',
    answer:
      'BibleAI is an AI-powered platform designed to deepen your spiritual journey. It combines the full text of the Bible with advanced AI insights, prayer journaling, daily devotionals, and a supportive community forum.',
  },
  {
    id: '2',
    category: 'General',
    question: 'Is BibleAI free?',
    answer:
      'Yes! BibleAI offers a free plan with limited daily AI messages (5 per day). For unlimited access, prayer analytics, and early feature access, upgrade to BibleAI Pro for $4.99/month.',
  },
  {
    id: '3',
    category: 'Features',
    question: 'How does the Bible Chat work?',
    answer:
      'Bible Chat is an AI-powered conversation tool that answers your questions about Scripture, theology, prayer, and faith. It understands context from your bookmarks and prayer history to provide personalized insights.',
  },
  {
    id: '4',
    category: 'Features',
    question: 'Can I save verses?',
    answer:
      'Absolutely! You can bookmark any verse in the Bible reader. Your bookmarks are saved to your profile and can be accessed anytime. Pro members get unlimited bookmarks and can organize them into collections.',
  },
  {
    id: '5',
    category: 'Features',
    question: 'What is the Prayer Journal?',
    answer:
      'The Prayer Journal is a sacred space to record your prayers and track answered prayers. You can categorize prayers by topic (Health, Family, Finance, etc.) and see your prayer history over time.',
  },
  {
    id: '6',
    category: 'Community',
    question: 'What is the Community Forum?',
    answer:
      'The Community Forum is a space where users can ask questions, share testimonies, request prayers, and discuss Scripture. All posts are moderated to ensure a respectful, safe environment.',
  },
  {
    id: '7',
    category: 'Community',
    question: 'Can I share verses with others?',
    answer:
      'Yes! You can generate beautiful, branded verse images and share them via a custom link. When shared on social media, they display as rich preview cards with the verse text and your message.',
  },
  {
    id: '8',
    category: 'Account',
    question: 'How do I change my username?',
    answer:
      'You can change your username once every 7 days from your Profile Settings. Your full name is kept private and not displayed publicly.',
  },
  {
    id: '9',
    category: 'Account',
    question: 'Is my data private?',
    answer:
      'Yes. BibleAI uses enterprise-grade encryption and Row Level Security (RLS) to ensure only you can access your prayers, bookmarks, and personal data. We never share your information with third parties.',
  },
  {
    id: '10',
    category: 'Account',
    question: 'How do I upgrade to Pro?',
    answer:
      'You can upgrade to Pro from your Settings page. Click "Upgrade to Pro" and follow the payment process. Your subscription will renew automatically each month.',
  },
  {
    id: '11',
    category: 'Technical',
    question: 'Does BibleAI work offline?',
    answer:
      'Yes! BibleAI is a Progressive Web App (PWA). Once you\'ve visited the site, it caches the Bible text and your recent content, allowing you to read offline. Syncing happens automatically when you reconnect.',
  },
  {
    id: '12',
    category: 'Technical',
    question: 'What Bible translation do you use?',
    answer:
      'BibleAI uses the King James Version (KJV) and other public domain translations. We plan to add more translations in the future.',
  },
];

export default function FAQ() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...new Set(faqItems.map((item) => item.category))];
  const filteredItems = selectedCategory === 'All' ? faqItems : faqItems.filter((item) => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-navy-950 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-white mb-4">Frequently Asked Questions</h1>
          <p className="text-navy-400 text-lg">Find answers to common questions about BibleAI</p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/50'
                  : 'bg-navy-900 text-navy-400 border border-navy-800 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-navy-900 border border-navy-800 rounded-lg overflow-hidden hover:border-gold-400/30 transition-all"
            >
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-navy-950/50 transition-colors"
              >
                <div className="text-left flex-1">
                  <p className="text-xs font-bold text-gold-400 uppercase tracking-wider mb-1">{item.category}</p>
                  <p className="text-white font-bold">{item.question}</p>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gold-400 flex-shrink-0 transition-transform ${
                    expandedId === item.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedId === item.id && (
                <div className="px-4 pb-4 border-t border-navy-800 pt-4 bg-navy-950/30">
                  <p className="text-navy-200 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 p-6 bg-navy-900 border border-navy-800 rounded-lg text-center">
          <h3 className="text-xl font-bold text-white mb-2">Didn't find your answer?</h3>
          <p className="text-navy-400 mb-4">
            Have a question that's not covered here? Reach out to our support team.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gold-gradient text-navy-950 font-bold rounded-lg hover:scale-105 active:scale-95 transition-all"
          >
            Contact Us
          </a>
        </div>
      </div>
    </div>
  );
}
