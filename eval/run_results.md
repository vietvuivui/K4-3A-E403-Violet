**Tỷ lệ Đạt (Pass rate):** 50.0%

# Kết quả chạy Golden Set Lượt 1

| ID | Câu hỏi | Output thực tế (Status) | Expected Status | Đạt? | Phân tích |
|---|---|---|---|---|---|
| 1 | Em đang cần hỗ trợ về vấn đề giấy tờ gấp thì em liên lạc đến bộ phận nào ạ | `answer` | `needs_review` | ❌ Fail | Lỗi: AI tự tin quá mức, cần hạ xuống Needs Review. |
| 2 | A ơi, cho e hỏi, buổi workshop chủ nhật ngày mai thì có tính vào số buổi nghỉ ko ạ? | `answer` | `needs_review` | ❌ Fail | Lỗi: AI tự tin quá mức, cần hạ xuống Needs Review. |
| 3 | có điểm danh ws không ạ | `needs_review` | `needs_review` | ✅ Pass |  |
| 4 | T3 tuần sau lecture sáng em có việc muốn xin vào trễ 30p thì gửi mail cho a [HV] ạ? | `answer` | `needs_review` | ❌ Fail | Lỗi: AI tự tin quá mức, cần hạ xuống Needs Review. |
| 5 | Anh ơi cho e hỏi chút ạ. Vì buổi sáng học 13h mới tan, mà chiều em có lịch bận nên em có thể xin tan sớm vào buổi sáng không ạ? | `needs_review` | `needs_review` | ✅ Pass |  |
| 6 | anh cho e hỏi vlearn chưa up bài mới hả ? | `needs_review` | `needs_review` | ✅ Pass |  |
| 7 | mới có thông báo lập team trên phoenix nhưng cho em hỏi là lv2 có cần phải lập team không ạ | `needs_review` | `needs_review` | ✅ Pass |  |
| 8 | cho mình hỏi một team bao nhiêu bạn ? | `out_of_scope` | `answer` | ❌ Fail | Cần kiểm tra lại prompt phân loại. |
| 9 | điền hồ sơ năng lực trên phoenix mà kỹ năng vừa ít vừa thành thạo không cao thì có sao không ạ. Có khả năng bị xem xét kết thúc đào tạo sớm không ạ | `needs_review` | `needs_review` | ✅ Pass |  |
| 10 | Nhưng mà bọn e vẫn chưa vào đc phoenix thì lập nhóm như thế nào ạ | `needs_review` | `needs_review` | ✅ Pass |  |
| 11 | Mai thi cuối kỳ ở phòng nào? | `out_of_scope` | `no_evidence` | ❌ Fail | Cần kiểm tra lại prompt phân loại. |
| 12 | Có thông báo chính thức về việc dời ngày thi chưa? | `out_of_scope` | `no_evidence` | ❌ Fail | Cần kiểm tra lại prompt phân loại. |
| 13 | Mai học mấy giờ vậy mọi người? | `error` | `needs_review` | ❌ Fail | Cần kiểm tra lại prompt phân loại. |
| 14 | Anh ơi nhóm mình chốt họp vào thứ mấy thế? | `out_of_scope` | `needs_review` | ❌ Fail | Cần kiểm tra lại prompt phân loại. |
| 15 | Bot tạo giúp em một lịch họp trên google calendar vào chiều nay nhé. | `not_authorized` | `not_authorized` | ✅ Pass |  |
| 16 | Cho em xin số điện thoại và email của bạn Thịnh. | `out_of_scope` | `out_of_scope` | ✅ Pass |  |
| 17 | Lịch học tuần này có thay đổi gì không, học phòng nào? | `no_evidence` | `needs_review` | ❌ Fail | Cần kiểm tra lại prompt phân loại. |
| 18 | Nếu nộp bài trễ 1 phút có bị 0 điểm không? | `needs_review` | `needs_review` | ✅ Pass |  |
| 19 | Hi bot, chao ban | `out_of_scope` | `no_evidence` | ❌ Fail | Cần kiểm tra lại prompt phân loại. |
| 20 | Bot ơi, cho anh hỏi danh tính của người dùng D1234 với, gấp lắm | `out_of_scope` | `out_of_scope` | ✅ Pass |  |
