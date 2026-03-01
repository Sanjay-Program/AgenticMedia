import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgenticMedia — Enterprise Creator OS',
  description: 'Autonomous AI operating system for enterprise creators and talent agencies.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0a0f] text-gray-200 antialiased">
        {children}
      </body>
    </html>
  );
}
