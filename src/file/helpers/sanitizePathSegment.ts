export function sanitizePathSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/\/+/g, '/') // лишние /
    .replace(/^\/|\/$/g, '') // убрать / в начале и конце
    .replace(/[^a-z0-9-_/]/g, ''); // только безопасные символы
}
