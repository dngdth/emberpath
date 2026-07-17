import { Eye, Zap, Compass, LayoutDashboard } from 'lucide-react';

import img1 from '../images/1.jpg';
import img2 from '../images/2.jpg';
import img3 from '../images/3.jpg';
import img4 from '../images/4.jpg';

export const problemSolutionItems = [
  {
    title: 'Thiếu khả năng giám sát',
    problem: 'Người vận hành không nắm được trạng thái cảm biến khói và nhiệt độ tại từng khu vực trong thời gian thực, dẫn đến phát hiện trễ.',
    solutionTitle: 'Bản Đồ Số Trực Quan',
    solution: 'Bản đồ số cập nhật trực quan toàn bộ trạng thái cảm biến khói (MQ2) và nhiệt độ theo thời gian thực tại mọi khu vực.',
    solutionIcon: Eye,
    image: img1,
  },
  {
    title: 'Phản ứng khẩn cấp chậm trễ',
    problem: 'Quy trình báo động thủ công và thiếu liên kết thường mất nhiều phút quý giá, làm bỏ lỡ thời điểm vàng để dập lửa.',
    solutionTitle: 'Cảnh Báo WebSocket Tức Thời',
    solution: 'Emberpath tự động gửi thông báo khẩn cấp tức thời qua WebSocket tốc độ cao đến admin và người dùng dưới 1 giây.',
    solutionIcon: Zap,
    image: img2,
  },
  {
    title: 'Sơ đồ tòa nhà phức tạp',
    problem: 'Trong khói bụi dày đặc, người sơ tán rất dễ hoảng loạn và đi vào những lối thoát hiểm đã bị đám cháy bao vây.',
    solutionTitle: 'Lối Thoát Hiểm Thông Minh',
    solution: 'Thuật toán Dijkstra tự động tính toán, cách ly vùng nguy hiểm và lập tức vẽ tuyến đường thoát hiểm an toàn nhất.',
    solutionIcon: Compass,
    image: img3,
  },
  {
    title: 'Quản lý nhiều tòa nhà',
    problem: 'Gặp khó khăn lớn khi phải theo dõi, kiểm tra và bảo trì định kỳ tình trạng thiết bị của nhiều chi nhánh hoặc tòa nhà riêng biệt.',
    solutionTitle: 'Hợp Nhất Quản Trị Tập Trung',
    solution: 'Hợp nhất toàn bộ dữ liệu trạng thái cảm biến từ tất cả các tòa nhà về một Dashboard duy nhất để quản trị tập trung.',
    solutionIcon: LayoutDashboard,
    image: img4,
  },
];
