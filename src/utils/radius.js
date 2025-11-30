// Simple radius utility for UI and testing
const DEFAULT_RADIUS = 50
const MIN_RADIUS = 1
const MAX_RADIUS = 500

function clampRadius(value, min = MIN_RADIUS, max = MAX_RADIUS) {
  if (value === undefined || value === null) return DEFAULT_RADIUS
  let v = Number(value)
  if (!Number.isFinite(v) || isNaN(v)) return DEFAULT_RADIUS
  if (v < min) return min
  if (v > max) return max
  return Math.round(v)
}

function parseRadius(value) {
  return clampRadius(value)
}

module.exports = { DEFAULT_RADIUS, MIN_RADIUS, MAX_RADIUS, clampRadius, parseRadius }
