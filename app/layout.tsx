import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { sitePath } from "@/lib/site-path";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://seal-kaist.github.io";

export const dynamic = "force-static";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SEAL — Scalable & Efficient AI Lab at KAIST",
    template: "%s — SEAL at KAIST",
  },
  description:
    "The Scalable & Efficient AI Lab at KAIST studies efficient foundation models, scalable AI systems, and reasoning agents.",
  icons: {
    icon: sitePath("/seal-logo.png"),
  },
  openGraph: {
    title: "SEAL — Scalable & Efficient AI Lab at KAIST",
    description:
      "A research group at KAIST studying efficient foundation models, scalable systems, and reasoning agents.",
    url: sitePath("/"),
    siteName: "SEAL at KAIST",
    type: "website",
    images: [
      {
        url: sitePath("/og.png"),
        width: 1200,
        height: 630,
        alt: "SEAL — Scalable & Efficient AI Lab at KAIST",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SEAL — Scalable & Efficient AI Lab at KAIST",
    description:
      "A research group at KAIST studying efficient foundation models, scalable systems, and reasoning agents.",
    images: [sitePath("/og.png")],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
