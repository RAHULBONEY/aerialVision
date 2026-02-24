const { Queue, Worker, QueueEvents } = require('bullmq');
const axios = require('axios');
const Redis = require('ioredis');
const tileCacheService = require('./tileCache.service');

// Use existing Redis connection strings or fallback to local
const connection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    family: 4, 
    tls: { rejectUnauthorized: false } 
});

class TileQueueService {
    constructor() {
        this.queueName = 'tile-fetch-queue';
        
        // Ensure static maps key exists
        this.apiKey = process.env.GOOGLE_MAPS_API_KEY;

        try {
            // Create the Job Queue
            this.tileQueue = new Queue(this.queueName, { connection });
            
            // Queue Events to track completion
            this.queueEvents = new QueueEvents(this.queueName, { connection });
    
            // Worker that executes the fetch job
            // Concurrency set to 20 to respect the 50QPS/30,000QPM API limit safely
            this.worker = new Worker(this.queueName, async (job) => {
                return this.processFetchJob(job.data);
            }, { 
                connection,
                concurrency: 20,
                limiter: {
                    max: 50,
                    duration: 1000 // Max 50 requests per 1000ms
                }
            });

            this.worker.on('failed', (job, err) => {
                console.error(`Job ${job.id} failed: ${err.message}`);
            });
            
            console.log('✅ BullMQ TileQueueService initialized successfully.');

        } catch (error) {
            console.warn('⚠️ BullMQ could not initialize with Redis.', error);
            this.tileQueue = null;
        }
    }

    /**
     * Enqueue a batch of tiles to be fetched
     * @param {Array<{tileId: string, center: {lat: number, lng: number}, zoom: number}>} pendingTiles 
     * @param {string} sessionId
     */
    async enqueueTiles(pendingTiles, sessionId) {
        if (!this.tileQueue) {
            console.error('Tile queue not initialized!');
            return [];
        }

        const jobs = pendingTiles.map(tile => ({
            name: 'fetch-tile',
            data: { ...tile, sessionId },
            opts: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 1000 },
                removeOnComplete: true,
                removeOnFail: false
            }
        }));

        console.log(`📡 Adding ${jobs.length} tiles to BullMQ queue...`);
        await this.tileQueue.addBulk(jobs);
        return { success: true, count: jobs.length };
    }

    /**
     * Executes the actual HTTP GET to Google Static Maps API
     * Returns the array buffer and stores it in cache
     */
    async processFetchJob(jobData) {
        const { tileId, center, zoom, sessionId } = jobData;

        if (!this.apiKey) {
            throw new Error('Missing GOOGLE_MAPS_API_KEY');
        }

        const url = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${zoom}&size=640x640&scale=2&maptype=satellite&key=${this.apiKey}`;

        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer', // CRITICAL: Fetch binary data
                timeout: 15000
            });

            const imageBuffer = Buffer.from(response.data, 'binary');

            // Store in our CacheService
            await tileCacheService.storeTile(tileId, imageBuffer);

            // Optional: Notify Socket.io that this tile is ready 
            if (global.io && sessionId) {
                global.io.to(`stream_${sessionId}`).emit('tile_ready', { tileId, sessionId });
            }

            return { success: true, tileId };
        } catch (error) {
            const errorBody = error.response?.data ? error.response.data.toString() : error.message;
            console.error(`Failed fetching tile ${tileId}: status ${error.response?.status} - ${errorBody}`);
            throw error; // Let backoff handle 
        }
    }
}

module.exports = new TileQueueService();
