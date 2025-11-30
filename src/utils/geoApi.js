// Lightweight client helper for nearby jobs + simple in-memory caching
const nearbyCache = new Map()

function cacheKey(lat, lng, radiusKm) {
  return `${lat}:${lng}:${radiusKm}`
}

export async function fetchJobsNear(authFetch, lat, lng, radiusKm = 50) {
  if (!lat || !lng) throw new Error('Missing coordinates')
  const key = cacheKey(lat, lng, radiusKm)
  if (nearbyCache.has(key)) {
    return nearbyCache.get(key)
  }

  // store the promise immediately to dedupe concurrent requests
    const p = (async () => {
      // Treat the rightmost slider value (500) as "unlimited" — return all jobs
      // but still include distance info. For unlimited, call the general jobs
      // listing endpoint with user coordinates so server will compute distances
      // rather than using the /jobs/near geospatial filter.
      let res, data
      if (Number(radiusKm) >= 500) {
        const url = `/api/jobs?status=open&userLat=${encodeURIComponent(lat)}&userLng=${encodeURIComponent(lng)}`
        res = await authFetch(url)
        data = await res.json()
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch jobs')
        return data.data?.jobs || data.jobs || []
      } else {
        const url = `/api/jobs/near?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radiusKm=${encodeURIComponent(radiusKm)}`
        res = await authFetch(url)
        data = await res.json()
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch nearby jobs')
        return data.data?.jobs || data.jobs || []
      }
  })()

  nearbyCache.set(key, p)
  try {
    const result = await p
    return result
  } catch (err) {
    nearbyCache.delete(key)
    throw err
  }
}

export function clearNearbyCache() { nearbyCache.clear() }

export function removeNearbyCacheEntry(lat, lng, radiusKm = 50) {
  nearbyCache.delete(cacheKey(lat, lng, radiusKm))
}

export default { fetchJobsNear, clearNearbyCache, removeNearbyCacheEntry }
