import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Valuation",
  description: "DCF, P/E sector benchmark và các mô hình định giá nội tại theo từng doanh nghiệp.",
  robots: { index: false, follow: true },
};

export default function ValuationPage() {
  return (
    <ComingSoon title="Valuation">
      Trang Định giá đang được phát triển. Sắp ra mắt với DCF, P/E sector benchmark và các mô hình
      định giá nội tại theo từng doanh nghiệp.
    </ComingSoon>
  );
}
