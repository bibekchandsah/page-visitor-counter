import crypto from 'crypto';
import { getCounters, getDailyViews, getViewLogs } from '../db/mongodb.js';
import { redis, incrementViewCount, getViewCount, setViewCount, checkCooldown } from './redis.js';

// Known bot user agents to filter
const BOT_PATTERNS = [
  /bot/i, /spider/i, /crawler/i, /scraper/i,
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i,
  /baiduspider/i, /yandexbot/i, /facebookexternalhit/i,
  /twitterbot/i, /linkedinbot/i, /pinterest/i,
  /whatsapp/i, /telegram/i, /discordbot/i,
  /uptimerobot/i, /pingdom/i, /newrelicpinger/i
];

// Hash IP address for privacy
export function hashVisitor(ip, userAgent = '') {
  const data = `${ip}:${userAgent}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

// Check if request is from a bot
export function isBot(userAgent) {
  if (!userAgent) return false;
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}

// Get or create counter
export async function getOrCreateCounter(username, repo = null, pageId = null) {
  const counters = getCounters();
  
  // Check if counter exists
  let counter = await counters.findOne({ 
    username, 
    repo: repo || null, 
    page_id: pageId || null 
  });
  
  if (!counter) {
    // Create new counter
    const result = await counters.insertOne({
      username,
      repo: repo || null,
      page_id: pageId || null,
      total_views: 0,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    counter = await counters.findOne({ _id: result.insertedId });
  }
  
  return counter;
}

// Main view tracking function
export async function trackView(options = {}) {
  const {
    username,
    repo = null,
    pageId = null,
    ip = '',
    userAgent = '',
    cooldown = 300, // 5 minutes default
    filterBots = true
  } = options;
  
  const counters = getCounters();
  const dailyViews = getDailyViews();
  const viewLogs = getViewLogs();
  
  // Filter bots
  if (filterBots && isBot(userAgent)) {
    // Return current count without incrementing
    const counter = await getOrCreateCounter(username, repo, pageId);
    const redisCount = await getViewCount(`${username}:${repo || 'profile'}:${pageId || 'main'}`);
    return {
      count: redisCount || counter.total_views,
      incremented: false,
      isBot: true
    };
  }
  
  // Get counter
  const counter = await getOrCreateCounter(username, repo, pageId);
  const counterKey = `${username}:${repo || 'profile'}:${pageId || 'main'}`;
  
  // Hash visitor for privacy
  const visitorHash = hashVisitor(ip, userAgent);
  const cooldownKey = `${visitorHash}:${counter._id.toString()}`;
  
  // Check cooldown
  const inCooldown = await checkCooldown(cooldownKey, cooldown);
  
  if (inCooldown) {
    // Return current count without incrementing
    const currentCount = await getViewCount(counterKey);
    return {
      count: currentCount || counter.total_views,
      incremented: false,
      cooldown: true
    };
  }
  
  // Increment view count
  const newCount = await incrementViewCount(counterKey);
  
  // Update MongoDB in background (for persistence)
  try {
    await counters.updateOne(
      { _id: counter._id },
      { 
        $set: { total_views: newCount, updated_at: new Date() }
      }
    );
    
    // Update daily views
    const today = new Date().toISOString().split('T')[0];
    await dailyViews.updateOne(
      { counter_id: counter._id, date: today },
      { 
        $inc: { views: 1 },
        $setOnInsert: { counter_id: counter._id, date: today }
      },
      { upsert: true }
    );
    
    // Log view (for analytics, without storing raw IP)
    await viewLogs.insertOne({
      counter_id: counter._id,
      visitor_hash: visitorHash,
      viewed_at: new Date()
    });
    
  } catch (err) {
    console.error('Error updating database:', err);
  }
  
  return {
    count: newCount,
    incremented: true
  };
}

// Get view statistics
export async function getStats(username, repo = null) {
  const counters = getCounters();
  const dailyViews = getDailyViews();
  
  const counter = await counters.findOne({ 
    username, 
    repo: repo || null 
  });
  
  if (!counter) {
    return {
      total: 0,
      today: 0,
      weekly: [0, 0, 0, 0, 0, 0, 0]
    };
  }
  
  // Get today's views
  const today = new Date().toISOString().split('T')[0];
  const todayDoc = await dailyViews.findOne({ 
    counter_id: counter._id, 
    date: today 
  });
  
  // Get last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklyDocs = await dailyViews.find({ 
    counter_id: counter._id,
    date: { $gte: sevenDaysAgo.toISOString().split('T')[0] }
  }).sort({ date: -1 }).limit(7).toArray();
  
  // Build weekly array
  const weekly = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayData = weeklyDocs.find(d => d.date === dateStr);
    weekly.push(dayData ? dayData.views : 0);
  }
  
  return {
    total: counter.total_views,
    today: todayDoc?.views || 0,
    weekly
  };
}

// Reset counter
export async function resetCounter(username, repo = null) {
  const counters = getCounters();
  const dailyViews = getDailyViews();
  const viewLogs = getViewLogs();
  
  const counterKey = `${username}:${repo || 'profile'}:main`;
  
  // Reset Redis
  await setViewCount(counterKey, 0);
  
  // Find counter
  const counter = await counters.findOne({ 
    username, 
    repo: repo || null 
  });
  
  if (counter) {
    // Reset MongoDB counter
    await counters.updateOne(
      { _id: counter._id },
      { $set: { total_views: 0, updated_at: new Date() } }
    );
    
    // Clear daily views
    await dailyViews.deleteMany({ counter_id: counter._id });
    
    // Clear view logs
    await viewLogs.deleteMany({ counter_id: counter._id });
  }
  
  return true;
}

// Set initial count (for users to resume from a specific number)
export async function setInitialCount(username, repo = null, count = 0) {
  const counters = getCounters();
  const counterKey = `${username}:${repo || 'profile'}:main`;
  const initialCount = Math.max(0, parseInt(count, 10) || 0);
  
  // Get or create counter
  const counter = await getOrCreateCounter(username, repo, null);
  
  // Set Redis count
  await setViewCount(counterKey, initialCount);
  
  // Update MongoDB
  await counters.updateOne(
    { _id: counter._id },
    { $set: { total_views: initialCount, updated_at: new Date() } }
  );
  
  return initialCount;
}

// Sync Redis count to MongoDB (for persistence)
export async function syncToDatabase(username, repo = null) {
  const counters = getCounters();
  const counterKey = `${username}:${repo || 'profile'}:main`;
  const count = await getViewCount(counterKey);
  
  await counters.updateOne(
    { username, repo: repo || null },
    { $set: { total_views: count, updated_at: new Date() } }
  );
  
  return count;
}
