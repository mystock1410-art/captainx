import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { RefreshButton } from "@/components/refresh-button";
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

const SITE_URL = "https://captainx.vn";
const SITE_DESC =
  "Theo dõi VN-Index, phái sinh VN30, chỉ số thế giới, tin tức đa nguồn và phân tích AI — realtime.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CAPTAIN X — Terminal dữ liệu thị trường",
    template: "%s · CAPTAIN X",
  },
  description: SITE_DESC,
  applicationName: "Captain X",
  keywords: ["chứng khoán", "VN-Index", "VN30", "phái sinh", "OCBS", "Captain X", "phân tích thị trường"],
  authors: [{ name: "OCBS" }],
  creator: "OCBS",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "/",
    siteName: "Captain X",
    title: "CAPTAIN X — Terminal dữ liệu thị trường",
    description: SITE_DESC,
    images: ["/ocbs-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "CAPTAIN X — Terminal dữ liệu thị trường",
    description: SITE_DESC,
    images: ["/ocbs-logo.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5ef" },
    { media: "(prefers-color-scheme: dark)", color: "#03070b" },
  ],
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
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Header />
          <TickerBar />
          {children}
          <footer className="bar-elevated-footer">
            <div className="mx-auto flex max-w-[1600px] items-center justify-center px-3 py-3 text-center text-[8px] uppercase tracking-[0.12em] sm:px-4 sm:py-4 sm:text-[8px] sm:tracking-[0.15em]">
              <span className="font-semibold text-gold">Integrated Market Data Terminal</span>
            </div>
          </footer>
          <RefreshButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
