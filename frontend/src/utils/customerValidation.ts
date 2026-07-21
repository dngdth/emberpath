export function normalizeVietnamPhone(value: string) {
  let normalized = value.replace(/[\s().-]/g, '');
  if (normalized.startsWith('+84')) normalized = `0${normalized.slice(3)}`;
  else if (normalized.startsWith('84')) normalized = `0${normalized.slice(2)}`;
  return normalized;
}

export function validateFullName(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) return 'Vui lòng nhập họ và tên.';
  if (normalized.length < 2) return 'Họ và tên phải có ít nhất 2 ký tự.';
  if (!/^[\p{L}]+(?:[ '\-][\p{L}]+)*$/u.test(normalized)) {
    return 'Họ và tên chỉ được chứa chữ cái, khoảng trắng hoặc dấu gạch nối.';
  }
  return '';
}

export function validateVietnamPhone(value: string) {
  if (!value.trim()) return 'Vui lòng nhập số điện thoại.';
  if (!/^0[35789]\d{8}$/.test(normalizeVietnamPhone(value))) {
    return 'Nhập số di động Việt Nam hợp lệ, ví dụ 0901 234 567.';
  }
  return '';
}

export function validateEmail(value: string) {
  if (!value.trim()) return 'Vui lòng nhập email.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())) {
    return 'Địa chỉ email không hợp lệ.';
  }
  return '';
}
