import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zi Wei Dou Shu ?? + ??K?",
  description: "MVP prototype for Zi Wei Dou Shu charting and life kline."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

