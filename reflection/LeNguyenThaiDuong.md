# Reflection - Lê Nguyễn Thái Dương

**Vai trò:** AI Engineer - Prototype  

## 1. Phần việc mình phụ trách

Trong dự án này, mình phụ trách chính phần prototype trong thư mục `codebase/`. Công việc của mình gồm dựng server Node.js, đọc dữ liệu Discord archive, viết luồng retrieval để tìm tin nhắn liên quan, kết nối model AI qua provider, kiểm tra cấu trúc câu trả lời, kiểm tra nguồn trích dẫn và hoàn thiện giao diện demo để nhóm có thể trình bày sản phẩm chạy end-to-end.

mình cũng tham gia xử lý phần evaluation. Sau khi nhóm có golden set 20 câu, mình chạy evaluator, đọc các case fail và chỉnh lại logic để hệ thống phân loại đúng hơn giữa các trạng thái `answer`, `needs_review`, `no_evidence`, `out_of_scope` và `not_authorized`.

## 2. Những gì mình đã làm được

mình đã xây được một prototype có thể chạy thật, không chỉ là mock giao diện. Người dùng có thể hỏi một câu logistics, server sẽ tìm các tin nhắn liên quan trong archive, gửi evidence vào model và trả về kết quả có trạng thái rõ ràng. Với các câu có nguồn, hệ thống hiển thị nguồn để người dùng kiểm chứng lại thay vì chỉ tin vào câu trả lời của AI.

Một phần quan trọng mình làm là thêm lớp kiểm tra phía server. Model không được tự do trích nguồn ngoài evidence đã truy xuất. Nếu model trả lời quá tự tin, hoặc trả một trạng thái không phù hợp với loại câu hỏi, hệ thống sẽ hạ về trạng thái an toàn hơn như `needs_review` hoặc `no_evidence`. Điều này giúp sản phẩm đúng với mục tiêu ban đầu của nhóm: AI hỗ trợ tra cứu, nhưng không bịa thông tin logistics quan trọng.

mình cũng thêm các guard cho những lỗi evaluator phát hiện, ví dụ:

- Câu hỏi cần người kiểm chứng thì không trả `answer` quá tự tin.
- Câu hỏi không có bằng chứng trong archive thì trả `no_evidence`, không nhầm thành `out_of_scope`.
- Yêu cầu tạo lịch hoặc thao tác bên ngoài thì trả `not_authorized`.
- Câu hỏi về thông tin cá nhân thì trả `out_of_scope`.
- Câu hỏi về số lượng thành viên team có evidence rõ thì có thể trả `answer`.

## 3. Khó khăn mình gặp phải

Khó khăn lớn nhất là phân biệt đúng các trạng thái. Lúc đầu mình nghĩ chỉ cần prompt rõ thì model sẽ tự phân loại ổn. Nhưng khi chạy evaluation thật, model vẫn có xu hướng trả lời tự tin quá mức, hoặc nhầm giữa "không có thông tin" và "ngoài phạm vi". Điều này làm mình nhận ra rằng với sản phẩm AI liên quan đến deadline, lịch học, điểm danh hay thông báo khóa học, chỉ dựa vào prompt là chưa đủ.

Một khó khăn khác là retrieval ban đầu còn đơn giản. Vì chủ yếu dựa trên keyword nên có câu hỏi kéo được nhiều tin liên quan nhưng chưa chắc đúng intent. Ví dụ câu hỏi về team size cần tìm evidence nói rõ số lượng thành viên, không chỉ các tin có chữ "team". mình phải bổ sung logic để câu hỏi dạng này retrieve đúng hơn.

## 4. mình học được gì

Qua dự án này, mình học được rằng xây AI product không chỉ là gọi API model. Phần quan trọng hơn là thiết kế hệ thống biết giới hạn của nó. Có những lúc AI nên trả lời, nhưng cũng có nhiều lúc AI nên nói "chưa đủ nguồn", "cần kiểm chứng" hoặc "không có quyền làm việc đó".

mình cũng học được giá trị của evaluation. Nếu chỉ demo vài câu chạy được thì rất dễ tưởng sản phẩm đã ổn. Nhưng khi có golden set, từng lỗi hiện ra rõ ràng hơn: lỗi retrieval, lỗi prompt, lỗi model output, lỗi validate source hoặc lỗi phân loại trạng thái. Nhờ có số đo pass rate, nhóm biết chính xác cần sửa phần nào thay vì sửa theo cảm giác.

Ngoài ra, mình hiểu hơn về việc làm sản phẩm AI có trách nhiệm. Với bài toán logistics khóa học, một câu trả lời sai có thể khiến học viên đi nhầm phòng, bỏ lỡ deadline hoặc hiểu sai quy định. Vì vậy hệ thống cần ưu tiên an toàn và khả năng kiểm chứng hơn là cố trả lời cho bằng được.

## 5. Nếu có thêm thời gian, mình sẽ cải thiện gì

Nếu có thêm thời gian, mình muốn cải thiện retrieval để hiểu intent tốt hơn, thay vì chỉ dựa vào keyword. mình cũng muốn bổ sung `expected_source_id` vào golden set để evaluator không chỉ chấm đúng trạng thái, mà còn kiểm tra được câu trả lời có trích đúng nguồn hay không.

mình cũng muốn làm log dễ đọc hơn. Hiện tại log có đủ thông tin để debug, nhưng chưa thân thiện với các bạn không phụ trách code. Nếu tách rõ model trả gì, guard sửa gì và vì sao sửa, nhóm sẽ dễ phân tích lỗi hơn trong các lượt evaluation sau.

## 6. Tự đánh giá

mình thấy phần đóng góp của mình đã giúp prototype đi từ ý tưởng thành một sản phẩm có thể chạy, có AI thật, có dữ liệu thật đã ẩn danh, có kiểm tra nguồn và có evaluator để đo chất lượng. Điểm mình làm tốt là không để model toàn quyền quyết định kết quả cuối cùng, mà thêm các lớp kiểm tra để giảm rủi ro trả lời sai.

Điểm mình cần cải thiện là thiết kế code còn nhiều rule thủ công vì thời gian hackathon ngắn. Các rule này giúp xử lý golden set hiện tại, nhưng nếu mở rộng sang dữ liệu mới thì cần refactor và kiểm thử lại để tránh overfit. Sau dự án này, mình hiểu rõ hơn vai trò AI Engineer không chỉ là nối model vào app, mà là xây một hệ thống biết trả lời có căn cứ, biết từ chối đúng lúc và chứng minh được chất lượng bằng số liệu.
