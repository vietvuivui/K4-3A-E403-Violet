# Reflection — Nguyễn Văn Quốc Việt (2A202602973)

## 1. Vai trò

Nhóm trưởng · Product Owner của nhóm Violet (Lớp 3A · E403 · Cụm 5). Phụ trách quản lý tiến độ, viết báo cáo (`spec.md`) và đóng góp ý tưởng sản phẩm.

## 2. Phần mình đã làm

- **Quản lý tiến độ:** chia việc theo vai trò (evidence — Thịnh, eval — Yến, code — Dương), theo dõi các mốc CP1–CP5 và nộp đúng hạn; lên kế hoạch cho buổi sáng 18/09 (lượt chạy lại golden set, user testing, slide, video, dry run).
- **Viết báo cáo `spec.md`:**
  - §1–§3: đưa kết quả khảo sát (n = 11) và số liệu mining pack vào phần bằng chứng; lập bảng impact 4 ứng viên và giải thích vì sao chọn "tra cứu logistics có dẫn nguồn"; so sánh với Slack AI và NotebookLM.
  - §4, §6: viết lại cho khớp với bản build thật (bản đầu mô tả một bản mock không còn đúng với code).
  - §7: gộp hai định nghĩa "đạt" mâu thuẫn thành **một quality bar 3 điều kiện**, chốt trước 21:00 17/09 và giữ nguyên sau đó; viết phần tự khai.
  - §8–§9: phân công, kế hoạch, changelog.
- **Đóng góp ý tưởng và quyết định sản phẩm:**
  - Chọn giữ tin nhắn Discord là **dữ liệu kín**: spec chỉ công bố số liệu tổng hợp, không trích nguyên văn tin nhắn trong repo công khai.
  - Không dùng bản cải tiến đạt 20/20 vì bản đó viết luật theo đúng câu chữ của golden set; chọn bản luật chung đạt 75% thật.
  - Tổng hợp góp ý người dùng vào `validation/user_testing_log.md` và chọn 2 thay đổi làm trước demo (phạm vi mặc định *Server hiện tại*, dòng nhắc mốc thời gian).

## 3. AI đã hỗ trợ thế nào

Mình dùng Claude Code (trong VS Code) như một trợ lý làm việc:
- **Hỗ trợ tốt:** đọc hiểu codebase và giải thích luồng dữ liệu; phân tích file khảo sát và đếm số liệu mining; soạn nháp các mục của spec theo rubric; đề xuất và viết code cải tiến (`v2-generic`), chạy test và chạy golden set; soát spec với rubric để tìm chỗ thiếu.
- **Mình vẫn phải tự quyết:** chọn track và lát cắt, chốt con số quality bar, quyết định cái gì được công khai, chọn phương án nào giữ lại, và kiểm tra lại mọi con số trước khi đưa vào báo cáo.
- **AI cũng từng sai:** có lần nó kết luận kết quả của một câu hỏi mà chưa chạy thử, sau đó chạy lại và phải sửa. Bài học: số liệu nào đưa vào báo cáo cũng phải được chạy hoặc đối chiếu thật.
- **AI cũng giữ mình lại:** khi mình muốn thêm dữ liệu cho đủ số lượng (thêm trích dẫn khảo sát, thêm người thử), AI từ chối tạo dữ liệu giả và đề xuất cách trung thực: dùng dữ liệu thật đang có và tự khai phần còn thiếu.

## 4. Bài học từ case fail của nhóm

**Case:** lượt 1 golden set chỉ đạt **10/20 (50%)**, thấp hơn quality bar 75% nhóm đã tự cam kết.

Khi tìm nguyên nhân, nhóm thấy lỗi không chỉ nằm ở model:
- Model trả `out_of_scope` cho câu hỏi logistics vì prompt định nghĩa nhãn quá mơ hồ, và hệ thống vẫn gọi model kể cả khi không tìm được tin nào.
- Một số nhãn trong golden set được đặt theo cảm tính, chưa đối chiếu với dữ liệu (#1, #6 thực ra có người trả lời trực tiếp).

Có lúc có một bản code đạt 20/20, nhưng đó là do viết luật theo đúng từ khoá của các câu trong đề — "học thuộc đề". Mình chọn không dùng bản đó, vì con số đẹp mà không phản ánh chất lượng thật thì sẽ lộ ngay khi giám khảo hỏi một câu lạ.

**Bài học lớn nhất:** *đặt chuẩn trước, đo trung thực, và sửa nguyên nhân gốc thay vì sửa cho con số*. Quality bar chỉ có giá trị khi nó được chốt trước và kết quả được đo bằng luật chung; nhãn đánh giá cũng phải có căn cứ từ dữ liệu, và mọi thay đổi sau khi đã thấy kết quả phải được ghi rõ. Nhờ vậy nhóm đi từ 50% → 65% → 75% mà vẫn giải thích được từng bước.

## 5. Nếu làm lại

- Gán nhãn golden set **kèm mã tin căn cứ ngay từ đầu**, trước khi chạy lần nào.
- Khảo sát sớm hơn để đủ ≥ 20 người (chuẩn A), và trực tiếp quan sát người thử thay vì chỉ nhận form.
- Tách một bộ câu hỏi kiểm tra độc lập ngoài golden set để biết kết quả có bị "khớp đề" hay không.
