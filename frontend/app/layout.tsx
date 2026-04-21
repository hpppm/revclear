import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body antialiased" suppressHydrationWarning>
        <ServerActionErrorBoundary>
          <AuthProvider>{children}</AuthProvider>
        </ServerActionErrorBoundary>
      </body>
    </html>
  );
}
