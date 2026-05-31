import { Construction } from "lucide-react";

export default function OcbsProductsPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 items-center justify-center px-4 py-16">
      <div className="card-elevated cta-border-brand max-w-3xl rounded-md p-10 text-center">
        <Construction className="mx-auto mb-4 h-10 w-10 text-brand" />
        <h2 className="mb-3 text-[20px] font-bold uppercase tracking-[0.12em] text-brand">
          OCBS Products
        </h2>
        <p className="text-[14px] font-medium leading-relaxed text-foreground/85">
          Cung cấp toàn bộ thông tin về các <span className="font-bold text-foreground">sản phẩm tài chính</span>
          {" "}đang có trên thị trường Việt Nam nói chung và từ{" "}
          <span className="font-bold text-foreground">OCBS</span> nói riêng — từ các sản phẩm
          đơn giản như <span className="font-bold text-foreground">giao dịch ký quỹ</span>,{" "}
          <span className="font-bold text-foreground">chứng chỉ tiền gửi</span>, sổ tiết kiệm…
          đến các sản phẩm đầu tư phức tạp như{" "}
          <span className="font-bold text-foreground">trái phiếu cấu trúc</span>, chứng chỉ
          quỹ, sản phẩm money market, cấu trúc bất động sản,{" "}
          <span className="font-bold text-foreground">tokenized assets</span>… Cung cấp bức tranh
          tổng thể và so sánh toàn bộ thị trường để Nhà đầu tư có lựa chọn tốt
          nhất, phù hợp nhất với việc phân bổ tài sản cá nhân.
        </p>
        <p className="cta-blink-brand mt-6 text-[14px] font-semibold leading-relaxed">
          Bấm theo dõi <span className="font-mono font-bold">F yyy</span> hoặc
          mở tài khoản OCBS trực tiếp từ trang để được liên hệ!
        </p>
      </div>
    </main>
  );
}
