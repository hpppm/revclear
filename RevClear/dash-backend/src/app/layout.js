import { Red_Hat_Display } from "next/font/google";
import "./globals.css";

const consoleSans = Red_Hat_Display({
  variable: "--font-console",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata = {
  title: "RevClear Internal Dashboard",
  description: "Developer dashboard to exercise AWS integrations.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${consoleSans.variable} console-theme`}>
        {children}
      </body>
    </html>
  );
}
