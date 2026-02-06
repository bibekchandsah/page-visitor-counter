import initSqlJs from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/database.sqlite');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database wrapper for sql.js
let SQL;
let database;

// Wrapper to provide synchronous-like API
class DBWrapper {
  constructor(sqlDb) {
    this.sqlDb = sqlDb;
  }
  
  prepare(sql) {
    return {
      run: (...params) => {
        this.sqlDb.run(sql, params);
        return { lastInsertRowid: this.sqlDb.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] || 0 };
      },
      get: (...params) => {
        const stmt = this.sqlDb.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all: (...params) => {
        const results = [];
        const stmt = this.sqlDb.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    };
  }
  
  exec(sql) {
    this.sqlDb.run(sql);
  }
  
  pragma(sql) {
    try {
      this.sqlDb.run(`PRAGMA ${sql}`);
    } catch (e) {
      // Ignore pragma errors
    }
  }
  
  save() {
    const data = this.sqlDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export let db;

export async function initDatabase() {
  // Initialize SQL.js
  SQL = await initSqlJs();
  
  // Load existing database or create new one
  try {
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      database = new SQL.Database(fileBuffer);
    } else {
      database = new SQL.Database();
    }
  } catch (e) {
    database = new SQL.Database();
  }
  
  db = new DBWrapper(database);
  
  // Create Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      github_id INTEGER UNIQUE NOT NULL,
      username TEXT NOT NULL,
      avatar_url TEXT,
      access_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create Counters table
  db.exec(`
    CREATE TABLE IF NOT EXISTS counters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      repo TEXT,
      page_id TEXT,
      total_views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(username, repo, page_id)
    )
  `);
  
  // Create DailyViews table for analytics
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      counter_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      views INTEGER DEFAULT 0,
      UNIQUE(counter_id, date),
      FOREIGN KEY (counter_id) REFERENCES counters(id)
    )
  `);
  
  // Create BadgeConfigs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS badge_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT,
      style TEXT DEFAULT 'flat',
      bg_color TEXT DEFAULT '4c1',
      text_color TEXT DEFAULT 'fff',
      icon TEXT DEFAULT 'eye',
      label TEXT DEFAULT 'Profile Views',
      font TEXT DEFAULT 'Verdana',
      border INTEGER DEFAULT 0,
      border_color TEXT DEFAULT '333',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  // Create ViewLogs table (for cooldown tracking without storing raw IPs)
  db.exec(`
    CREATE TABLE IF NOT EXISTS view_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      counter_id INTEGER NOT NULL,
      visitor_hash TEXT NOT NULL,
      viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (counter_id) REFERENCES counters(id)
    )
  `);
  
  // Create indexes
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_counters_username ON counters(username)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_counters_repo ON counters(username, repo)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_daily_views_counter ON daily_views(counter_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_view_logs_hash ON view_logs(visitor_hash, counter_id)`);
  } catch (e) {
    // Ignore index creation errors
  }
  
  // Save database
  db.save();
  
  console.log('Database initialized successfully');
}

// Save database periodically
export function saveDatabase() {
  if (db) {
    db.save();
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initDatabase().then(() => {
    console.log('Database setup complete');
    process.exit(0);
  });
}
