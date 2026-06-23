import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "نظام إدارة عقود الإيجار",
  description: "نظام لإدارة عقود الإيجار (المستأجَرة والمؤجَّرة) والدفعات والموافقات",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
