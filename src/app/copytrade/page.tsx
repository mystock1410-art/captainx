import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Copytrade Phái Sinh Mr X",
  description: "Dịch vụ copytrade phái sinh VN30 Futures độc quyền theo chiến lược của Mr X.",
  robots: { index: false, follow: true },
};

export default function CopytradePage() {
  return (
    <ComingSoon title="Copytrade Phái Sinh — Mr X" glow="gold" cta>
      Dịch vụ <span className="font-bold text-foreground">Copytrade Phái Sinh độc quyền</span> theo
      chiến lược của <span className="font-bold text-foreground">Mr X</span> — chuyên gia VN30 Futures
      hàng đầu. Trải nghiệm các lệnh được mirror theo thời gian thực với quản trị rủi ro chặt chẽ.
    </ComingSoon>
  );
}
