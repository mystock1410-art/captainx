import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { TickerBar } from "@/components/ticker-bar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CAPTAIN X",
  description: "Bảng theo dõi thị trường Việt Nam realtime",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <TickerBar />
          {children}
          <footer className="bar-elevated-footer">
            <div className="mx-auto flex max-w-[1600px] items-center justify-center px-3 py-3 text-center text-[9px] uppercase tracking-[0.12em] sm:px-4 sm:py-4 sm:text-[10px] sm:tracking-[0.15em]">
              <span className="cta-blink font-semibold text-gold">Integrated Market Data Terminal</span>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
