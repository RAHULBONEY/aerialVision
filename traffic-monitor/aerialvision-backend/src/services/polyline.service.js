const { decode } = require('@googlemaps/polyline-codec');
const { getDistance, computeDestinationPoint } = require('geolib');

class PolylineService {
    
    /**
     * Resamples the given route at a fixed linear interval.
     * @param {string} encodedPolyline 
     * @param {number} intervalMeters 
     * @returns {Array<{lat: number, lng: number, index: number}>}
     */
    resamplePolyline(encodedPolyline, intervalMeters = 30) {
        if (!encodedPolyline) return [];

        // Decode native polyline [lat, lng][]
        const decodedPoints = decode(encodedPolyline);
        if (decodedPoints.length < 2) return [];

        // Convert [lat, lng] mapped arrays to objects for geolib
        const path = decodedPoints.map(p => ({ latitude: p[0], longitude: p[1] }));
        
        const sampledCoords = [];
        let numSamples = 0;
        let cumulativeDistance = 0; // Cumulative distance to the CURRENT path segment vertex
        
        sampledCoords.push({ 
            lat: path[0].latitude, 
            lng: path[0].longitude, 
            index: numSamples++ 
        });

        // Loop through segments
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            
            const segmentLength = getDistance(p1, p2);
            if (segmentLength === 0) continue;

            const nextVertexDist = cumulativeDistance + segmentLength;
            
            // While our target 30m steps fall within this segment
            let targetDist = numSamples * intervalMeters;
            while (targetDist <= nextVertexDist) {
                // Distance from p1 to the target point
                const distFromP1 = targetDist - cumulativeDistance;
                
                // Interpolate
                // computeDestinationPoint takes {lat, lng}, distance in meters, and bearing
                // Note: we can linearly interpolate lat/lng safely for small segments (30m interpolation on a <500m segment)
                const fraction = distFromP1 / segmentLength;
                const interpolatedPoint = {
                    lat: p1.latitude + (p2.latitude - p1.latitude) * fraction,
                    lng: p1.longitude + (p2.longitude - p1.longitude) * fraction
                };

                sampledCoords.push({
                    lat: interpolatedPoint.lat,
                    lng: interpolatedPoint.lng,
                    index: numSamples++
                });
                
                targetDist = numSamples * intervalMeters;
            }

            cumulativeDistance = nextVertexDist;
        }

        // Always push the very last point
        const lastP = path[path.length - 1];
        if (sampledCoords.length > 0) {
            const lastSample = sampledCoords[sampledCoords.length - 1];
            // If the last sample is very close to the end, don't duplicate. Otherwise, add.
            if (getDistance({latitude: lastSample.lat, longitude: lastSample.lng}, lastP) > 5) {
                sampledCoords.push({ lat: lastP.latitude, lng: lastP.longitude, index: numSamples });
            }
        }
        
        return sampledCoords;
    }
}

module.exports = new PolylineService();
