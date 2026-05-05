import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RevClear",
    template: "%s | RevClear",
  },
  description: "AI-assisted medical billing and claims platform",
};

import { AuthProvider } from "@/app/context/AuthContext";
import ServerActionErrorBoundary from "@/app/components/ServerActionErrorBoundary";
import { Toaster } from "sonner";

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${bodyFont.variable} ${displayFont.variable} font-body antialiased`}
        suppressHydrationWarning
      >
        <ServerActionErrorBoundary>
          <AuthProvider>{children}</AuthProvider>
        </ServerActionErrorBoundary>
        <Toaster position="top-right" richColors closeButton duration={4000} />
      </body>
    </html>
  );
}
