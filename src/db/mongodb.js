import { MongoClient } from 'mongodb';

const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB || 'pageviews';

let client;
let db;

// Collections
let users;
let counters;
let dailyViews;
let badgeConfigs;
let viewLogs;

export async function connectDatabase() {
  try {
    client = new MongoClient(mongoUrl);
    await client.connect();
    
    db = client.db(dbName);
    
    // Initialize collections
    users = db.collection('users');
    counters = db.collection('counters');
    dailyViews = db.collection('daily_views');
    badgeConfigs = db.collection('badge_configs');
    viewLogs = db.collection('view_logs');
    
    // Create indexes for better performance
    await users.createIndex({ github_id: 1 }, { unique: true });
    await counters.createIndex({ username: 1, repo: 1, page_id: 1 }, { unique: true });
    await dailyViews.createIndex({ counter_id: 1, date: 1 }, { unique: true });
    await viewLogs.createIndex({ counter_id: 1, visitor_hash: 1 });
    await badgeConfigs.createIndex({ user_id: 1 });
    
    console.log('MongoDB connected successfully');
    return db;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}

export async function closeDatabase() {
  if (client) {
    await client.close();
  }
}

// Get collections
export function getDb() {
  return db;
}

export function getUsers() {
  return users;
}

export function getCounters() {
  return counters;
}

export function getDailyViews() {
  return dailyViews;
}

export function getBadgeConfigs() {
  return badgeConfigs;
}

export function getViewLogs() {
  return viewLogs;
}
