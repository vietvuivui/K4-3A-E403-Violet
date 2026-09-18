# Reflection Cá Nhân - Nguyễn Phát Thịnh (2A202602645)

## 1. Vai trò và phần việc phụ trách
Trong dự án này, em đảm nhận vai trò **Research & Evidence**. Phần việc cụ thể của em bao gồm:
- Mining (đào) dữ liệu từ `discord-pack` để chọn lọc ra những tin nhắn chứng minh nỗi đau của học viên khi tra cứu logistics, từ đó đúc kết Evidence (Mục §1 trong Spec).
- Xây dựng 20 câu hỏi cho tập kiểm thử Golden Set (trong đó có 10 câu lấy từ data thật và 10 câu bẫy rủi ro). Trực tiếp chạy test tự động Lượt 1 và tổng hợp báo cáo lỗi.
- Đóng vai trò chính trong khâu tìm kiếm 2 "willing users" và thực hiện vòng chạy Validation (Test UI) với 5 người dùng thử để lấy feedback.

## 2. AI đã hỗ trợ em như thế nào?
- **Khâu thiết kế Test Case (Bẫy AI):** Em đã tương tác và yêu cầu AI (Antigravity/Gemini) đóng vai trò tư duy phản biện, giúp em sinh ra các "kịch bản bẫy" (Corner cases) hóc búa thuộc Lớp 1 (Bịa fact) và Lớp 3 (Vượt thẩm quyền) để ép hệ thống lòi ra điểm yếu. 
- **Khâu tự động hoá Eval:** AI đã hỗ trợ em code một đoạn script Node.js ngắn (`run.js`) để tự động bắn 20 câu hỏi vào Backend thay vì em phải gõ tay từng câu, giúp rút ngắn thời gian test từ 30 phút xuống còn 30 giây.

## 3. Bài học từ một Case Fail của nhóm
- **Tình huống (Case fail):** Trong lượt chạy Eval đầu tiên của nhóm, khi em test thử câu hỏi *"Mai thi cuối kỳ phòng nào?"* (Hỏi một thông tin bịa đặt, hoàn toàn không có trong lịch sử Discord), hệ thống thay vì trả về `NO_EVIDENCE` (Báo chưa có thông báo) thì lại vội vàng gán nhãn `OUT_OF_SCOPE` (Ngoài phạm vi hệ thống).
- **Bài học rút ra:** Qua tình huống này, em học được rằng LLM rất dễ "nhập nhằng" khái niệm giữa việc **"Thiếu dữ liệu"** và việc **"Vượt quá thẩm quyền"**. Khi prompt không quy định rõ ràng, AI sẽ xử lý sai lệch. Bài học cốt lõi là: Khi làm việc với AI trong một môi trường có hậu quả cao (như báo sai lịch thi), ta không được phép phó mặc cho AI tự suy diễn các khái niệm, mà phải định nghĩa thật rạch ròi bằng các quy luật cứng (Rule-based constraints) ngay trong Prompt trung tâm.
