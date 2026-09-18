import type { Metadata } from "next";
import { Figtree, Syne } from "next/font/google";
import Link from "next/link";
import { AccountNav } from "@/components/AccountNav";
import "./globals.css";

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PriceDrop — Know when to buy",
  description:
    "Paste a product link. PriceDrop analyzes price history and tells you whether to buy now, wait, or avoid.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6 sm:px-8">
          <Link href="/" className="group">
            <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--ink)]">
              PriceDrop
            </span>
            <span className="mt-0.5 block text-xs text-[var(--muted)] transition group-hover:text-[var(--ink-soft)]">
              Know when to buy
            </span>
          </Link>
          <AccountNav />
        </header>
        <main className="flex-1 px-5 sm:px-8">{children}</main>
      </body>
    </html>
  );
}
