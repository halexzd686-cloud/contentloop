import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif_SC, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

/* M7 typography: Sans primary (Chinese UI/body), Serif selective
   (Chinese editorial), Cormorant Garamond for the ContentLoop wordmark. */
const notoSans = Noto_Sans_SC({
  variable: "--font-noto-sans",
  display: "swap",
});

const notoSerif = Noto_Serif_SC({
  variable: "--font-noto-serif",
  weight: ["400", "600"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ContentLoop",
  description: "面向 3–5 人内容团队的 AI 内容运营工作台",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${notoSans.variable} ${notoSerif.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
