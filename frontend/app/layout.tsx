import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RevClear",
    template: "%s | RevClear",
  },
  description: "AI-assisted medical billing and claims platform",
};

import { AuthProvider } from "@/app/context/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body antialiased" suppressHydrationWarning>
        {/* Error suppression script moved to external file for CSP compliance */}
        <Script src="/suppress-errors.js" strategy="afterInteractive" />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
