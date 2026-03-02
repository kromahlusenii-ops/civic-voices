import type { Metadata } from "next";
import { DM_Sans, DM_Mono, Anybody } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Providers } from "./providers";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

const anybody = Anybody({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-anybody",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Civic Voices | Social Listening for Cities",
  description: "Understand resident sentiment in real time. Search what residents are saying across X, TikTok, YouTube, and more.",
  metadataBase: new URL('https://civicvoices.ai'),
  openGraph: {
    title: "Civic Voices - Social Listening for Cities",
    description: "Understand resident sentiment in real time. Search what residents are saying across X, TikTok, YouTube, and more.",
    siteName: "Civic Voices",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Civic Voices - Social Listening for Cities",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Civic Voices - Social Listening for Cities",
    description: "Understand resident sentiment in real time. Search what residents are saying across X, TikTok, YouTube, and more.",
    images: ["/twitter-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable} ${anybody.variable}`}>
      <body className="font-body antialiased">
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
