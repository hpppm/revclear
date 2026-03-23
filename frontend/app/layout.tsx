import type { Metadata } from "next";
import { Inter, DM_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "RevClear — Clinical Billing Intelligence",
  description: "AI-assisted medical claims and speech transcription for healthcare billing workflows.",
};

import { AuthProvider } from "@/app/context/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        {/* Error suppression script moved to external file for CSP compliance */}
        <Script src="/suppress-errors.js" strategy="afterInteractive" />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
