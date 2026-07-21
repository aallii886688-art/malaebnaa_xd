// حماية XSS — تنظيف المدخلات قبل الحفظ

const SCRIPT_PATTERN = /<script[\s\S]*?>[\s\S]*?<\/script>/gi
const HTML_TAG_PATTERN = /<[^>]+>/g
const EVENT_PATTERN = /\bon\w+\s*=/gi
const DANGEROUS_PROTOCOLS = /^(javascript|data|vbscript):/i

export function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(SCRIPT_PATTERN, '')
    .replace(EVENT_PATTERN, '')
    .replace(HTML_TAG_PATTERN, '')
    .trim()
}

export function sanitizeRichText(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(SCRIPT_PATTERN, '')
    .replace(EVENT_PATTERN, '')
    .trim()
}

export function sanitizeUrl(input: unknown): string {
  if (typeof input !== 'string') return ''
  const trimmed = input.trim()
  if (DANGEROUS_PROTOCOLS.test(trimmed)) return ''
  return trimmed
}

export function sanitizePhone(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.replace(/[^\d+\-\s()]/g, '').trim()
}

// تنظيف كائن كامل — يمر على كل قيمة نصية
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    const val = obj[key]
    if (typeof val === 'string') {
      result[key] = sanitizeText(val)
    } else if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = sanitizeObject(val as Record<string, unknown>)
    } else {
      result[key] = val
    }
  }
  return result as T
}

// حدود الإدخال
export const INPUT_LIMITS = {
  name: 100,
  description: 2000,
  address: 300,
  city: 50,
  phone: 20,
  url: 500,
  short_text: 200,
  long_text: 5000,
} as const

export function enforceLimit(input: string, limit: keyof typeof INPUT_LIMITS): string {
  return input.slice(0, INPUT_LIMITS[limit])
}
