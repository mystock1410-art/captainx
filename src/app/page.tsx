import { ChartsGrid } from "@/components/charts-grid";
import { DerivativesGrid } from "@/components/derivatives-grid";
import { WorldTicker } from "@/components/world-ticker";
import { NewsPanel } from "@/components/news-panel";
import { MarketBriefPanel } from "@/components/market-brief";

const VN_LIVE_SOURCES = ["Cafef", "Vietstock", "Vietnambiz"] as const;
const VN_HEADLINE_SOURCES = ["VnExpress", "FireAnt"] as const;
const EN_LIVE_SOURCES = ["AJ", "CNN", "WSJ"] as const;
const EN_HEADLINE_SOURCES = ["MKT", "INV"] as const;

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-6 px-4 py-4">
      <DerivativesGrid />

      <ChartsGrid />

      <WorldTicker />

      <MarketBriefPanel />

      <div className="grid grid-cols-1 gap-x-4 gap-y-6 lg:grid-cols-2 lg:gap-y-0 lg:grid-rows-[auto_auto_1fr]">
        <NewsPanel
          title="Thông tin trong nước"
          liveSources={VN_LIVE_SOURCES}
          headlineSources={VN_HEADLINE_SOURCES}
          variant="vi"
        />
        <NewsPanel
          title="Thông tin quốc tế"
          liveSources={EN_LIVE_SOURCES}
          headlineSources={EN_HEADLINE_SOURCES}
          variant="en"
        />
      </div>
    </main>
  );
}
