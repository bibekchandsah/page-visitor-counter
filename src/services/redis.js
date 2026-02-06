import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis client with fallback to memory store
class MemoryStore {
  constructor() {
    this.store = new Map();
    this.expiry = new Map();
  }
  
  async get(key) {
    const exp = this.expiry.get(key);
    if (exp && Date.now() > exp) {
      this.store.delete(key);
      this.expiry.delete(key);
      return null;
    }
    return this.store.get(key) || null;
  }
  
  async set(key, value, ...args) {
    this.store.set(key, value);
    if (args[0] === 'EX' && args[1]) {
      this.expiry.set(key, Date.now() + args[1] * 1000);
    }
    return 'OK';
  }
  
  async incr(key) {
    const val = parseInt(await this.get(key) || '0', 10) + 1;
    this.store.set(key, String(val));
    return val;
  }
  
  async incrby(key, amount) {
    const val = parseInt(await this.get(key) || '0', 10) + amount;
    this.store.set(key, String(val));
    return val;
  }
  
  async exists(key) {
    return this.store.has(key) ? 1 : 0;
  }
  
  async del(key) {
    this.store.delete(key);
    this.expiry.delete(key);
    return 1;
  }
  
  async quit() {
    return 'OK';
  }
}

let redis;
let useMemoryStore = false;

try {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true
  });
  
  redis.on('error', (err) => {
    console.warn('Redis connection error, falling back to memory store:', err.message);
    useMemoryStore = true;
    redis = new MemoryStore();
  });
  
  // Try to connect
  await redis.connect().catch(() => {
    console.warn('Could not connect to Redis, using in-memory store');
    useMemoryStore = true;
    redis = new MemoryStore();
  });
  
} catch (err) {
  console.warn('Redis not available, using in-memory store');
  useMemoryStore = true;
  redis = new MemoryStore();
}

export { redis, useMemoryStore };

// Helper functions for view counting
export async function incrementViewCount(key, initialValue = 0) {
  const fullKey = `views:${key}`;
  // Check if key exists, if not initialize with initialValue
  const exists = await redis.exists(fullKey);
  if (!exists && initialValue > 0) {
    await redis.set(fullKey, String(initialValue));
  }
  return await redis.incr(fullKey);
}

export async function getViewCount(key) {
  const count = await redis.get(`views:${key}`);
  return parseInt(count || '0', 10);
}

export async function hasViewCount(key) {
  return await redis.exists(`views:${key}`) > 0;
}

export async function setViewCount(key, count) {
  return await redis.set(`views:${key}`, String(count));
}

export async function checkCooldown(key, cooldownSeconds = 300) {
  const cooldownKey = `cooldown:${key}`;
  const exists = await redis.exists(cooldownKey);
  
  if (exists) {
    return true; // Still in cooldown
  }
  
  // Set cooldown
  await redis.set(cooldownKey, '1', 'EX', cooldownSeconds);
  return false;
}
