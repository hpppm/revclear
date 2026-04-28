import Link from "next/link";
import { BrandMark } from "@/app/components/ui/BrandMark";

export const metadata = {
  title: "Cookie Policy — RevClear",
  description: "How RevClear uses cookies and similar technologies.",
};

const EFFECTIVE_DATE = "April 26, 2026";
const CONTACT_EMAIL = "privacy@revclear.com";

export default function CookiePolicyPage() {
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
          <h1 className="font-display text-4xl font-semibold">Cookie Policy</h1>
          <p className="mt-3 text-slate-500 text-sm">Effective date: {EFFECTIVE_DATE}</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. What Are Cookies</h2>
            <p>
              Cookies are small text files placed on your device when you visit a website. They help the site
              remember your preferences and actions over time. RevClear uses cookies strictly to operate the
              platform securely — we do not use advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Cookies We Use</h2>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="px-4 py-2 border border-slate-200 font-semibold">Cookie</th>
                    <th className="px-4 py-2 border border-slate-200 font-semibold">Type</th>
                    <th className="px-4 py-2 border border-slate-200 font-semibold">Purpose</th>
                    <th className="px-4 py-2 border border-slate-200 font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 border border-slate-200 font-mono text-xs">accessToken</td>
                    <td className="px-4 py-2 border border-slate-200">Essential</td>
                    <td className="px-4 py-2 border border-slate-200">JWT authentication token. httpOnly, not accessible by JavaScript.</td>
                    <td className="px-4 py-2 border border-slate-200">1 hour</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-4 py-2 border border-slate-200 font-mono text-xs">refreshToken</td>
                    <td className="px-4 py-2 border border-slate-200">Essential</td>
                    <td className="px-4 py-2 border border-slate-200">Used to obtain new access tokens without re-login. httpOnly.</td>
                    <td className="px-4 py-2 border border-slate-200">30 days</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-slate-200 font-mono text-xs">sidebar-collapsed</td>
                    <td className="px-4 py-2 border border-slate-200">Functional</td>
                    <td className="px-4 py-2 border border-slate-200">Remembers your sidebar preference across sessions. Stored in localStorage, not a cookie.</td>
                    <td className="px-4 py-2 border border-slate-200">Persistent</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. What We Do Not Use</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Third-party advertising cookies</li>
              <li>Cross-site tracking pixels</li>
              <li>Analytics cookies from third-party providers (e.g. Google Analytics)</li>
              <li>Social media tracking cookies</li>
            </ul>
            <p className="mt-3">
              RevClear is a clinical platform handling PHI. We deliberately minimize all non-essential data
              collection in line with HIPAA's minimum necessary principle.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Managing Cookies</h2>
            <p>
              Essential authentication cookies are required for the platform to function. You may clear them
              via your browser settings, but doing so will sign you out. For localStorage preferences (sidebar
              state), you can clear site data in your browser developer tools under Application → Local Storage.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Contact</h2>
            <p>
              Questions about our cookie use? Contact us at{" "}
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
