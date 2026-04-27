import Link from "next/link";
import { BrandMark } from "@/app/components/ui/BrandMark";

export const metadata = {
  title: "HIPAA Notice of Privacy Practices — RevClear",
  description: "RevClear's HIPAA Notice of Privacy Practices for Protected Health Information.",
};

const EFFECTIVE_DATE = "April 26, 2026";
const CONTACT_EMAIL = "privacy@revclear.com";

export default function HipaaNoticePage() {
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
          <p className="text-sm uppercase tracking-[0.18em] text-teal-600 mb-3">Compliance</p>
          <h1 className="font-display text-4xl font-semibold">HIPAA Notice of Privacy Practices</h1>
          <p className="mt-3 text-slate-500 text-sm">Effective date: {EFFECTIVE_DATE}</p>
          <div className="mt-6 rounded-xl bg-teal-50 border border-teal-200 px-5 py-4 text-sm text-teal-800">
            <strong>Important:</strong> This notice describes how Protected Health Information (PHI) may be
            used and disclosed and how you can access this information. Please review it carefully.
          </div>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Our Role Under HIPAA</h2>
            <p>
              RevClear operates as a <strong>Business Associate</strong> under the Health Insurance Portability
              and Accountability Act of 1996 (HIPAA) and its implementing regulations (45 CFR Parts 160 and 164).
              We process PHI on behalf of covered healthcare providers (Covered Entities) who use our platform
              under a signed Business Associate Agreement (BAA).
            </p>
            <p className="mt-3">
              We are required by law to maintain the privacy and security of PHI, provide this notice of our
              privacy practices, notify affected individuals following a breach of unsecured PHI, and abide by
              the terms of this notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. How We Use and Disclose PHI</h2>
            <p>We use and disclose PHI only as permitted or required by the BAA and applicable law:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong>Treatment:</strong> Processing audio recordings to generate clinical transcripts and SOAP notes used in patient care documentation.</li>
              <li><strong>Payment:</strong> Generating ICD-10/CPT coded claims and transmitting them to insurance payers and clearinghouses on behalf of your organization.</li>
              <li><strong>Healthcare operations:</strong> Quality review, system performance analysis using de-identified data, and staff training.</li>
              <li><strong>As required by law:</strong> Disclosures required by federal or state law, court orders, or regulatory agencies.</li>
              <li><strong>Business Associate functions:</strong> As authorized by your organization's BAA.</li>
            </ul>
            <p className="mt-3">
              We will not use or disclose PHI for any purpose not described in this notice or the BAA without
              written authorization from your organization.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Our Safeguards</h2>
            <p>RevClear maintains the following safeguards for PHI:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong>Encryption at rest:</strong> AES-256 encryption for all PHI stored in our database and object storage.</li>
              <li><strong>Encryption in transit:</strong> TLS 1.2 or higher for all data transmission.</li>
              <li><strong>Access controls:</strong> Role-based access ensuring only authorized staff can access PHI, scoped to their organization.</li>
              <li><strong>Audit logs:</strong> Immutable logs of all PHI access, modifications, and disclosures.</li>
              <li><strong>Minimum necessary:</strong> PHI is accessed only to the extent necessary to perform services.</li>
              <li><strong>Workforce training:</strong> All staff with PHI access receive HIPAA training.</li>
              <li><strong>Breach notification:</strong> We will notify your organization of any breach of unsecured PHI without unreasonable delay, and no later than 60 calendar days after discovery, as required by the HIPAA Breach Notification Rule.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Subcontractors</h2>
            <p>
              RevClear may engage subcontractors (sub-Business Associates) to assist in providing services,
              including cloud infrastructure providers and AI model providers. We require all subcontractors
              who receive or process PHI to sign a BAA and maintain HIPAA-compliant safeguards equivalent
              to our own.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Your Organization's Rights</h2>
            <p>As a Covered Entity, your organization has the right to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Request an accounting of disclosures of PHI we have made on your behalf.</li>
              <li>Request restrictions on certain uses or disclosures of PHI.</li>
              <li>Access PHI stored in RevClear for export or audit purposes.</li>
              <li>Request amendments to PHI records.</li>
              <li>File a complaint if you believe your HIPAA rights have been violated.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Filing a Complaint</h2>
            <p>
              If you believe your privacy rights have been violated, you may file a complaint with RevClear
              or with the U.S. Department of Health and Human Services Office for Civil Rights (OCR).
              We will not retaliate against any person for filing a complaint.
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>RevClear Privacy Team: <a href={`mailto:${CONTACT_EMAIL}`} className="text-teal-600 hover:underline">{CONTACT_EMAIL}</a></li>
              <li>HHS OCR: <a href="https://www.hhs.gov/hipaa/filing-a-complaint" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">hhs.gov/hipaa/filing-a-complaint</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Changes to This Notice</h2>
            <p>
              We reserve the right to change this notice and our privacy practices at any time, provided
              the change is permitted by HIPAA. Material changes will be communicated to your organization
              at least 30 days before they take effect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Contact Our Privacy Team</h2>
            <p>
              For questions about this notice or to exercise any of the rights described above, contact:{" "}
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
