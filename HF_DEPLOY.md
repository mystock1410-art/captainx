# Deploy Captain X (Free tier)

Backend → Hugging Face Spaces · Frontend → Vercel · Tổng chi phí $0/tháng.

## Tổng quan

```
GitHub repo (captainx)
   ├── api/   ──push subtree──▶ HF Space (huggingface.co/<user>/captainx-api)
   └── web/   ──Vercel auto──▶  Vercel (<project>.vercel.app)
```

---

## Bước 1 — Tạo accounts

- [ ] **GitHub** — chắc đã có
- [ ] **Vercel** — đã có
- [ ] **Hugging Face** — https://huggingface.co/join (free, không cần card, 30s)

Lấy thông tin sẵn:
- HF username (sẽ thành phần của URL)
- HF Access Token: Settings → Access Tokens → New token, role **Write** → copy `hf_...`

## Bước 2 — Push code lên GitHub

```powershell
cd "f:\OCBS\Platform news AI"
git add .
git commit -m "Captain X — initial scaffold (Phase 1-5)"

# Tạo repo trên https://github.com/new tên `captainx`, Private cũng được.
git remote add origin https://github.com/<YOUR_GITHUB_USER>/captainx.git
git push -u origin main
```

## Bước 3 — Tạo HF Space cho backend

1. Truy cập https://huggingface.co/new-space
2. Owner: bạn · Space name: **`captainx-api`** · License: `mit`
3. SDK: **Docker** → Template: **Blank**
4. Visibility: **Public** (free) hoặc Private (free 1 space)
5. Click **Create Space**

Sau khi tạo, vào tab **Settings → Variables and secrets**, thêm 2 secret:

| Name | Value |
|---|---|
| `GEMINI_API_KEY` | key bạn đã có: `AIzaSyD_0TCr4...` |
| `CORS_ORIGINS` | (để trống tạm, sẽ điền sau khi có Vercel URL) |

## Bước 4 — Push `api/` subtree lên HF Space

```powershell
cd "f:\OCBS\Platform news AI"

# Thêm HF Space làm remote thứ 2
# Khi push lần đầu nó hỏi credentials — username = HF username, password = HF token (hf_...)
git remote add hf https://huggingface.co/spaces/<HF_USER>/captainx-api

# Push chỉ thư mục api/ lên main của Space
git subtree push --prefix=api hf main
```

HF Spaces sẽ tự build Docker image (~3-5 phút lần đầu). Vào tab **App** của Space để xem log build.

Sau khi build xong, public URL của API là:
```
https://<HF_USER>-captainx-api.hf.space
```

Verify:
```powershell
curl https://<HF_USER>-captainx-api.hf.space/api/health
# expect: {"ok":true}
```

## Bước 5 — Deploy frontend lên Vercel

1. https://vercel.com/new → Import GitHub repo `captainx`
2. **Root Directory**: chọn `web` (rất quan trọng vì repo có cả `api/`)
3. Framework Preset: Next.js (auto-detect)
4. **Environment Variables**:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_API_BASE` | `https://<HF_USER>-captainx-api.hf.space` |

5. Click **Deploy** (~30s)

Lần deploy đầu Vercel cấp URL kiểu `captainx-<hash>.vercel.app` hoặc `captainx.vercel.app`.

## Bước 6 — Cập nhật CORS

Vào HF Space → **Settings → Variables and secrets** → set `CORS_ORIGINS`:

```
https://captainx.vercel.app,https://captainx-<hash>.vercel.app
```

Bấm **Save** — HF Space tự restart (~10s). Vercel preview sẽ load data ngay.

## Bước 7 — Auto-deploy khi push code

**Frontend (Vercel)** — đã tự động: mọi push lên `main` của GitHub → Vercel build + deploy ~30s. Không cần làm gì.

**Backend (HF Space)** — cần push subtree mỗi khi sửa `api/`:

```powershell
git push origin main                                  # GitHub
git subtree push --prefix=api hf main                 # HF Space
```

Hoặc tạo alias trong `.gitconfig` để gộp 1 lệnh:
```powershell
git config alias.deploy '!git push origin main && git subtree push --prefix=api hf main'
# từ đó dùng: git deploy
```

## Troubleshooting

| Triệu chứng | Cách xử lý |
|---|---|
| HF build fail "no space left" | Image quá lớn — giảm bằng cách thêm `--no-install-recommends` vào Dockerfile |
| Frontend gọi API → CORS error | Vào HF Settings, kiểm tra `CORS_ORIGINS` có domain Vercel chính xác (kèm `https://`) |
| HF Space cold start chậm lần đầu | Bình thường ~10-20s, sau đó stable. Nếu Free Public Space, không sleep. |
| `git subtree push` fail "Updates were rejected" | Force push: `git subtree split --prefix=api -b hf-tmp; git push hf hf-tmp:main --force; git branch -D hf-tmp` |
| Gemini 503 trên production | Đã có retry 3 lần, nếu vẫn 503 click "Phân tích lại" sau vài giây. Free tier Gemini hay overload. |

## Chi phí

| Service | Plan | Cost |
|---|---|---|
| GitHub repo private | Free | $0 |
| Hugging Face Space Docker | Free public | $0 |
| Vercel Hobby | Free | $0 |
| Gemini Flash 2.5 | Free tier (15 RPM, 250 RPD) | $0 |
| **Tổng** | | **$0/tháng** |
