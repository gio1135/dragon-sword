/**
 * Formatting utilities for displaying statistics
 */

/**
 * Format ticks into human-readable time (hours, minutes, seconds)
 * @param {number} ticks - Game ticks (20 ticks = 1 second)
 * @returns {string} Formatted time string
 */
export function formatTime(ticks) {
  if (!ticks || ticks < 0) return '0s'

  const totalSeconds = Math.floor(ticks / 20)

  if (totalSeconds < 60) {
    return `${totalSeconds}s`
  }

  if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  }

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

/**
 * Format distance from centimeters to readable units
 * @param {number} cm - Distance in centimeters
 * @returns {string} Formatted distance string
 */
export function formatDistance(cm) {
  if (!cm || cm < 0) return '0 blocks'

  const blocks = cm / 100

  if (blocks < 1) {
    return `${cm} cm`
  }

  if (blocks < 1000) {
    return `${blocks.toFixed(1)} blocks`
  }

  const km = blocks / 1000
  return `${km.toFixed(2)} km`
}

/**
 * Format a large number with commas
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
  if (num === undefined || num === null) return '0'
  return Math.floor(num).toLocaleString('en-US')
}

/**
 * Format damage (stored in tenths of hearts) to hearts
 * @param {number} tenths - Damage in tenths of hearts
 * @returns {string} Formatted damage string
 */
export function formatDamage(tenths) {
  if (!tenths || tenths < 0) return '0'

  const hearts = tenths / 10
  if (hearts < 10) {
    return hearts.toFixed(1)
  }
  return formatNumber(Math.floor(hearts))
}

/**
 * Format a type id for display (title case, no namespace)
 * @param {string} typeId - The type id to format
 * @returns {string} Formatted display name
 */
export function formatTypeId(typeId) {
  if (!typeId) return 'Unknown'

  const clean = typeId.replace(/^[^:]+:/, '')
  return clean
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Format a percentage
 * @param {number} value - The value
 * @param {number} total - The total
 * @returns {string} Formatted percentage string
 */
export function formatPercent(value, total) {
  if (!total || total === 0) return '0%'
  const percent = (value / total) * 100
  return `${percent.toFixed(1)}%`
}

/**
 * Format a rate (per hour)
 * @param {number} count - The count
 * @param {number} ticks - Time in ticks
 * @returns {string} Formatted rate string
 */
export function formatPerHour(count, ticks) {
  if (!count || !ticks || ticks === 0) return '0/hr'

  const hours = ticks / 20 / 3600
  if (hours < 0.01) return '0/hr'

  const rate = count / hours
  return `${rate.toFixed(1)}/hr`
}

/**
 * Format a timestamp to relative time
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Relative time string
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Never'

  const now = Date.now()
  const diff = now - timestamp

  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'Just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/**
 * Format a date timestamp to readable date
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted date string
 */
export function formatDate(timestamp) {
  if (!timestamp) return 'Unknown'

  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Truncate a string to a maximum length
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export function truncate(str, maxLength = 20) {
  if (!str) return ''
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength - 3) + '...'
}

/**
 * Get top n entries from a bytype object
 * @param {object} byType - object with type -> count mapping
 * @param {number} n - Number of entries to return
 * @returns {Array<{type: string, count: number}>} Top n entries
 */
export function getTopEntries(byType, n = 5) {
  if (!byType || typeof byType !== 'object') return []

  return Object.entries(byType)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

/**
 * Get all entries from a bytype object, sorted by count descending
 * @param {object} byType - Object with type -> count mapping
 * @returns {Array<{type: string, count: number}>} All entries sorted
 */
export function getAllEntries(byType) {
  if (!byType || typeof byType !== 'object') return []

  return Object.entries(byType)
    .map(([type, count]) => ({ type, count }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count)
}

/**
 * Create a progress bar string
 * @param {number} value - Current value
 * @param {number} max - Maximum value
 * @param {number} width - Bar width in characters
 * @returns {string} Progress bar string
 */
export function progressBar(value, max, width = 10) {
  if (!max || max === 0) return '░'.repeat(width)

  const percent = Math.min(value / max, 1)
  const filled = Math.round(percent * width)
  const empty = width - filled

  return '█'.repeat(filled) + '░'.repeat(empty)
}