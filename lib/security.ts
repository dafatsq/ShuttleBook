/**
 * Security utilities for input validation and sanitization
 */

// Validate date format (YYYY-MM-DD)
export function isValidDateFormat(date: string): boolean {
  if (!date || typeof date !== 'string') return false
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(date)) return false
  
  // Validate it's an actual valid date
  const parsed = new Date(date)
  return !isNaN(parsed.getTime())
}

// Validate courtId against known courts
const VALID_COURT_IDS = ['court-a', 'court-b', 'court-c', 'court-d']
export function isValidCourtId(courtId: string): boolean {
  if (!courtId || typeof courtId !== 'string') return false
  return VALID_COURT_IDS.includes(courtId)
}

// Validate time slot format (HH:00)
export function isValidTimeSlot(slot: string): boolean {
  if (!slot || typeof slot !== 'string') return false
  const regex = /^(0[7-9]|1[0-9]|2[01]):00$/
  return regex.test(slot)
}

// Validate array of time slots
export function isValidTimeSlots(slots: string[]): boolean {
  if (!Array.isArray(slots) || slots.length === 0 || slots.length > 15) return false
  return slots.every(isValidTimeSlot)
}

// Validate email format
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  // RFC 5322 simplified regex
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email) && email.length <= 254
}

// Validate phone number (basic validation)
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false
  // Allow digits, spaces, dashes, plus sign, parentheses
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '')
  return /^\d{6,15}$/.test(cleaned)
}

// Validate name (basic validation)
export function isValidName(name: string): boolean {
  if (!name || typeof name !== 'string') return false
  const trimmed = name.trim()
  return trimmed.length >= 2 && trimmed.length <= 100
}

// Sanitize string for safe display (prevents XSS)
export function sanitizeForDisplay(input: string): string {
  if (!input || typeof input !== 'string') return ''
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .slice(0, 500) // Limit length
}

// Rate limiting store (in-memory, resets on server restart)
// For production, use Redis or similar
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 60, 
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs }
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now }
  }
  
  record.count++
  return { allowed: true, remaining: maxRequests - record.count, resetIn: record.resetTime - now }
}

// Clean up old rate limit entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }, 60000)
}
