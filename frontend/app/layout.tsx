import type { Metadata } from "next";
import { DM_Serif_Display, Source_Sans_3, Source_Code_Pro } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
});

const sourceMono = Source_Code_Pro({
  variable: "--font-source-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RevClear | Medical Billing & Documentation",
  description: "Streamlined documentation, claims, and billing workflows for modern clinics.",
};

import { AuthProvider } from "@/app/context/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress SES_UNCAUGHT_EXCEPTION errors
              (function() {
                const originalError = console.error;
                console.error = function(...args) {
                  if (args[0]?.includes?.('SES_UNCAUGHT_EXCEPTION')) {
                    return;
                  }
                  originalError.apply(console, args);
                };
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${sourceSans.variable} ${dmSerif.variable} ${sourceMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
