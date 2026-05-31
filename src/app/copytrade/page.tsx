import { Construction } from "lucide-react";

export default function CopytradePage() {
  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 items-center justify-center px-4 py-16">
      <div className="card-elevated cta-border max-w-2xl rounded-md p-10 text-center">
        <Construction className="mx-auto mb-4 h-10 w-10 text-gold" />
        <h2 className="mb-3 text-[20px] font-bold uppercase tracking-[0.12em] text-brand">
          Copytrade Phái Sinh — Mr X
        </h2>
        <p className="text-[14px] font-medium leading-relaxed text-foreground/85">
          Dịch vụ <span className="font-bold text-foreground">Copytrade Phái Sinh độc quyền</span> theo
          chiến lược của <span className="font-bold text-foreground">Mr X</span> — chuyên gia
          VN30 Futures hàng đầu. Trải nghiệm các lệnh được mirror theo thời
          gian thực với quản trị rủi ro chặt chẽ.
        </p>
        <p className="cta-blink mt-6 text-[14px] font-semibold leading-relaxed">
          Bấm theo dõi <span className="font-mono font-bold">F yyy</span> hoặc
          mở tài khoản OCBS trực tiếp từ trang để được liên hệ!
        </p>
      </div>
    </main>
  );
}
