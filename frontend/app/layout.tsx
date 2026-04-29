import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { headers } from "next/headers";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${bodyFont.variable} ${displayFont.variable} font-body antialiased`}
        suppressHydrationWarning
        {...(nonce ? { "data-nonce": nonce } : {})}
      >
        <ServerActionErrorBoundary>
          <AuthProvider>{children}</AuthProvider>
        </ServerActionErrorBoundary>
      </body>
    </html>
  );
}
