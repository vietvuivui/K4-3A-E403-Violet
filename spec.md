# Template AI Spec *(spec.md — commit trước hạn chốt spec: 21:00 17/9, tại CP4 · quality bar chốt từ thời điểm nộp)*

> Cấu trúc phủ đúng "SPEC 8 phần" của chương trình: Bằng chứng (§1-§2) · Lát cắt (§4) · Canvas (đính kèm CP1) · Augment/Automate (§4) · 4 đường đi của trải nghiệm (§6) · Kiểu lỗi (§5) · Kiểm thử (§7) · Phân công (§8). Hướng dẫn viết từng mục: `02-guide.md`.

```markdown
# AI SPEC — [Tên lát cắt] · Nhóm [XX] · Zone [X]
Hướng: [ ] A — VLearn  [ ] B — Trợ lý Học viên  [ ] C — Làn mở
Loại: [ ] Tối ưu tính năng có sẵn  [ ] Tính năng mới

## §1. User & Job
- Job executor + workflow (đính kèm worksheet JTBD / ảnh sơ đồ):
- Core JTBD (không tên sản phẩm/AI trong câu):
- Problem statement (KHÔNG chữ AI):
- Evidence (chuẩn A và/hoặc B — log đầy đủ trong repo):
  - Số liệu mining / kết quả khảo sát (n = ?, % xác nhận):
  - ≥5 quote/ví dụ nguyên văn + nguồn:

## §2. Impact & quyết định chọn
- Bảng impact ≥3 ứng viên (bao nhiêu người · tần suất · tốn gì mỗi lần · khả thi):
- Ứng viên ĐÃ LOẠI + vì sao:
- Ứng viên CHỌN + vì sao (bằng số):

## §3. Giải pháp tương tự đã nghiên cứu
- [Sản phẩm 1]: flow / đáng học / đáng né / mình khác gì
- [Sản phẩm 2]: ...

## §4. Thiết kế
- Lát cắt MỘT CÂU (1 user · 1 việc · 1 quyết định AI · 1 kết quả): Một học viên/TA đang ở Discord gõ `/bot` để hỏi một thông tin học tập gần hạn; AI quyết định có đủ căn cứ để trả lời hay không và mức confidence; kết quả là một câu trả lời ngắn kèm nguồn, trạng thái tin cậy và lựa chọn correction khi cần.
- Hình thức thể hiện CP2: Clickable prototype bằng HTML/CSS/JS tĩnh, lưu tại `codebase/prototype/` (`index.html`, `style.css`, `app.js`). Người xem có thể bấm chuyển channel, gõ `/bot`, nhận phản hồi, mở nguồn và thử correction ngay trong bản mẫu.
- Luồng tương tác toàn bộ:
  1. Người dùng vào channel `#daily-digest`.
  2. Người dùng gõ `/` hoặc `/bot`; giao diện hiện slash command suggestion.
  3. Người dùng nhập câu hỏi, ví dụ: "Ngày mai học ở đâu và mấy giờ?", "Cuộc họp ngày mai lúc mấy giờ?", "Ngày mai có deadline nộp bài không?", hoặc "Tóm tắt lịch học ngày mai."
  4. Điểm gọi quyết định AI: sau khi người dùng nhấn Enter, hệ thống kiểm tra các message mẫu trong các channel liên quan, chọn nhánh xử lý theo mức căn cứ tìm được.
  5. Hệ thống trả lời bằng embed trong Discord mock: có kết luận ngắn, nhãn confidence/trạng thái, và source card trỏ về message nguồn.
  6. Người dùng bấm source card để mở đúng channel và highlight message nguồn; nếu kết quả cần sửa, người dùng bấm `Edit result`, chỉnh thời gian/phòng/địa điểm rồi lưu correction.
  7. Luồng kết thúc khi người dùng đã có câu trả lời có căn cứ, hoặc thấy rõ rằng hiện chưa đủ căn cứ để kết luận.
- Non-goals (≥3 thứ KHÔNG build):
  - Không build Discord bot thật có token, deploy server hoặc quyền đọc Discord thật trong lát cắt hiện tại.
  - Không đọc toàn bộ lịch sử Discord/DM; prototype chỉ dùng dữ liệu mẫu đã seed trong `app.js`.
  - Không tự động thay đổi lịch học, giao task, gửi thông báo thay người dùng hoặc ghi vào hệ thống ngoài Discord.
  - Không giải quyết mọi câu hỏi học tập; chỉ tập trung vào thông tin logistics như lịch học, họp nhóm, deadline và cập nhật mới/cũ.
  - Không nhận diện danh tính thật của người gửi message hoặc suy luận thông tin cá nhân.
- Mức prototype nhắm tới: [ ] Sketch [x] Mock [ ] Working
  - Phần chạy thực tế trong bản mẫu: giao diện Discord-like, chuyển channel, slash command `/bot`, render câu hỏi/câu trả lời, source card nhảy về message gốc, highlight message nguồn, modal correction và lưu kết quả correction vào luồng chat.
  - Phần chạy giả lập/mock: dữ liệu Discord được seed sẵn trong `app.js`; bước "AI đọc message và quyết định nhánh" đang mô phỏng bằng rule keyword; chưa gọi Discord API, chưa dùng token bot, chưa gọi LLM/API thật.
- Automation: [x] augment [ ] conditional [ ] automate
  - Lý do theo cost-of-error: nếu bot kết luận sai lịch học, phòng học, giờ họp hoặc deadline, người học có thể đi nhầm, bỏ lỡ buổi học hoặc nộp trễ. Vì chi phí sai sót cao, prototype chỉ dừng ở mức hỗ trợ đọc nhanh và trích nguồn.
  - Quyền quyết định cuối cùng thuộc về người dùng: người dùng luôn thấy nguồn, có thể mở message gốc để kiểm chứng và có thể sửa kết quả qua correction.
  - Chưa chọn conditional/automate vì bản mẫu chưa có kiểm chứng đủ mạnh để tự động gửi thông báo, tự động cập nhật lịch hoặc tự động chốt deadline thay người dùng.
- §4b. Nguyên tắc đã áp dụng (≥4 — HAX/PAIR, xem guide):
  | Nguyên tắc | Áp cụ thể vào đâu trong prototype |
  |---|---|
  | HAX G1 — Make clear what the system can do | Slash command suggestion và intro message trong `#daily-digest` nêu rõ bot dùng để hỏi thông tin từ Discord, kèm các ví dụ prompt có thể thử. |
  | HAX G2 — Make clear how well the system can do what it can do | Mỗi embed hiển thị nhãn `HIGH CONFIDENCE`, `NEEDS REVIEW` hoặc `NO EVIDENCE` để người dùng biết mức chắc chắn trước khi tin kết quả. |
  | HAX G11 — Make clear why the system did what it did | Source card trong câu trả lời trỏ về channel/message gốc như `class-update`, `meeting-1`, `deadline-none`, giúp người dùng kiểm tra vì sao bot kết luận như vậy. |
  | HAX G12 — Remember recent interactions | Sau khi người dùng lưu correction, bot đăng lại kết quả đã sửa trong `#daily-digest`, cho thấy correction mới được ghi nhận cho luồng hiện tại. |
  | PAIR — Keep users in control | Người dùng có thể mở nguồn, kiểm chứng, và sửa trực tiếp thời gian/phòng/địa điểm bằng modal `Edit result`; AI không tự động chốt thay người dùng. |

## §5. Kiểu lỗi — 4 lớp chỗ khó + kịch bản (≥8) [bảng theo guide §2.5]

## §6. Bốn đường đi của trải nghiệm
- Happy path — AI tự tin cao:
  - Input demo: `/bot Ngày mai học ở đâu và mấy giờ?`
  - Căn cứ trong prototype: channel `#class-announcement` có message cập nhật mới hơn: `class-update`.
  - Phản hồi hệ thống: embed màu xanh, nhãn `HIGH CONFIDENCE`, trả lời giờ học `08:30`, phòng `A305`, địa điểm `Cơ sở chính`.
  - Điểm kết thúc: người dùng bấm source card để mở đúng message nguồn, hoặc dùng ngay thông tin sau khi đã kiểm tra nguồn.
- Low-confidence — AI thiếu tự tin:
  - Input demo: `/bot Cuộc họp ngày mai lúc mấy giờ?`
  - Căn cứ trong prototype: channel `#project` có message "Mai họp nhóm" nhưng thiếu giờ và địa điểm.
  - Phản hồi hệ thống: embed màu vàng, nhãn `NEEDS REVIEW`, nói rõ chưa đủ thông tin để xác định lịch họp chính xác.
  - Điểm kết thúc: người dùng được dẫn về message nguồn `meeting-1` để tự hỏi lại nhóm hoặc chờ cập nhật thêm.
- Failure / no-grounding — không tìm thấy căn cứ:
  - Input demo: `/bot Ngày mai có deadline nộp bài không?`
  - Căn cứ trong prototype: không có message xác nhận deadline mới; chỉ có message nói "hiện chưa thấy thông báo deadline mới".
  - Phản hồi hệ thống: embed màu đỏ, nhãn `NO EVIDENCE`, trả lời rằng không tìm thấy thông tin xác nhận và không tự suy đoán deadline.
  - Điểm kết thúc: người dùng biết hệ thống không có căn cứ, tránh tin vào một deadline bịa.
- Correction — người dùng can thiệp sửa kết quả:
  - Input demo: `/bot Tóm tắt lịch học ngày mai.`
  - Tình huống: AI hiển thị kết quả ban đầu theo lịch cũ `08:00 — A203`, đồng thời cho thấy có message mới hơn cập nhật thành `08:30 — A305`.
  - Thao tác người dùng: bấm `Edit result`, sửa thời gian/phòng/địa điểm trong modal, rồi bấm `Lưu correction`.
  - Điểm kết thúc: bot đăng lại kết quả đã sửa trong `#daily-digest`, kèm source card về message cập nhật mới.
- Khi bị hỏi ngoài phạm vi:
  - Input ví dụ: hỏi thông tin không thuộc lịch học, họp nhóm, deadline hoặc cập nhật logistics.
  - Phản hồi hệ thống: bot hiển thị help embed với 4 câu mẫu đang hỗ trợ, không cố trả lời ngoài phạm vi bản mẫu.

## §7. Kiểm thử
- Chiều chất lượng + định nghĩa kiểm chứng được:
- Golden set (≥20 case theo cơ cấu trong guide §2.6, file trong eval/):
- Quality bar (chốt từ hạn chốt spec của khoá, giữ nguyên sau đó): "Đạt khi ≥ ___% qua bộ, và ___"
- Kết quả các lượt chạy (bảng % — cập nhật đến trước CP6):

## §8. Phân công & kế hoạch
- Phân công có tên: spec / evidence / prompt / code / demo
- Willing users (≥2 tên) + kế hoạch vòng validation *(bonus, nếu làm)*:
- Multi-prototype (nếu làm): trục khác biệt của ≥2 phương án + lý do chọn:

## §9. Changelog
| Thời điểm | Đổi gì | Vì sao (trỏ về feedback/case nào) |
```
