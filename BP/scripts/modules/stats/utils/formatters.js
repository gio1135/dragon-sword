
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

export function formatNumber(num) {
if (num === undefined || num === null) return '0'
return Math.floor(num).toLocaleString('en-US')
}

export function formatDamage(tenths) {
if (!tenths || tenths < 0) return '0'

const hearts = tenths / 10
if (hearts < 10) {
 return hearts.toFixed(1)
}
return formatNumber(Math.floor(hearts))
}

export function formatTypeId(typeId) {
if (!typeId) return 'Unknown'

const clean = typeId.replace(/^[^:]+:/, '')
return clean
 .split('_')
 .map(word => word.charAt(0).toUpperCase() + word.slice(1))
 .join(' ')
}

export function formatPercent(value, total) {
if (!total || total === 0) return '0%'
const percent = (value / total) * 100
return `${percent.toFixed(1)}%`
}

export function formatPerHour(count, ticks) {
if (!count || !ticks || ticks === 0) return '0/hr'

const hours = ticks / 20 / 3600
if (hours < 0.01) return '0/hr'

const rate = count / hours
return `${rate.toFixed(1)}/hr`
}

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

export function formatDate(timestamp) {
if (!timestamp) return 'Unknown'

const date = new Date(timestamp)
return date.toLocaleDateString('en-US', {
 month: 'short',
 day: 'numeric',
 year: 'numeric'
})
}

export function truncate(str, maxLength = 20) {
if (!str) return ''
if (str.length <= maxLength) return str
return str.substring(0, maxLength - 3) + '...'
}

export function getTopEntries(byType, n = 5) {
if (!byType || typeof byType !== 'object') return []

return Object.entries(byType)
 .map(([type, count]) => ({ type, count }))
 .sort((a, b) => b.count - a.count)
 .slice(0, n)
}

export function getAllEntries(byType) {
if (!byType || typeof byType !== 'object') return []

return Object.entries(byType)
 .map(([type, count]) => ({ type, count }))
 .filter(({ count }) => count > 0)
 .sort((a, b) => b.count - a.count)
}

export function progressBar(value, max, width = 10) {
if (!max || max === 0) return '░'.repeat(width)

const percent = Math.min(value / max, 1)
const filled = Math.round(percent * width)
const empty = width - filled

return '█'.repeat(filled) + '░'.repeat(empty)
}