import type { Metadata } from "next";
import "../src/index.css";

export const metadata: Metadata = {
  title: "Lightchain 灵感决策工作台",
  description: "Lightchain SaaS v5.2 灵感决策工作台交互原型",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
