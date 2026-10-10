import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Stock Analysis",
  description: "Screener kỹ thuật, định giá tương đối và scoring nội tại theo từng mã cổ phiếu.",
  robots: { index: false, follow: true },
};

export default function StockAnalysisPage() {
  return (
    <ComingSoon title="Stock Analysis">
      Trang Phân tích Cổ phiếu đang được phát triển. Sắp ra mắt với các công cụ screener kỹ thuật,
      định giá tương đối và scoring nội tại theo từng mã.
    </ComingSoon>
  );
}
