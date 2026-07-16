import { FloorPlanObject, ObjectType } from '../types/editor';
import { getDefaultSize } from '../utils/geometryHelpers';

export const tokenLibrary: Array<{ type: ObjectType; label: string; description: string }> = [
  { type: 'room', label: 'Phòng / Khu vực', description: 'Khu vực phòng có thể co giãn kích thước' },
  { type: 'door', label: 'Cửa ra vào', description: 'Cửa thông giữa các phòng hoặc khu vực' },
  { type: 'exit', label: 'Lối thoát hiểm', description: 'Điểm thoát khẩn cấp an toàn' },
  { type: 'stairs', label: 'Cầu thang', description: 'Cầu thang bộ hoặc thang thoát hiểm' },
  { type: 'mq2', label: 'Cảm biến Khói (MQ2)', description: 'Phát hiện rò rỉ khí gas hoặc khói' },
  { type: 'temp', label: 'Cảm biến Nhiệt độ', description: 'Đo nhiệt độ môi trường trực tiếp' },
  { type: 'led', label: 'Đèn LED định hướng', description: 'Đèn LED chỉ đường thoát hiểm an toàn' },
  { type: 'label', label: 'Nhãn chữ tự do', description: 'Văn bản chú thích trên sơ đồ' },
];

export function createNewObject(type: ObjectType, x = 120, y = 120): FloorPlanObject {
  const size = getDefaultSize(type);
  const baseName = {
    room: 'Phòng mới',
    door: 'Cửa',
    exit: 'LỐI THOÁT',
    stairs: 'Cầu thang',
    mq2: 'CB Khói',
    temp: 'CB Nhiệt',
    led: 'Đèn LED',
    label: 'Nhãn chữ',
    connector: 'Đường nối',
  }[type];

  return {
    id: `${type}-${crypto.randomUUID()}`,
    type,
    name: baseName,
    x,
    y,
    width: size.width,
    height: size.height,
    rotation: 0,
    color: type === 'room' ? '#1f2937' : type === 'exit' ? '#22c55e' : type === 'label' ? '#f8fafc' : '#38bdf8',
    textColor: '#f8fafc',
    fontSize: type === 'label' ? 22 : 14,
    nodeStatus: type === 'led' ? 'safe' : undefined,
    locked: false,
    visible: true,
  };
}
