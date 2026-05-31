import { Construction } from "lucide-react";

export default function ValuationPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 items-center justify-center px-4 py-16">
      <div className="card-elevated max-w-xl rounded-md p-10 text-center">
        <Construction className="mx-auto mb-4 h-10 w-10 text-gold" />
        <h2 className="mb-2 text-[20px] font-bold uppercase tracking-[0.12em] text-brand">
          Valuation
        </h2>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Trang Định giá đang được phát triển. Sắp ra mắt với DCF, P/E sector
          benchmark và các mô hình định giá nội tại theo từng doanh nghiệp.
        </p>
      </div>
    </main>
  );
}
