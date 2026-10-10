import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";
import "./spin.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: { default: "LearnLoop AI — Learn with purpose", template: "%s · LearnLoop AI" },
  description: "Turn Python learning gaps into clear next steps through diagnosis, practice, and fresh reassessment.",
  applicationName: "LearnLoop AI",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${manrope.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
