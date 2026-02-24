const axios = require('axios');

class RouteService {
    constructor() {
        this.baseUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    }

    /**
     * Compute route using Google Maps Routes API (Directions v2)
     * @param {{lat: number, lng: number}} origin 
     * @param {{lat: number, lng: number}} destination 
     * @param {Object} options 
     */
    async computeEmergencyRoutes(origin, destination, options = {}) {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            throw new Error('GOOGLE_MAPS_API_KEY is not defined in environment variables.');
        }

        const { alternatives = true, travelMode = 'DRIVE', routingPreference = 'TRAFFIC_AWARE' } = options;

        const payload = {
            origin: {
                location: { latLng: { latitude: origin.lat, longitude: origin.lng } }
            },
            destination: {
                location: { latLng: { latitude: destination.lat, longitude: destination.lng } }
            },
            travelMode,
            routingPreference,
            computeAlternativeRoutes: alternatives,
        };

        const headers = {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            // FieldMask: Request distance, duration, polyline, and leg steps with polylines
            'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.steps.startLocation,routes.legs.steps.endLocation,routes.legs.steps.polyline.encodedPolyline'
        };

        try {
            const response = await axios.post(this.baseUrl, payload, { headers });
            return this.formatGoogleRoutesResponse(response.data);
        } catch (error) {
            console.error('Error computing routes:', JSON.stringify(error?.response?.data || error.message, null, 2));
            throw new Error('Failed to compute route from Google Routes API: ' + (error?.response?.data?.error?.message || error.message));
        }
    }

    /**
     * Transform the raw Google Routes response into our internal schema
     */
    formatGoogleRoutesResponse(data) {
        if (!data.routes || data.routes.length === 0) {
            return [];
        }

        return data.routes.map((route, index) => {
            const steps = [];
            
            // Extract steps from legs
            if (route.legs) {
                for (const leg of route.legs) {
                    if (leg.steps) {
                        for (const step of leg.steps) {
                            steps.push({
                                distanceMeters: step.distanceMeters,
                                durationSeconds: parseInt(step.staticDuration?.replace('s', '') || '0'),
                                startLocation: {
                                    lat: step.startLocation?.latLng?.latitude,
                                    lng: step.startLocation?.latLng?.longitude,
                                },
                                endLocation: {
                                    lat: step.endLocation?.latLng?.latitude,
                                    lng: step.endLocation?.latLng?.longitude,
                                },
                                encodedPolyline: step.polyline?.encodedPolyline
                            });
                        }
                    }
                }
            }

            return {
                routeIndex: index,
                label: index === 0 ? 'primary' : `alternative-${index}`,
                distanceMeters: route.distanceMeters,
                durationSeconds: parseInt(route.duration?.replace('s', '') || '0'),
                encodedPolyline: route.polyline?.encodedPolyline,
                steps: steps
            };
        });
    }
}

module.exports = new RouteService();
