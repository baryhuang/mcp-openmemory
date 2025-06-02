import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { Logger } from './logger.js';

export class DatabaseService {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.logger = new Logger('DatabaseService');
    this.sequenceCounters = new Map();
    this.db = null;
    this.SQL = null;
  }

  async initialize() {
    try {
      // Initialize sql.js
      this.SQL = await initSqlJs();
      
      // Load existing database or create new one
      let dbData = null;
      if (existsSync(this.dbPath)) {
        dbData = readFileSync(this.dbPath);
      }
      
      this.db = new this.SQL.Database(dbData);
      
      // Enable WAL mode is not available in sql.js, but we can set other pragmas
      // this.db.exec('PRAGMA journal_mode = WAL'); // Not supported in sql.js
      
      await this.createTables();
      this.logger.info(`Database initialized at ${this.dbPath}`);
    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async createTables() {
    // Main memory table - simplified for single-user MCP server
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        speaker TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        sequence INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(timestamp, sequence)
      )
    `);

    // Memory abstracts table - for long-term memory summaries
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_abstracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        abstract_content TEXT NOT NULL,
        last_processed_timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);
    `);

    this.logger.info('Database tables created successfully');
    this.saveToFile();
  }

  saveToFile() {
    try {
      const data = this.db.export();
      writeFileSync(this.dbPath, data);
    } catch (error) {
      this.logger.error('Error saving database to file:', error);
    }
  }

  cleanMessageText(message) {
    if (!message) return '';
    
    // Remove XML-like tags (like <speak></speak>)
    let cleaned = message.replace(/<[^>]+>/g, '');
    
    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  getSequenceNumber(timestamp) {
    const currentTime = Date.now();
    const timestampKey = timestamp.toString();
    
    // Clean up old counters (older than 10 seconds)
    for (const [key, value] of this.sequenceCounters.entries()) {
      if (currentTime - value.lastUpdate > 10000) {
        this.sequenceCounters.delete(key);
      }
    }
    
    // Get or create counter for this timestamp
    const counter = this.sequenceCounters.get(timestampKey);
    if (!counter) {
      this.sequenceCounters.set(timestampKey, { count: 0, lastUpdate: currentTime });
      return 0;
    }
    
    // Increment counter
    const newCount = (counter.count + 1) % 1000; // Limit to 0-999
    this.sequenceCounters.set(timestampKey, { count: newCount, lastUpdate: currentTime });
    return newCount;
  }

  async saveMemory(memory) {
    try {
      const cleanedMessage = this.cleanMessageText(memory.message);
      
      // Skip if message is empty or too short after cleaning
      if (!cleanedMessage || cleanedMessage.length <= 2) {
        this.logger.info(`Skipping empty or too short message after cleaning: '${cleanedMessage}'`);
        return { status: 'skipped', message: 'Message too short after cleaning' };
      }

      const sequence = this.getSequenceNumber(memory.timestamp);

      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO memories 
        (speaker, message, timestamp, sequence)
        VALUES (?, ?, ?, ?)
      `);

      const result = stmt.run([
        memory.speaker,
        cleanedMessage,
        memory.timestamp,
        sequence
      ]);

      stmt.free();

      if (result.changes > 0) {
        this.logger.info(`Saved memory for ${memory.speaker}`);
        this.saveToFile();
        return { status: 'success', message: 'Memory saved successfully' };
      } else {
        this.logger.info(`Memory already exists for timestamp ${memory.timestamp} with sequence ${sequence}`);
        return { status: 'duplicate', message: 'Memory already exists' };
      }

    } catch (error) {
      this.logger.error('Error saving memory:', error);
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  async getLatestMemoryAbstract() {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM memory_abstracts 
        ORDER BY updated_at DESC 
        LIMIT 1
      `);
      
      const result = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      
      return result;
    } catch (error) {
      this.logger.error('Error getting latest memory abstract:', error);
      return null;
    }
  }

  async saveMemoryAbstract(abstractContent, lastProcessedTimestamp) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO memory_abstracts 
        (abstract_content, last_processed_timestamp, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run([abstractContent, lastProcessedTimestamp]);
      stmt.free();
      
      this.logger.info(`Saved memory abstract`);
      this.saveToFile();
      return { status: 'success', message: 'Memory abstract saved successfully' };
    } catch (error) {
      this.logger.error('Error saving memory abstract:', error);
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  async getMessagesAfterTimestamp(afterTimestamp, maxDays = 14) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE timestamp > ?
        ORDER BY timestamp ASC, sequence ASC
        LIMIT 1000
      `);
      
      const results = [];
      stmt.bind([afterTimestamp]);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      
      return results;
    } catch (error) {
      this.logger.error('Error getting messages after timestamp:', error);
      return [];
    }
  }

  async getMemoriesByDateRange(maxDays = 14) {
    try {
      const cutoffTimestamp = Math.floor(Date.now() / 1000) - (maxDays * 24 * 60 * 60);
      
      const stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE timestamp >= ?
        ORDER BY timestamp ASC, sequence ASC
        LIMIT 1000
      `);
      
      const results = [];
      stmt.bind([cutoffTimestamp]);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      
      return results;
    } catch (error) {
      this.logger.error('Error getting memories by date range:', error);
      return [];
    }
  }

  async getMemoryStats() {
    try {
      const totalMemoriesStmt = this.db.prepare('SELECT COUNT(*) as count FROM memories');
      totalMemoriesStmt.step();
      const totalMemories = totalMemoriesStmt.getAsObject().count;
      totalMemoriesStmt.free();

      const uniqueSpeakersStmt = this.db.prepare('SELECT COUNT(DISTINCT speaker) as count FROM memories');
      uniqueSpeakersStmt.step();
      const uniqueSpeakers = uniqueSpeakersStmt.getAsObject().count;
      uniqueSpeakersStmt.free();

      const abstractsStmt = this.db.prepare('SELECT COUNT(*) as count FROM memory_abstracts');
      abstractsStmt.step();
      const abstracts = abstractsStmt.getAsObject().count;
      abstractsStmt.free();
      
      return {
        totalMemories,
        uniqueSpeakers,
        abstracts
      };
    } catch (error) {
      this.logger.error('Error getting memory stats:', error);
      return {
        totalMemories: 0,
        uniqueSpeakers: 0,
        abstracts: 0
      };
    }
  }

  async getSchema() {
    try {
      const stmt = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
      const tables = [];
      while (stmt.step()) {
        tables.push(stmt.getAsObject());
      }
      stmt.free();

      const schema = {};
      
      for (const table of tables) {
        const columnStmt = this.db.prepare(`PRAGMA table_info(${table.name})`);
        const columns = [];
        while (columnStmt.step()) {
          columns.push(columnStmt.getAsObject());
        }
        columnStmt.free();
        schema[table.name] = columns;
      }
      
      return schema;
    } catch (error) {
      this.logger.error('Error getting schema:', error);
      return {};
    }
  }

  async close() {
    if (this.db) {
      this.saveToFile();
      this.db.close();
      this.logger.info('Database connection closed');
    }
  }
} 