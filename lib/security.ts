/**
 * Security utilities for input validation and sanitization
 * 
 * OWASP References:
 * - A03:2021 Injection: Input validation prevents injection attacks
 * - A04:2021 Insecure Design: Schema-based validation enforces data contracts
 * - A07:2021 Identification and Authentication Failures: Rate limiting prevents brute force
 * 
 * @module security
 */

// =============================================================================
// INPUT VALIDATION - OWASP A03:2021 Injection Prevention
// =============================================================================

/**
 * Validate date format (YYYY-MM-DD)
 * Prevents date injection and ensures valid calendar dates
 */
export function isValidDateFormat(date: string): boolean {
  if (!date || typeof date !== 'string') return false
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(date)) return false
  
  // Validate it's an actual valid date
  const parsed = new Date(date)
  return !isNaN(parsed.getTime())
}

/**
 * Validate courtId against known courts (whitelist validation)
 * OWASP: Use allowlists over denylists for input validation
 */
const VALID_COURT_IDS = ['court-a', 'court-b', 'court-c', 'court-d']
export function isValidCourtId(courtId: string): boolean {
  if (!courtId || typeof courtId !== 'string') return false
  return VALID_COURT_IDS.includes(courtId)
}

/**
 * Validate time slot format (HH:00 between 07:00-21:00)
 * Strict regex prevents injection via malformed time strings
 */
export function isValidTimeSlot(slot: string): boolean {
  if (!slot || typeof slot !== 'string') return false
  const regex = /^(0[7-9]|1[0-9]|2[01]):00$/
  return regex.test(slot)
}

/**
 * Validate array of time slots with length limit
 * OWASP: Length limits prevent DoS via oversized payloads
 */
export function isValidTimeSlots(slots: string[]): boolean {
  if (!Array.isArray(slots) || slots.length === 0 || slots.length > 15) return false
  return slots.every(isValidTimeSlot)
}

/**
 * Validate email format with length limit (RFC 5322 max: 254)
 * OWASP A03: Prevents header injection in email handling
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  // RFC 5322 simplified regex
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email) && email.length <= 254
}

/**
 * Validate phone number (E.164 format, 6-15 digits)
 * Allows common formatting characters but validates digit count
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false
  // Allow digits, spaces, dashes, plus sign, parentheses
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '')
  return /^\d{6,15}$/.test(cleaned)
}

/**
 * Validate name with reasonable length limits
 * Min 2 chars prevents empty/single-char abuse, max 100 prevents storage abuse
 */
export function isValidName(name: string): boolean {
  if (!name || typeof name !== 'string') return false
  const trimmed = name.trim()
  return trimmed.length >= 2 && trimmed.length <= 100
}

// =============================================================================
// OUTPUT SANITIZATION - OWASP A03:2021 XSS Prevention
// =============================================================================

/**
 * Sanitize string for safe HTML display (prevents XSS)
 * OWASP A03: Encode output to prevent stored/reflected XSS attacks
 * @param input - User-provided string to sanitize
 * @returns HTML-escaped string safe for display
 */
export function sanitizeForDisplay(input: string): string {
  if (!input || typeof input !== 'string') return ''
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .slice(0, 500) // Limit length to prevent DoS
}

// =============================================================================
// RATE LIMITING - OWASP A07:2021 Brute Force Prevention
// =============================================================================

/**
 * In-memory rate limit store
 * WARNING: For production with multiple server instances, use Redis or similar
 * This resets on server restart - acceptable for Vercel serverless
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Check rate limit for an identifier (IP address, user ID, etc.)
 * OWASP A07: Prevents brute force attacks and DoS
 * 
 * @param identifier - Unique identifier for rate limiting (e.g., IP:endpoint)
 * @param maxRequests - Maximum requests allowed in the window (default: 60)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns Object with allowed status, remaining requests, and reset time
 * 
 * @example
 * const rateLimit = checkRateLimit(`availability:${ip}`, 100, 60000)
 * if (!rateLimit.allowed) {
 *   return new Response('Too Many Requests', { status: 429 })
 * }
 */
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

/**
 * Cleanup old rate limit entries to prevent memory leaks
 * Runs every minute in environments that support setInterval
 */
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
