import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-navy-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-8">
          <Link to="/" className="text-sm text-gold-400 hover:text-gold-300 transition-colors">
            Back to home
          </Link>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-white">Privacy Policy</h1>
          <p className="mt-2 text-sm text-navy-300">Last updated: May 9, 2026</p>
        </div>

        <div className="space-y-6 text-sm text-navy-200 leading-relaxed">
          <section className="bg-navy-900/50 border border-navy-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Data Collection Practices</h2>
            <p>
              BibleAI collects account information such as your name and email address, along with app
              activity like chat messages, prayer journal entries, and devotional interactions to provide
              and improve the service.
            </p>
            <p className="mt-3">
              We also collect basic technical and usage data (for example device/browser information and
              analytics events) to monitor reliability, prevent abuse, and understand feature usage.
            </p>
            <p className="mt-3">
              We do not sell your personal data. Your private spiritual content is stored securely and
              access-controlled to your account.
            </p>
          </section>

          <section className="bg-navy-900/50 border border-navy-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">How We Use Data</h2>
            <p>
              We use your data to authenticate your account, deliver Bible chat and journaling features,
              personalize your experience, process subscriptions, and provide customer support.
            </p>
          </section>

          <section className="bg-navy-900/50 border border-navy-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
            <p>
              If you have privacy questions or requests, contact us at{' '}
              <a href="mailto:bibleaisupportcontact@gmail.com" className="text-gold-400 hover:text-gold-300">
                bibleaisupportcontact@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
