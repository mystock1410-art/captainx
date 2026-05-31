import { Construction } from "lucide-react";

export default function StockAnalysisPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 items-center justify-center px-4 py-16">
      <div className="card-elevated max-w-xl rounded-md p-10 text-center">
        <Construction className="mx-auto mb-4 h-10 w-10 text-gold" />
        <h2 className="mb-2 text-[20px] font-bold uppercase tracking-[0.12em] text-brand">
          Stock Analysis
        </h2>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Trang Phân tích Cổ phiếu đang được phát triển. Sắp ra mắt với các công cụ
          screener kỹ thuật, định giá tương đối và scoring nội tại theo từng mã.
        </p>
      </div>
    </main>
  );
}
