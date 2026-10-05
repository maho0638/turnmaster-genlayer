import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TurnMaster — Work Board",
  description: "Set clear terms, submit verifiable work, and resolve delivery disputes on GenLayer testnet.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
