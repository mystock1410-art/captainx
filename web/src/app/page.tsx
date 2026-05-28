import { Header } from "@/components/header";
import { TickerBar } from "@/components/ticker-bar";
import { ChartsGrid } from "@/components/charts-grid";
import { LiveFeed } from "@/components/live-feed";
import { Headlines } from "@/components/headlines";
import { MarketBriefPanel } from "@/components/market-brief";

const VN_LIVE_SOURCES = ["Cafef", "Vietstock", "Vietnambiz"] as const;
const VN_HEADLINE_SOURCES = ["VnExpress", "FireAnt"] as const;
const EN_LIVE_SOURCES = ["AJ", "CNN", "WSJ"] as const;
const EN_HEADLINE_SOURCES = ["MKT", "INV"] as const;

export default function Page() {
  return (
    <>
      <Header />
      <TickerBar />
      <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-6 px-4 py-4">
        <ChartsGrid />

        <MarketBriefPanel />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LiveFeed title="Tin trong nước" sources={VN_LIVE_SOURCES} variant="vi" />
          <Headlines title="Tin nhanh trong nước" sources={VN_HEADLINE_SOURCES} variant="vi" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LiveFeed title="Tin quốc tế" sources={EN_LIVE_SOURCES} variant="en" />
          <Headlines title="Tin nhanh quốc tế" sources={EN_HEADLINE_SOURCES} variant="en" />
        </div>
      </main>
      <footer className="border-t border-border py-3 text-center text-xs text-muted-foreground">
        Captain X · Cafef · SSI iBoard · Yahoo Finance · AJ/CNN/WSJ · MarketWatch · Investing.com
      </footer>
    </>
  );
}
