export const DEFAULT_WATCHLIST = [
  "HAG",
  "MWG",
  "OCB",
  "SSI",
  "VIC",
  "VHM",
  "KDH",
];

export type Quote = {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
};

export function mockQuote(symbol: string): Quote {
  // deterministic pseudo-random based on symbol
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) & 0xffff;
  const rand = (n: number) => ((h = (h * 1103515245 + 12345) & 0x7fffffff) % n);
  const price = 10 + rand(80000) / 1000;
  const changePct = (rand(800) - 400) / 100;
  const change = (price * changePct) / 100;
  return {
    symbol,
    price: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePct: Math.round(changePct * 100) / 100,
  };
}

export function mockSeries(seed: string, points = 96): { t: number; v: number }[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  const rand = () => ((h = (h * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const base = 100 + rand() * 900;
  const arr: { t: number; v: number }[] = [];
  let v = base;
  const now = Math.floor(Date.now() / 1000);
  for (let i = points - 1; i >= 0; i--) {
    v += (rand() - 0.5) * base * 0.01;
    arr.push({ t: now - i * 300, v: Math.round(v * 100) / 100 });
  }
  return arr;
}

export type NewsItem = {
  id: string;
  source: "Cafef" | "Vietstock" | "Vietnambiz" | "24h" | "VnExpress";
  time: string;
  headline: string;
  body?: string;
  breaking?: boolean;
};

export const MOCK_LIVE_FEED: NewsItem[] = [
  {
    id: "1",
    source: "Cafef",
    time: "10:32",
    breaking: true,
    headline: "VN-Index vượt mốc 1.350 điểm, thanh khoản tăng vọt",
    body: "Phiên giao dịch sáng 29/5 chứng kiến lực mua mạnh ở nhóm cổ phiếu ngân hàng và chứng khoán. SSI, VND, HCM đều tăng trần. Thanh khoản toàn thị trường đạt hơn 25.000 tỷ đồng chỉ trong phiên sáng — mức cao nhất 3 tháng.",
  },
  {
    id: "2",
    source: "Vietstock",
    time: "10:18",
    headline: "HAG: Bầu Đức tiếp tục mua thêm 1 triệu cổ phiếu",
    body: "Chủ tịch HĐQT Hoàng Anh Gia Lai đăng ký mua thêm 1 triệu cổ phiếu HAG từ ngày 1/6 đến 30/6/2026 nhằm tăng tỷ lệ sở hữu. Giao dịch dự kiến thực hiện qua khớp lệnh và thỏa thuận.",
  },
  {
    id: "3",
    source: "Vietnambiz",
    time: "09:55",
    headline: "MWG báo lãi quý I tăng 38% so cùng kỳ",
    body: "Thế Giới Di Động (MWG) công bố BCTC quý I/2026 với doanh thu 38.500 tỷ đồng, lợi nhuận sau thuế 1.230 tỷ đồng, tăng 38% so cùng kỳ. Chuỗi Bách Hóa Xanh tiếp tục đóng góp tích cực.",
  },
  {
    id: "4",
    source: "Cafef",
    time: "09:40",
    headline: "Khối ngoại quay lại mua ròng sau 5 phiên bán",
    body: "Sau 5 phiên bán ròng liên tiếp, khối ngoại đã mua ròng trở lại với giá trị 320 tỷ đồng. Tâm điểm mua vào tập trung tại VHM, VIC, FPT.",
  },
];

export const MOCK_HEADLINES: NewsItem[] = [
  { id: "h1", source: "VnExpress", time: "10:45", headline: "Giá vàng SJC lập đỉnh mới, vượt 105 triệu đồng/lượng" },
  { id: "h2", source: "24h", time: "10:42", headline: "Tỷ giá USD/VND lên mức cao nhất 2 tháng" },
  { id: "h3", source: "VnExpress", time: "10:30", headline: "NHNN bơm ròng 12.000 tỷ qua kênh OMO" },
  { id: "h4", source: "24h", time: "10:22", headline: "Bộ Tài chính đề xuất giảm thuế VAT đến hết 2026" },
  { id: "h5", source: "VnExpress", time: "10:15", headline: "Lạm phát tháng 5 ước tăng 0.18% so tháng trước" },
  { id: "h6", source: "24h", time: "10:08", headline: "Xuất khẩu thuỷ sản 5 tháng đầu năm đạt 4.2 tỷ USD" },
  { id: "h7", source: "VnExpress", time: "09:58", headline: "Giá xăng RON95 dự kiến giảm 200-400 đồng/lít kỳ tới" },
  { id: "h8", source: "24h", time: "09:50", headline: "Vingroup khởi công dự án 1.2 tỷ USD tại Hải Phòng" },
  { id: "h9", source: "VnExpress", time: "09:40", headline: "FPT ký hợp đồng 150 triệu USD với khách hàng Nhật" },
  { id: "h10", source: "24h", time: "09:32", headline: "VPBank chia cổ tức tiền mặt 10% trong tháng 6" },
];
