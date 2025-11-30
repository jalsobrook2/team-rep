// Simple Nominatim (OpenStreetMap) geocoding helper
// Uses the public Nominatim API. For production use, consider using a paid/geocoding service
// and cache results. Respect Nominatim usage policy: set a descriptive User-Agent and avoid heavy automated use.
async function geocodeAddress(address) {
  if (!address || typeof address !== 'string') return null;
  try {
    const query = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': process.env.NOMINATIM_USER_AGENT || 'PocketJobs/1.0 (+https://example.com)'
      },
      // Nominatim blocks requests without proper headers; set a small timeout via AbortController if desired
    });
    if (!res.ok) {
      console.warn('Nominatim geocode HTTP error', res.status);
      return null;
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0];
    return {
      lat: parseFloat(first.lat),
      lon: parseFloat(first.lon)
    };
  } catch (err) {
    console.warn('Geocode error:', err && err.message ? err.message : err);
    return null;
  }
}

module.exports = { geocodeAddress };
