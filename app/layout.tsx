import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Civic Voices | Social Intelligence Platform",
  description: "Insights from billions of public conversations. AI-powered social intelligence from X, TikTok, Reddit, YouTube, and more.",
  metadataBase: new URL('https://civic-voices-six.vercel.app'),
  openGraph: {
    title: "Civic Voices",
    description: "Insights from billions of public conversations.",
    siteName: "Civic Voices",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Civic Voices",
    description: "Insights from billions of public conversations.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
