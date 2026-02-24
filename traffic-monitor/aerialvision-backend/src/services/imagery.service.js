class ImageryService {
    
    /**
     * Converts a lat/lng to a Google Mercator tile coordinate
     */
    getTileCoordinate(lat, lng, zoom) {
        const numTiles = 1 << zoom;
        
        let x = (lng + 180) / 360 * numTiles;
        
        const latRad = lat * Math.PI / 180;
        let y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * numTiles;

        return {
            x: Math.floor(x),
            y: Math.floor(y)
        };
    }

    /**
     * Converts a Google Mercator tile coordinate to its precise center lat/lng
     */
    getTileCenter(x, y, zoom) {
        const numTiles = 1 << zoom;
        
        // Add 0.5 to get the center of the tile
        const centerLng = (x + 0.5) / numTiles * 360 - 180;
        const n = Math.PI - 2 * Math.PI * (y + 0.5) / numTiles;
        const centerLat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
        
        return { lat: centerLat, lng: centerLng };
    }

    /**
     * Takes an array of evenly sampled `{lat, lng}` points and computes the minimal set of tiles covering them
     * @param {Array<{lat, number, lng: number}>} sampledCoords 
     * @param {number} zoom 
     * @returns {Array<{tileId: string, center: {lat: number, lng: number}, zoom: number}>}
     */
    generateTileGrid(sampledCoords, zoom = 19) {
        const uniqueTiles = new Map();

        for (const coord of sampledCoords) {
            const { x, y } = this.getTileCoordinate(coord.lat, coord.lng, zoom);
            
            // Unique hash for this tile
            const tileId = `t_${zoom}_${x}_${y}`;
            
            if (!uniqueTiles.has(tileId)) {
                // Compute the exact center of this tile for the Static Maps API request
                const center = this.getTileCenter(x, y, zoom);
                
                uniqueTiles.set(tileId, {
                    tileId,
                    center,
                    zoom,
                    status: 'pending' // Default statua
                });
            }
        }

        return Array.from(uniqueTiles.values());
    }
}

module.exports = new ImageryService();
