// flush.js
const Redis = require('ioredis');

const REDIS_URL = "redis://default:gQAAAAAAAZvwAAIgcDE0MTA3NzAwOTU5N2I0OGVkOGE1Yzc4OGFlMmE0MTI5NQ@rich-boxer-105456.upstash.io:6379"; 

const redis = new Redis(REDIS_URL);

async function clearMemory() {
    console.log('🧹 Sweeping out Redis memory...');
    await redis.flushall(); 
    console.log('✅ Redis is completely empty! You have your full 30MB back.');
    process.exit(0);
}

clearMemory();
