"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Sparkles, AlertCircle, AlertTriangle, Flag, Globe, Loader2, Minus, ExternalLink, MessageCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accept Vietnamese mobile numbers (0xx... or +84xx...) with optional spaces/dots/dashes.
const PHONE_RE = /^(\+?84|0)[0-9 .\-]{8,15}$/;

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
};

type FormState = {
  email: string;
  phone: string;
  account: string;
  location: string;
};

const EMPTY: FormState = { email: "", phone: "", account: "", location: "" };

export function LeadModal({ open, onClose, onSubmitted }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showOcbs, setShowOcbs] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isValid = useMemo(() => {
    const email = form.email.trim();
    const phone = form.phone.trim();
    const account = form.account.trim();
    const location = form.location.trim();
    if (!email || !phone || !account || !location) return false;
    if (!EMAIL_RE.test(email)) return false;
    if (!PHONE_RE.test(phone.replace(/\s+/g, ""))) return false;
    return true;
  }, [form]);

  useEffect(() => {
    if (open) {
      // Every open is a fresh session: clear previous inputs and state.
      setForm(EMPTY);
      setError(null);
      setSubmitting(false);
      setShowOcbs(false);
      // Reset scroll to the top so users see the preview content first.
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
        // Focus the first input without auto-scrolling it into view.
        firstInputRef.current?.focus({ preventScroll: true });
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValid) return;

    const email = form.email.trim();
    const phone = form.phone.trim();
    const account = form.account.trim();
    const location = form.location.trim();

    setSubmitting(true);
    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, account, location }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) {
        throw new Error(json.error || `HTTP ${r.status}`);
      }
      // Show OCBS account gate popup; user opens analysis after acknowledging.
      setShowOcbs(true);
    } catch (err) {
      setError((err as Error).message || "Không gửi được. Thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleOcbsClose() {
    setShowOcbs(false);
    onSubmitted();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={scrollRef}
        className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-sm border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-3 top-3 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-brand">
              Truy cập Phân tích AI
            </h3>
          </div>
          <p className="text-[13px] leading-relaxed text-foreground/85">
            <span className="font-semibold text-brand">AI Captain X</span> sẽ tập hợp các thông tin trên trang bao gồm tất cả thông tin{" "}
            <span className="font-semibold">Vĩ mô</span>,{" "}
            <span className="font-semibold">Doanh nghiệp</span>, các Data đã được thu thập từ ngày đầu tạo trang để đưa ra nhận định chung về{" "}
            <span className="font-semibold">thị trường Việt Nam</span>,{" "}
            <span className="font-semibold">thị trường thế giới</span> và các Highlight về Catalyst của thị trường, các rủi ro cần theo dõi và các Highlight mới nhất liên quan Doanh nghiệp.
          </p>
          <p className="text-[12px] text-muted-foreground">
            Để tiếp tục, vui lòng cung cấp thông tin liên hệ bên dưới.
          </p>
        </div>

        <SamplePreview />

        <form onSubmit={handleSubmit} className="space-y-3 border-t border-border px-5 py-4">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
            Thông tin liên hệ
          </div>
          <Field
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(v) => update("email", v)}
            inputRef={firstInputRef}
            required
          />
          <Field
            label="Số điện thoại"
            type="tel"
            placeholder="09xx xxx xxx"
            value={form.phone}
            onChange={(v) => update("phone", v)}
            required
          />
          <Field
            label="Số tài khoản chứng khoán"
            type="text"
            placeholder="VD: 067C123456"
            value={form.account}
            onChange={(v) => update("account", v)}
            required
          />
          <Field
            label="Nơi sinh sống"
            type="text"
            placeholder="VD: TP.HCM"
            value={form.location}
            onChange={(v) => update("location", v)}
            required
          />

          {error && (
            <div className="flex items-start gap-2 rounded-sm border border-down/40 bg-down/10 px-3 py-2 text-[12px] text-down">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-border px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!isValid || submitting}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[12px] font-semibold transition-colors",
                isValid
                  ? "bg-brand text-background hover:bg-brand/90"
                  : "border border-gold/40 bg-gold/10 text-gold cursor-not-allowed",
                submitting && "opacity-60",
              )}
            >
              {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
              {submitting ? "Đang gửi…" : "Gửi & Mở phân tích"}
            </button>
          </div>

          <p className="pt-1 text-[10px] text-muted-foreground">
            Thông tin chỉ được dùng cho mục đích cá nhân hóa phân tích, không chia sẻ với bên thứ ba.
          </p>
        </form>
      </div>

      {showOcbs && <OcbsAccountPopup onClose={handleOcbsClose} />}
    </div>
  );
}

function OcbsAccountPopup({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-md border border-gold/40 bg-card shadow-2xl"
        style={{ boxShadow: "0 0 0 1px rgba(228,160,37,0.20), 0 0 30px rgba(228,160,37,0.25), 0 20px 50px rgba(0,0,0,0.7)" }}
      >
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-3 top-3 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-4 px-6 py-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-brand">
              Mở tài khoản OCBS
            </h3>
          </div>

          <p className="text-[14px] leading-relaxed text-foreground/90">
            Bạn cần tạo <span className="font-semibold text-brand">tài khoản Chứng khoán tại OCBS</span> để
            sử dụng chức năng <span className="font-semibold text-gold">AI Phân tích</span>.
          </p>

          <a
            href="https://taikhoan.ocbs.com.vn/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-brand px-3 py-2 text-[13px] font-semibold text-background hover:bg-brand/90"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Mở tài khoản tại taikhoan.ocbs.com.vn
          </a>

          <div className="space-y-2 rounded-sm border border-border bg-background/50 p-3">
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              Hoặc liên hệ trực tiếp
            </p>
            <p className="text-[13px] font-semibold text-foreground">
              Mr X — Chuyên gia Quản lý Tài sản hàng đầu
            </p>
            <div className="flex items-center gap-2 text-[12px] text-foreground/85">
              <MessageCircle className="h-3.5 w-3.5 text-gold" />
              <span className="font-mono">Zalo:</span>
              <span className="font-mono text-muted-foreground">xxx</span>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-foreground/85">
              <Phone className="h-3.5 w-3.5 text-gold" />
              <span className="font-mono">Fx:</span>
              <span className="font-mono text-muted-foreground">yyy</span>
            </div>
          </div>

          <div className="flex justify-end">
            <a
              href="https://taikhoan.ocbs.com.vn/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="rounded-sm border border-border px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Đã hiểu
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  placeholder,
  value,
  onChange,
  inputRef,
  required,
}: {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-down">*</span>}
      </span>
      <input
        ref={inputRef}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-sm border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
    </label>
  );
}

// ── Static sample of the AI analysis output, shown inside the lead modal
//    so prospective users can preview what they will receive after submitting.
function SamplePreview() {
  return (
    <div className="space-y-4 border-t border-border bg-background/40 px-5 py-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-gold" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
          Ví dụ nội dung phân tích
        </span>
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">
          MẪU · KHÔNG REALTIME
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SampleSectionCard
          icon={<Flag className="h-3.5 w-3.5" />}
          title="TTCK Việt Nam"
          sentiment="Trung lập"
          confidence={55}
          tone="neutral"
          analysis="VN-Index gần như đi ngang tại 1863.49 (-0.01%) khi câu chuyện 'siêu trụ' Vingroup và ngân hàng kéo lùi chỉ số trong khi HNX-Index thăng hoa nhờ THD, KSF. Điểm tích cực đáng chú ý là Ngân hàng Nhà nước 'nới room' tín dụng bất động sản cho 25 ngân hàng, không tính dư nợ nhà ở xã hội và KCN vào hạn mức – hỗ trợ tâm lý nhóm BĐS và ngân hàng. Tuy nhiên áp lực vẫn hiện hữu khi lãi suất tiết kiệm tăng trở lại (một số kỳ hạn 12 tháng vẫn 7%/năm), khiến dòng tiền cân nhắc rời chứng khoán. Nhóm dầu khí (GAS +7.11%, BSR +4.46%) bứt phá trong khi ngân hàng phân hóa (ACB tăng, BID giảm)."
        />
        <SampleSectionCard
          icon={<Globe className="h-3.5 w-3.5" />}
          title="TTCK Mỹ · Châu Âu · Châu Á"
          sentiment="Trung lập"
          confidence={35}
          tone="neutral"
          analysis="Dòng tin quốc tế chủ yếu xoay quanh địa chính trị và xã hội, ít dữ liệu trực tiếp về thị trường tài chính. Căng thẳng leo thang tại Trung Đông khi binh sĩ Israel vượt sông Litani vào Nabatieh và thực hiện hơn 10 cuộc không kích ở Lebanon, đồng thời Ai Cập cảnh báo nguy cơ sụp đổ lệnh ngừng bắn Gaza – tạo rủi ro cho giá dầu và tâm lý risk-off. Thái Lan nhiều khả năng giữ nguyên lãi suất do lạm phát thấp, phản ánh nền tảng vĩ mô khu vực Đông Nam Á còn ổn định."
        />
      </div>

      <div>
        <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
          Catalysts chính
        </h4>
        <ul className="grid grid-cols-1 gap-1.5 text-[12px] leading-snug md:grid-cols-2">
          <SampleCatalyst dir="+" region="VN" label="Nới room tín dụng BĐS." detail="NHNN không tính dư nợ nhà ở xã hội, KCN, KCX vào hạn mức tín dụng BĐS cho 25 NHTM, hỗ trợ nhóm ngân hàng và bất động sản." />
          <SampleCatalyst dir="+" region="VN" label="Hợp tác thị trường vốn VN–Singapore." detail="Bộ Tài chính và MAS nghiên cứu cơ chế niêm yết chéo và chứng chỉ lưu ký, mở rộng kết nối thị trường vốn." />
          <SampleCatalyst dir="-" region="VN" label="Lãi suất tiết kiệm tăng." detail="Một số kỳ hạn 12 tháng vẫn 7%/năm, tạo áp lực hút dòng tiền khỏi kênh chứng khoán." />
          <SampleCatalyst dir="-" region="QT" label="Leo thang Trung Đông." detail="Israel vượt sông Litani vào Nabatieh và không kích miền nam Lebanon, đồng thời nguy cơ sụp đổ lệnh ngừng bắn Gaza, gia tăng rủi ro địa chính trị." />
          <SampleCatalyst dir="~" region="QT" label="Thái Lan có thể không tăng lãi suất." detail="Lạm phát thấp khiến Thái Lan nhiều khả năng tránh tăng lãi suất dù các nước láng giềng có động thái nâng lãi." />
        </ul>
      </div>

      <div>
        <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
          Ghi chú theo mã
        </h4>
        <ul className="flex flex-wrap gap-1.5 text-[12px]">
          <SampleSymbolNote symbol="VIC" tone="neutral" note="Vingroup muốn đầu tư sang Mỹ phát triển robot hình người qua VINMOTION USA; tuy nhiên cùng nhóm 'siêu trụ' đang kéo lùi VN-Index." />
          <SampleSymbolNote symbol="MWG" tone="bearish" note="Chủ tịch Nguyễn Đức Tài đăng ký mua 1 triệu cổ phiếu Điện Máy Xanh – tín hiệu cam kết của lãnh đạo, dù MWG giảm 1.85% phiên." />
          <SampleSymbolNote symbol="GAS" tone="bullish" note="Tăng mạnh 7.11% trong phiên, dẫn dắt nhóm dầu khí cùng BSR (+4.46%)." />
          <SampleSymbolNote symbol="BSR" tone="bullish" note="Tăng 4.46%, hưởng lợi nhịp sóng nhóm dầu khí." />
          <SampleSymbolNote symbol="GEX" tone="neutral" note="Gelex Electric chốt quyền tạm ứng cổ tức tiền mặt 5% ngày 10/6/2026; GEX phiên giảm nhẹ 0.63%." />
        </ul>
      </div>

      <div>
        <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
          <AlertTriangle className="h-3 w-3 text-gold" /> Rủi ro theo dõi
        </h4>
        <ul className="list-disc space-y-0.5 pl-5 text-[12px] leading-snug text-muted-foreground">
          <li>Lãi suất huy động tăng trở lại có thể tiếp tục hút dòng tiền rời khỏi thị trường chứng khoán.</li>
          <li>Sự phụ thuộc lớn của VN-Index vào nhóm &apos;siêu trụ&apos; Vingroup và ngân hàng dễ gây biến động chỉ số.</li>
          <li>Căng thẳng Israel – Lebanon và rủi ro sụp đổ ngừng bắn Gaza có thể đẩy giá năng lượng và làm gia tăng tâm lý risk-off toàn cầu.</li>
          <li>Giá vàng giảm tháng thứ 3 liên tiếp và quỹ lớn xả bạc – kim loại quý phản ánh biến động dòng vốn đầu cơ khó lường.</li>
        </ul>
      </div>
    </div>
  );
}

type Tone = "bullish" | "bearish" | "neutral";

function SampleSectionCard({
  icon, title, sentiment, confidence, tone, analysis,
}: { icon: React.ReactNode; title: string; sentiment: string; confidence: number; tone: Tone; analysis: string }) {
  const toneCls =
    tone === "bullish" ? "text-up bg-up/10 border-up/30"
    : tone === "bearish" ? "text-down bg-down/10 border-down/30"
    : "text-muted-foreground bg-muted border-border";
  const barCls =
    tone === "bullish" ? "bg-up" : tone === "bearish" ? "bg-down" : "bg-muted-foreground";
  return (
    <div className="rounded-sm border border-border bg-background p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-brand">{icon}</span>
        <h5 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">{title}</h5>
      </div>
      <div className={`mb-1.5 inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold ${toneCls}`}>
        <Minus className="h-3 w-3" />
        {sentiment}
        <span className="ml-1 font-mono text-[10px] opacity-70">{confidence}%</span>
      </div>
      <div className="mb-1.5 h-1 w-full rounded-full bg-foreground/10">
        <div className={`h-full rounded-full ${barCls}`} style={{ width: `${confidence}%` }} />
      </div>
      <p className="text-[12px] leading-relaxed text-foreground/85">{analysis}</p>
    </div>
  );
}

function SampleCatalyst({ dir, region, label, detail }: { dir: "+" | "-" | "~"; region: "VN" | "QT"; label: string; detail: string }) {
  const dirCls =
    dir === "+" ? "text-up" : dir === "-" ? "text-down" : "text-muted-foreground";
  const regionCls =
    region === "QT" ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-foreground/10 text-foreground/60";
  return (
    <li className="flex items-baseline gap-2">
      <span className={`w-4 shrink-0 text-center font-mono text-sm font-bold ${dirCls}`}>{dir}</span>
      <span>
        <span className="font-semibold">{label}</span>{" "}
        <span className="text-muted-foreground">{detail}</span>
        <span className={`ml-1.5 rounded px-1 py-px text-[9px] font-bold uppercase tracking-wider ${regionCls}`}>
          {region}
        </span>
      </span>
    </li>
  );
}

function SampleSymbolNote({ symbol, tone, note }: { symbol: string; tone: Tone; note: string }) {
  const cls =
    tone === "bullish" ? "border-up/40 bg-up/5 text-up"
    : tone === "bearish" ? "border-down/40 bg-down/5 text-down"
    : "border-border bg-muted text-muted-foreground";
  return (
    <li className={`rounded-md border px-2 py-1 text-[11px] ${cls}`}>
      <span className="font-mono font-bold">{symbol}</span>
      <span className="ml-1.5 text-foreground/80">{note}</span>
    </li>
  );
}
