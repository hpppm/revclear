import type { Metadata } from "next";
import "./globals.css";

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:wght@400&family=Source+Code+Pro:wght@200..900&family=Source+Sans+3:wght@200..900&display=swap"
        />
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Clear stale service workers in local dev to avoid blank screens.
              (function() {
                if (location.hostname === 'localhost' && 'serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    regs.forEach(function(reg) { reg.unregister(); });
                  });
                  if (window.caches && caches.keys) {
                    caches.keys().then(function(keys) {
                      keys.forEach(function(key) { caches.delete(key); });
                    });
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
