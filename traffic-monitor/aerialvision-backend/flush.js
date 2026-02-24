// flush.js
const Redis = require('ioredis');

// Paste your actual REDIS_URL here inside the quotes just for this quick script
const REDIS_URL = "redis://default:rlbbUCPJXm5aiHwLA6Rs7HjW467tYlez@redis-12371.c238.us-central1-2.gce.cloud.redislabs.com:12371"; 

const redis = new Redis(REDIS_URL);

async function clearMemory() {
    console.log('🧹 Sweeping out Redis memory...');
    
    // flushall() deletes absolutely everything (cached images + old BullMQ jobs)
    await redis.flushall(); 
    
    console.log('✅ Redis is completely empty! You have your full 30MB back.');
    process.exit(0);
}

clearMemory();