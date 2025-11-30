// Utility functions for geographic calculations
// Haversine formula to compute distance between two lat/lon points
function toRadians(deg){
  return deg * Math.PI / 180;
}

// Returns distance in kilometers between two points (lat1, lon1) and (lat2, lon2)
function distanceKm(lat1, lon1, lat2, lon2){
  if ([lat1, lon1, lat2, lon2].some(v => typeof v !== 'number' || Number.isNaN(v))) return null;
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = { distanceKm };
