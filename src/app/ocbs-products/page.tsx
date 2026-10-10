import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "OCBS Products",
  description: "Catalog sản phẩm tài chính OCBS và thị trường Việt Nam — ký quỹ, trái phiếu, quỹ, tokenized assets.",
  robots: { index: false, follow: true },
};

export default function OcbsProductsPage() {
  return (
    <ComingSoon title="OCBS Products" glow="brand" cta>
      Cung cấp toàn bộ thông tin về các <span className="font-bold text-foreground">sản phẩm tài chính</span>{" "}
      đang có trên thị trường Việt Nam nói chung và từ{" "}
      <span className="font-bold text-foreground">OCBS</span> nói riêng — từ các sản phẩm đơn giản như{" "}
      <span className="font-bold text-foreground">giao dịch ký quỹ</span>,{" "}
      <span className="font-bold text-foreground">chứng chỉ tiền gửi</span>, sổ tiết kiệm… đến các sản
      phẩm đầu tư phức tạp như <span className="font-bold text-foreground">trái phiếu cấu trúc</span>,
      chứng chỉ quỹ, sản phẩm money market, cấu trúc bất động sản,{" "}
      <span className="font-bold text-foreground">tokenized assets</span>… Cung cấp bức tranh tổng thể
      và so sánh toàn bộ thị trường để Nhà đầu tư có lựa chọn tốt nhất, phù hợp nhất với việc phân bổ
      tài sản cá nhân.
    </ComingSoon>
  );
}
