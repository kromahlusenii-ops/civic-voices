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
  title: "Civic Voices | Social Listening for Cities",
  description: "Understand resident sentiment in real time. Search what residents are saying across X, TikTok, YouTube, and more.",
  metadataBase: new URL('https://civic-voices-six.vercel.app'),
  openGraph: {
    title: "Civic Voices - Social Listening for Cities",
    description: "Understand resident sentiment in real time. Search what residents are saying across X, TikTok, YouTube, and more.",
    siteName: "Civic Voices",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Civic Voices - Social Listening for Cities",
    description: "Understand resident sentiment in real time. Search what residents are saying across X, TikTok, YouTube, and more.",
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
