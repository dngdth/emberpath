import { FloorPlanObject, ObjectType } from '../types/editor';
import { getDefaultSize } from '../utils/geometryHelpers';

export const tokenLibrary: Array<{ type: string; label: string; description: string }> = [
  { type: 'floor_base', label: 'Nền tầng (Chữ nhật)', description: 'Diện tích chung sàn dạng hình chữ nhật' },
  { type: 'floor_base-pen', label: 'Nền tầng (Bút vẽ - Pen)', description: 'Chấm điểm vẽ đa giác tự do cho nền sàn' },
  { type: 'room', label: 'Phòng (Chữ nhật)', description: 'Khu vực phòng hình chữ nhật' },
  { type: 'room-pen', label: 'Phòng (Bút vẽ - Pen)', description: 'Chấm điểm vẽ đa giác tự do cho phòng' },
  { type: 'door', label: 'Cửa ra vào', description: 'Cửa thông giữa các phòng hoặc khu vực' },
  { type: 'exit', label: 'Lối thoát hiểm', description: 'Điểm thoát khẩn cấp an toàn' },
  { type: 'stairs', label: 'Cầu thang', description: 'Cầu thang bộ hoặc thang thoát hiểm' },
  { type: 'elevator', label: 'Thang máy', description: 'Thang máy di chuyển liên tầng' },
  { type: 'wall', label: 'Tường / Vật cản', description: 'Tường chắn vật lý ngăn cản đường nối' },
  { type: 'mq2', label: 'Cảm biến Khói (MQ2)', description: 'Phát hiện rò rỉ khí gas hoặc khói' },
  { type: 'temp', label: 'Cảm biến Nhiệt độ', description: 'Đo nhiệt độ môi trường trực tiếp' },
  { type: 'led', label: 'Đèn LED định hướng', description: 'Đèn LED chỉ đường thoát hiểm an toàn' },
  { type: 'label', label: 'Nhãn chữ tự do', description: 'Văn bản chú thích trên sơ đồ' },
];

export function createNewObject(type: string, x = 120, y = 120): FloorPlanObject {
  const isFloorBase = type.startsWith('floor_base');
  const isRoom = type.startsWith('room');
  const actualType = isFloorBase ? 'floor_base' : isRoom ? 'room' : type as ObjectType;

  const size = getDefaultSize(actualType);
  const baseName = {
    floor_base: 'Nền tầng',
    room: 'Phòng mới',
    door: 'Cửa',
    exit: 'LỐI THOÁT',
    stairs: 'Cầu thang',
    elevator: 'Thang máy',
    wall: 'Tường',
    mq2: 'CB Khói',
    temp: 'CB Nhiệt',
    led: 'Đèn LED',
    label: 'Nhãn chữ',
    connector: 'Đường nối',
  }[actualType] || 'Vật thể';

  const shapeType = type.endsWith('-pen') ? 'polygon' : 'rect';
  // Default hexagon relative points if polygon is added directly via double click instead of Pen drawing
  const points = shapeType === 'polygon' ? [
    size.width * 0.25, 0,
    size.width * 0.75, 0,
    size.width, size.height * 0.5,
    size.width * 0.75, size.height,
    size.width * 0.25, size.height,
    0, size.height * 0.5
  ] : undefined;

  return {
    id: `${actualType}-${crypto.randomUUID()}`,
    type: actualType,
    name: baseName,
    x,
    y,
    width: size.width,
    height: size.height,
    rotation: 0,
    color: actualType === 'floor_base' ? '#1e293b' : actualType === 'room' ? '#1f2937' : actualType === 'exit' ? '#22c55e' : actualType === 'label' ? '#f8fafc' : actualType === 'wall' ? '#64748b' : '#38bdf8',
    textColor: '#f8fafc',
    fontSize: actualType === 'label' ? 22 : 14,
    nodeStatus: actualType === 'led' ? 'safe' : undefined,
    locked: false,
    visible: true,
    shapeType,
    points,
  };
}
