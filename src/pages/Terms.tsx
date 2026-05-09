import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-navy-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-8">
          <Link to="/" className="text-sm text-gold-400 hover:text-gold-300 transition-colors">
            Back to home
          </Link>
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-white">Terms of Service</h1>
          <p className="mt-2 text-sm text-navy-300">Last updated: May 9, 2026</p>
        </div>

        <div className="space-y-6 text-sm text-navy-200 leading-relaxed">
          <section className="bg-navy-900/50 border border-navy-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Subscription Terms</h2>
            <p>
              BibleAI offers free and paid subscription plans. Paid subscriptions renew automatically at
              the selected billing interval (monthly or yearly) until canceled.
            </p>
            <p className="mt-3">
              Pricing, features, and limits may be updated over time. Any material pricing changes will
              be communicated before renewal where required.
            </p>
          </section>

          <section className="bg-navy-900/50 border border-navy-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Cancellation Policy</h2>
            <p>
              You may cancel your subscription at any time. After cancellation, your paid access remains
              active until the end of the current billing period, and then your account transitions to
              the free plan.
            </p>
            <p className="mt-3">
              Unless required by law, fees already paid are non-refundable for the active billing
              period.
            </p>
          </section>

          <section className="bg-navy-900/50 border border-navy-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Acceptable Use</h2>
            <p>
              You agree not to misuse the service, attempt unauthorized access, or use BibleAI in ways
              that violate applicable laws or third-party rights.
            </p>
          </section>

          <section className="bg-navy-900/50 border border-navy-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
            <p>
              For billing or terms questions, email{' '}
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
