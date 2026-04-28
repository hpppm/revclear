import Link from "next/link";
import { BrandMark } from "@/app/components/ui/BrandMark";

export const metadata = {
  title: "Terms of Service — RevClear",
  description: "Terms and conditions governing your use of RevClear.",
};

const EFFECTIVE_DATE = "April 26, 2026";
const CONTACT_EMAIL = "legal@revclear.com";

export default function TermsOfServicePage() {
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
          <h1 className="font-display text-4xl font-semibold">Terms of Service</h1>
          <p className="mt-3 text-slate-500 text-sm">Effective date: {EFFECTIVE_DATE}</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing or using RevClear ("the Platform"), you agree to be bound by these Terms of Service
              and all applicable laws and regulations. If you do not agree, do not use the Platform. These terms
              apply to all users including administrators, clinicians, billing staff, and any other authorized
              personnel within your organization.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Description of Service</h2>
            <p>
              RevClear is a software platform that provides AI-assisted medical transcription, SOAP note
              generation, clinical coding suggestions (ICD-10/CPT), and insurance claims preparation for
              licensed healthcare providers. The Platform is intended for use by credentialed healthcare
              organizations and their authorized staff only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Eligibility & Account Registration</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You must be at least 18 years old and authorized to act on behalf of a licensed healthcare organization.</li>
              <li>You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.</li>
              <li>You must notify us immediately of any unauthorized access to your account.</li>
              <li>Organization administrators are responsible for managing user roles and revoking access for departing staff.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Use the Platform for any purpose other than legitimate clinical documentation and billing.</li>
              <li>Upload audio recordings without patient consent as required by applicable law.</li>
              <li>Attempt to reverse-engineer, decompile, or extract AI models or proprietary algorithms.</li>
              <li>Share login credentials with unauthorized individuals.</li>
              <li>Introduce malware or attempt to compromise platform security.</li>
              <li>Use AI-generated outputs (SOAP notes, codes) without clinician review and sign-off.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. AI-Generated Content Disclaimer</h2>
            <p>
              RevClear uses artificial intelligence to assist with transcription, clinical note generation, and
              code suggestions. <strong>AI outputs are not a substitute for professional clinical judgment.</strong>{" "}
              All AI-generated content must be reviewed, verified, and approved by a licensed clinician before
              use in patient records or submitted claims. RevClear is not liable for clinical decisions made
              based on unreviewed AI outputs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. HIPAA Compliance</h2>
            <p>
              Your organization is a Covered Entity under HIPAA. RevClear operates as your Business Associate.
              By using the Platform, you agree to execute a Business Associate Agreement (BAA) with RevClear
              prior to transmitting any Protected Health Information (PHI). Use of the Platform to process PHI
              without a signed BAA is prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Intellectual Property</h2>
            <p>
              RevClear and its underlying technology, branding, and software are owned by RevClear and protected
              by applicable intellectual property laws. You retain ownership of your patient data and clinical
              content. You grant RevClear a limited license to process your data solely to provide the Platform
              services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Billing & Subscriptions</h2>
            <p>
              Subscription fees, payment terms, and refund policies are specified in your organization's service
              agreement. Failure to pay may result in suspension of access. All fees are exclusive of applicable
              taxes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, RevClear shall not be liable for any indirect, incidental,
              special, or consequential damages arising from your use of the Platform, including but not limited
              to claim denials, coding errors, or data loss. Our aggregate liability shall not exceed the fees
              paid by your organization in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Termination</h2>
            <p>
              Either party may terminate the service agreement with 30 days written notice. RevClear may
              suspend or terminate access immediately for material breaches, including HIPAA violations or
              non-payment. Upon termination, you have 30 days to export your data before it is deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">11. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of Delaware, without regard to conflict of law
              principles. Any disputes shall be resolved by binding arbitration in accordance with the American
              Arbitration Association rules.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">12. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. Material changes will be communicated to organization
              administrators via email at least 30 days in advance. Continued use of the Platform after the
              effective date constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">13. Contact</h2>
            <p>
              Legal questions? Contact us at{" "}
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
