import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "nevedelE",
  description: "Modern UI pre coso-system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans bg-neutral-950 text-neutral-100">{children}</body>
    </html>
  );
}
