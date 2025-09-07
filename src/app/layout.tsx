import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import ClientLayout from './client-layout';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PWA Quản lý Tiền có AI",
  description: "A PWA for personal money management, enhanced with AI capabilities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="bg-gray-800 p-4">
          <ul className="flex space-x-4">
            <li>
              <Link href="/" className="text-white hover:text-gray-300">
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/transactions" className="text-white hover:text-gray-300">
                Giao dịch
              </Link>
            </li>
            <li>
              <Link href="/add-transaction" className="text-white hover:text-gray-300">
                Thêm Giao dịch (AI)
              </Link>
            </li>
            <li>
              <Link href="/ai-query" className="text-white hover:text-gray-300">
                Hỏi AI
              </Link>
            </li>
            <li>
              <Link href="/settings" className="text-white hover:text-gray-300">
                Cài đặt
              </Link>
            </li>
            {/* Add other navigation links here as needed */}
          </ul>
        </nav>
        <ClientLayout>{children}</ClientLayout>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/firebase-messaging-sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
