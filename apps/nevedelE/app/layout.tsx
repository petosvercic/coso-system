import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "nevedelE",
  description: "Modern UI pre coso-system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk">
      <body className="font-sans bg-neutral-950 text-neutral-100">{children}</body>
    </html>
  );
}
