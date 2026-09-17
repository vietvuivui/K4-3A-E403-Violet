# K4 Discord Digest

## Chay ung dung

Can Node.js >= 20.12 va PowerShell (co san tren Windows; macOS/Linux can `pwsh`).
Khong can tai thu vien runtime. CSV duoc doc bang `Import-Csv` de giu dung
dau phay, dau ngoac kep, Unicode va noi dung nhieu dong.

```powershell
cd codebase
npm.cmd start
```

Mo http://127.0.0.1:5173. Neu port dang ban, doi PORT trong `.env`.

## Du lieu that, luu rieng

Dat pack duoc cap tai thu muc `discord-pack/` o goc project:

```text
discord-pack/
  k4_messages.csv
  k4_daily_reports.md
```

Co the doi duong dan bang `DISCORD_PACK_DIR` trong `.env` (tuong doi voi
`codebase/` hoac duong dan tuyet doi). Lan mo dau tien, server doc CSV va
tao cache `codebase/data/discord_archive.json`. Hash du lieu duoc doi chieu
khi khoi dong lai server; cache se tu tao lai neu pack thay doi.
Neu thieu pack, giao dien hien trang thai thieu du lieu, khong chen du lieu mau.

`.gitignore` loai `discord-pack/`, `codebase/data/`, `codebase/logs/`, `.env`
va `node_modules/`. Khong dua CSV, ban tin goc, cache, screenshot hoac log
chua noi dung that vao repository. Test trong source chi dung du lieu tu tao.

## Giao dien

- Bo cuc theo Discord: thanh server, danh sach kenh, khung chat va danh sach
  tac gia. Bang ghim mo tu thanh cong cu; bo loc co the thu gon.
- Chon tac gia de tim tin cua ho. Thanh thao tac tren tin cho phep ghim,
  hoi tro ly ve noi dung va sao chep ma nguon. Cac tin lien tiep cung tac
  gia duoc nhom gon. Markdown hien thi chu dam, danh sach, code va lien ket;
  HTML tho, anh tu xa va lien ket khong phai HTTP(S) khong duoc kich hoat.

- Server, kenh va so tin duoc tao truc tiep tu CSV. Giu nguyen ma kenh,
  ma tac gia; khong suy doan ten kenh hoac vai tro TA/BTC.
- Loc theo ngay, nguoi/bot, chu de; tim noi dung, ma tin va ma tac gia.
- Moi tin giu ngay gio UTC+7, ma nguon, thong tin reply va so file dinh kem.
  Pack khong co noi dung tep. Reply thieu/trung ma duoc hien ro.
- Ma tin goc co the trung nhau: dinh danh noi bo duoc tao tu hash record,
  giu du cac dong va khong ghep nham reply co nhieu ung vien.
- Ghim/bo ghim, tim trong ghim, loc server/kenh va quay ve tin goc.
  localStorage chi luu ID ghim va phan loai AI, khong sao chep toan bo pack.
- Tab Quan trong co cac nhom onboarding: deadline, lich/workshop,
  diem danh/XP, ticket, ghep doi, lab/CVAT, thong bao va phan cong.
- Ban tin bot giu nguyen van ban goc va hien nhan chua xac minh.
- Tra ly tra cuu trong kenh, server hoac toan bo pack; nguon co the mo lai
  tai dung tin nhan. Khong co chuc nang gui/sua tin tren Discord.

## OpenRouter

File `codebase/.env` la file local, khong duoc Git theo doi. Khi clone:

```powershell
Copy-Item .env.example .env
```

Them key va khoi dong lai server:

```dotenv
AI_PROVIDER=auto
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openai/gpt-4o-mini
AI_TIMEOUT_MS=30000
DISCORD_PACK_DIR=../discord-pack
```

`auto` uu tien OpenRouter, sau do OpenAI neu co `OPENAI_API_KEY`, sau cung
la local-rules. Bien moi truong terminal duoc uu tien hon `.env`.
Key chi duoc doc tren server. Model ID co the doi theo tai khoan OpenRouter.

Mac dinh phan loai ca pack bang quy tac cuc bo, khong gui ca pack den LLM.
Nut Phan tich AI chi gui toi da 30 tin dang hien thi o kenh duoc chon.
Hoi dap chi gui toi da 12 tin truy xuat lien quan (kem ngu canh reply).
Phan hoi AI phai dan dung ID trong tap nguon; quote hien thi lay tu du lieu
goc. Nguon chi tu bot duoc danh dau can doi chieu. Ban tin bot khong duoc
su dung lam chinh sach chinh thuc.

Chua co key: tra ve cac tin lien quan va trang thai can doi chieu, khong
gia lap cau tra loi LLM. Co key nhung goi that bi loi: tra loi API ro rang.

## API va logging

- `GET /api/workspace`: archive, thong ke, ban tin va phan loai cuc bo.
- `GET /api/health`: provider dang su dung.
- `POST /api/ask`: `{ "question": "...", "scope": { "guild": "...", "channel": "...", "date": "YYYY-MM-DD" } }`. Cac truong scope deu tuy chon.
- `POST /api/importance`: `{ "ids": ["internal-message-id"] }`, 1-30 ID.

Prompt, phan hoi tho va ket qua/loi ghi tai `logs/decision-YYYY-MM-DD.jsonl`.
Server chi phuc vu tep tinh trong `prototype/`; khong phuc vu `.env`, CSV,
cache hay log. API workspace phuc vu pack cho trinh duyet local; server
mac dinh chi listen `127.0.0.1`, chua co dang nhap hay phan quyen.

## Kiem thu

```powershell
npm.cmd test
```

Test tu tao bao gom CSV multiline/Unicode, trung ma, reply, gio UTC+7,
pham vi truy xuat, nguon AI, phan loai va giao thuc OpenRouter (mock).
Test nay khong can pack hay API key that.

`node tests/browser-check.js` can server dang chay, pack local, Chrome va
Playwright (chi dinh module qua `PLAYWRIGHT_MODULE` neu can). Kiem tra
server/kenh, tim kiem, loc, reply, ban tin, ghim qua reload va mobile.
Screenshot kiem tra nam trong `logs/`, da duoc ignore.
