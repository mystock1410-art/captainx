import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Asset Allocation",
  description: "Mô hình phân bổ danh mục theo khẩu vị rủi ro, rebalancing và benchmark tracking.",
  robots: { index: false, follow: true },
};

export default function AssetAllocationPage() {
  return (
    <ComingSoon title="Asset Allocation" glow="gold" cta>
      Trang Phân bổ tài sản đang được phát triển, sắp ra mắt với các mô hình phân bổ danh mục theo
      khẩu vị rủi ro, rebalancing và benchmark tracking theo tư vấn độc quyền của{" "}
      <span className="font-bold text-foreground">Mr X</span>.
    </ComingSoon>
  );
}
