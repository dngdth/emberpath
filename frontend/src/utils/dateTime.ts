const HAS_TIMEZONE = /(Z|[+-]\d{2}:?\d{2})$/i;

/**
 * The backend stores timestamps in UTC. SQLite returns those timestamps
 * without a timezone suffix, so make the UTC meaning explicit before parsing.
 */
export function parseApiDate(value: string) {
  return new Date(HAS_TIMEZONE.test(value) ? value : `${value}Z`);
}

export function formatVietnamDateTime(value: string) {
  return parseApiDate(value).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
  });
}

export function formatVietnamDate(value: string) {
  return parseApiDate(value).toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}
