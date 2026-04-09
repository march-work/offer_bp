import type { Metadata } from 'next';
import './globals.css';
import { CompareProvider } from '@/lib/compare-store';

export const metadata: Metadata = {
  title: 'Offer BP — 这 offer 接不接？',
  description: '应届生 Offer 评测器 & 跳槽决策评测器，帮你量化分析 offer 的真实价值',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <CompareProvider>
          {children}
        </CompareProvider>
      </body>
    </html>
  );
}
