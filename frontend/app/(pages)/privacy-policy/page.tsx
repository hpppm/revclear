import Link from "next/link";
import { BrandMark } from "@/app/components/ui/BrandMark";

export const metadata = {
  title: "Privacy Policy — RevClear",
  description: "How RevClear collects, uses, and protects your information.",
};

const EFFECTIVE_DATE = "April 26, 2026";
const CONTACT_EMAIL = "privacy@revclear.com";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-white/20 bg-white/70 backdrop-blur">
        <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark size="md" />
            <span className="font-display text-2xl font-semibold">RevClear</span>
          </Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-teal-600 transition-colors">
            Sign In
          </Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <p className="text-sm uppercase tracking-[0.18em] text-teal-600 mb-3">Legal</p>
          <h1 className="font-display text-4xl font-semibold">Privacy Policy</h1>
          <p className="mt-3 text-slate-500 text-sm">Effective date: {EFFECTIVE_DATE}</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Who We Are</h2>
            <p>
              RevClear ("we," "our," or "us") is an AI-assisted medical claims and transcription platform
              designed for licensed healthcare providers. This Privacy Policy explains how we collect, use,
              store, and protect information when you use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account information:</strong> name, email address, organization name, and role.</li>
              <li><strong>Patient health information (PHI):</strong> patient demographics, encounter records, transcripts, SOAP notes, ICD/CPT codes, and insurance details entered by authorized clinicians.</li>
              <li><strong>Audio recordings:</strong> visit audio files uploaded or recorded within the platform for transcription purposes.</li>
              <li><strong>Usage data:</strong> log files, IP addresses, browser type, pages visited, and feature interactions for security and performance monitoring.</li>
              <li><strong>Cookies:</strong> session cookies for authentication. See our <Link href="/cookie-policy" className="text-teal-600 hover:underline">Cookie Policy</Link> for details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide, operate, and improve the RevClear platform.</li>
              <li>To generate transcripts, SOAP notes, and medical billing codes from encounter audio.</li>
              <li>To facilitate insurance claims processing on behalf of your organization.</li>
              <li>To authenticate users and enforce role-based access controls.</li>
              <li>To detect, investigate, and prevent security incidents and fraud.</li>
              <li>To comply with applicable legal obligations including HIPAA.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. HIPAA & Protected Health Information</h2>
            <p>
              RevClear acts as a <strong>Business Associate</strong> under the Health Insurance Portability
              and Accountability Act (HIPAA) when processing PHI on behalf of covered healthcare providers.
              We maintain appropriate administrative, physical, and technical safeguards for PHI, including:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>AES-256 encryption of PHI at rest and TLS 1.2+ in transit.</li>
              <li>Role-based access controls limiting PHI access to authorized personnel only.</li>
              <li>Audit logging of all PHI access and modifications.</li>
              <li>Minimum necessary access principles.</li>
            </ul>
            <p className="mt-3">
              For our full HIPAA practices, see our <Link href="/hipaa-notice" className="text-teal-600 hover:underline">HIPAA Notice of Privacy Practices</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. How We Share Information</h2>
            <p>We do not sell your personal information. We may share information with:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong>Service providers:</strong> cloud infrastructure (AWS), AI transcription services, and clearinghouses — only to the extent necessary and under data processing agreements.</li>
              <li><strong>Insurance payers and clearinghouses:</strong> claim data as directed by your organization for billing.</li>
              <li><strong>Law enforcement or regulators:</strong> when required by applicable law or valid legal process.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Data Retention</h2>
            <p>
              We retain PHI and encounter data for as long as required by applicable law (typically a minimum of
              6 years under HIPAA) or as specified in your Business Associate Agreement. Account data is retained
              for the duration of your organization's subscription and for 30 days after termination to allow
              data export.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have rights to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Access, correct, or delete your account information.</li>
              <li>Request a copy of data we hold about you.</li>
              <li>Withdraw consent where processing is based on consent.</li>
              <li>Lodge a complaint with a supervisory authority.</li>
            </ul>
            <p className="mt-3">To exercise these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-teal-600 hover:underline">{CONTACT_EMAIL}</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Security</h2>
            <p>
              We use industry-standard security measures including encryption, access controls, audit logging,
              and regular security reviews. No system is completely secure — please notify us immediately at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-teal-600 hover:underline">{CONTACT_EMAIL}</a>{" "}
              if you suspect a security incident.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this policy periodically. We will notify organization administrators of material
              changes via email at least 30 days before they take effect. Continued use of RevClear after
              that date constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Contact</h2>
            <p>
              Questions about this policy? Contact our Privacy Team at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-teal-600 hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <p>© 2026 RevClear. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy-policy" className="hover:text-teal-600 transition-colors">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-teal-600 transition-colors">Terms of Service</Link>
            <Link href="/cookie-policy" className="hover:text-teal-600 transition-colors">Cookie Policy</Link>
            <Link href="/hipaa-notice" className="hover:text-teal-600 transition-colors">HIPAA Notice</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
