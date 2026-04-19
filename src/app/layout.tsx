import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Random Pic API - 随机图片 API',
  description: '随机图片 API 服务 - 提供图片随机跳转、JSON 输出、分类筛选等功能',
  keywords: 'random image api, 随机图片, 随机壁纸, wallpaper api',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}