const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);

class TileCacheService {
    constructor() {
        // Fix 1: Added maxRetriesPerRequest: null (Crucial for Upstash/BullMQ)
        this.redisClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
            lazyConnect: true, // Don't crash if Redis isn't immediately available
            maxRetriesPerRequest: null,
            family: 4,
            tls: { rejectUnauthorized: false }
        });
        
        this.useRedis = false;
        
        // Setup local fallback directory
        this.fallbackDir = path.join(__dirname, '../../public/tiles_cache');
        if (!fs.existsSync(this.fallbackDir)) {
            fs.mkdirSync(this.fallbackDir, { recursive: true });
        }

        this.init();
    }

    async init() {
        try {
            await this.redisClient.connect();
            this.useRedis = true;
            console.log('✅ TileCacheService connected to Redis.');
        } catch (err) {
            console.warn('⚠️ Redis not available. Falling back to File System for tile cache.', err.message);
            this.useRedis = false;
        }
    }

    /**
     * Store binary image buffer in cache
     * @param {string} tileId 
     * @param {Buffer} imageBuffer 
     */
    async storeTile(tileId, imageBuffer) {
        if (!tileId || !imageBuffer) return;

        // 2 hours TTL
        const ttlSeconds = 7200; 
        
        // Fix 2: Removed the duplicate/unprotected setex line that was here causing the crash!

        if (this.useRedis) {
            try {
                await this.redisClient.setex(`tile:${tileId}`, ttlSeconds, imageBuffer);
                return;
            } catch (err) {
                console.error(`Failed to write to Redis: ${err.message}. Falling back to FS.`);
            }
        }

        // Fallback to File System
        const filePath = path.join(this.fallbackDir, `${tileId}.png`);
        await writeFileAsync(filePath, imageBuffer);
    }

    /**
     * Retrieve binary image buffer from cache
     * @param {string} tileId 
     * @returns {Promise<Buffer|null>}
     */
    async getTile(tileId) {
        if (this.useRedis) {
            try {
                // Return buffer directly
                const buffer = await this.redisClient.getBuffer(`tile:${tileId}`);
                if (buffer) return buffer;
            } catch (err) {
                console.error(`Redis read error: ${err.message}`);
            }
        }

        // Check fallback File System
        const filePath = path.join(this.fallbackDir, `${tileId}.png`);
        if (fs.existsSync(filePath)) {
            return await readFileAsync(filePath);
        }

        return null;
    }

    /**
     * Batch check which tiles correspond to a hit
     * @param {string[]} tileIds 
     * @returns {Promise<string[]>} List of tileIds that are ALREADY in the cache
     */
    async checkExistingTiles(tileIds) {
        if (!tileIds || tileIds.length === 0) return [];
        
        const existing = [];

        if (this.useRedis) {
            try {
                // Pipeline to avoid 200 individual requests
                const pipeline = this.redisClient.pipeline();
                tileIds.forEach(id => pipeline.exists(`tile:${id}`));
                const results = await pipeline.exec();
                
                results.forEach((result, index) => {
                    // result is [error, value]. value === 1 means exists.
                    if (!result[0] && result[1] === 1) {
                        existing.push(tileIds[index]);
                    }
                });
                return existing;
            } catch (err) {
                console.error(`Redis pipeline check error: ${err.message}`);
            }
        }

        // Fallback check FS
        for (const id of tileIds) {
            if (fs.existsSync(path.join(this.fallbackDir, `${id}.png`))) {
                existing.push(id);
            }
        }

        return existing;
    }
}

module.exports = new TileCacheService();