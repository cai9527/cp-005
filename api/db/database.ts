import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_DIR = path.resolve(__dirname, '../../data')
const DB_PATH = path.join(DB_DIR, 'tower_crane.db')

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true })
    }
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initializeDatabase(db)
    seedInitialData(db)
  }
  return db
}

function initializeDatabase(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS cranes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      model TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'offline',
      location_x REAL NOT NULL,
      location_y REAL NOT NULL,
      max_load REAL NOT NULL,
      max_moment REAL NOT NULL,
      max_radius REAL NOT NULL,
      max_height REAL NOT NULL,
      install_date TEXT NOT NULL,
      last_maintenance TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sensors (
      id TEXT PRIMARY KEY,
      crane_id TEXT NOT NULL REFERENCES cranes(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      unit TEXT NOT NULL,
      min_value REAL NOT NULL,
      max_value REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'normal'
    );

    CREATE TABLE IF NOT EXISTS sensor_data (
      id TEXT PRIMARY KEY,
      crane_id TEXT NOT NULL REFERENCES cranes(id) ON DELETE CASCADE,
      sensor_type TEXT NOT NULL,
      value REAL NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sensor_data_crane_time ON sensor_data(crane_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_sensor_data_type ON sensor_data(sensor_type);

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      crane_id TEXT NOT NULL REFERENCES cranes(id) ON DELETE CASCADE,
      rule_id TEXT REFERENCES alert_rules(id),
      sensor_type TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      value REAL NOT NULL,
      threshold REAL NOT NULL,
      timestamp TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      resolved_by TEXT,
      resolved_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
    CREATE INDEX IF NOT EXISTS idx_alerts_crane ON alerts(crane_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);

    CREATE TABLE IF NOT EXISTS alert_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      crane_id TEXT NOT NULL,
      sensor_type TEXT NOT NULL,
      condition TEXT NOT NULL,
      threshold REAL NOT NULL,
      level TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      salt TEXT NOT NULL,
      display_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'active',
      login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT,
      last_login_ip TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

    CREATE TABLE IF NOT EXISTS login_audit (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      ip TEXT,
      success INTEGER NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_login_audit_username ON login_audit(username);
    CREATE INDEX IF NOT EXISTS idx_login_audit_timestamp ON login_audit(timestamp);

    CREATE TABLE IF NOT EXISTS operation_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      detail TEXT,
      ip TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_operation_logs_user ON operation_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action);
    CREATE INDEX IF NOT EXISTS idx_operation_logs_timestamp ON operation_logs(timestamp);
  `)
}

function seedInitialData(database: Database.Database): void {
  seedCraneData(database)
  seedUserData(database)
}

function seedCraneData(database: Database.Database): void {
  const craneCount = database.prepare('SELECT COUNT(*) as count FROM cranes').get() as { count: number }
  if (craneCount.count > 0) return

  const insertCrane = database.prepare(`
    INSERT INTO cranes (id, name, model, status, location_x, location_y, max_load, max_moment, max_radius, max_height, install_date, last_maintenance)
    VALUES (@id, @name, @model, @status, @location_x, @location_y, @max_load, @max_moment, @max_radius, @max_height, @install_date, @last_maintenance)
  `)

  const insertSensor = database.prepare(`
    INSERT INTO sensors (id, crane_id, type, unit, min_value, max_value, status)
    VALUES (@id, @crane_id, @type, @unit, @min_value, @max_value, @status)
  `)

  const insertRule = database.prepare(`
    INSERT INTO alert_rules (id, name, crane_id, sensor_type, condition, threshold, level, enabled)
    VALUES (@id, @name, @crane_id, @sensor_type, @condition, @threshold, @level, @enabled)
  `)

  const cranes = [
    {
      id: uuidv4(),
      name: 'TC-001 1号塔机',
      model: 'QTZ80',
      status: 'online' as const,
      location_x: 30,
      location_y: 25,
      max_load: 8,
      max_moment: 80,
      max_radius: 55,
      max_height: 120,
      install_date: '2025-03-15',
      last_maintenance: '2026-05-20',
    },
    {
      id: uuidv4(),
      name: 'TC-002 2号塔机',
      model: 'QTZ125',
      status: 'online' as const,
      location_x: 65,
      location_y: 40,
      max_load: 12,
      max_moment: 125,
      max_radius: 60,
      max_height: 150,
      install_date: '2025-04-10',
      last_maintenance: '2026-05-15',
    },
    {
      id: uuidv4(),
      name: 'TC-003 3号塔机',
      model: 'QTZ63',
      status: 'online' as const,
      location_x: 45,
      location_y: 70,
      max_load: 6,
      max_moment: 63,
      max_radius: 50,
      max_height: 100,
      install_date: '2025-05-20',
      last_maintenance: '2026-06-01',
    },
    {
      id: uuidv4(),
      name: 'TC-004 4号塔机',
      model: 'QTZ160',
      status: 'offline' as const,
      location_x: 75,
      location_y: 75,
      max_load: 16,
      max_moment: 160,
      max_radius: 65,
      max_height: 180,
      install_date: '2025-06-01',
      last_maintenance: '2026-04-10',
    },
  ]

  const sensorTypes = [
    { type: 'load', unit: 't', min: 0, maxField: 'max_load' },
    { type: 'moment', unit: 't·m', min: 0, maxField: 'max_moment' },
    { type: 'radius', unit: 'm', min: 2, maxField: 'max_radius' },
    { type: 'height', unit: 'm', min: 0, maxField: 'max_height' },
    { type: 'rotation', unit: '°', min: 0, max: 360 },
    { type: 'wind', unit: 'm/s', min: 0, max: 40 },
  ]

  const ruleTemplates = [
    { name: '起重量警告', sensor_type: 'load', condition: 'gte' as const, level: 'warning' as const, multiplier: 0.85 },
    { name: '起重量临界', sensor_type: 'load', condition: 'gte' as const, level: 'critical' as const, multiplier: 0.95 },
    { name: '力矩警告', sensor_type: 'moment', condition: 'gte' as const, level: 'warning' as const, multiplier: 0.80 },
    { name: '力矩临界', sensor_type: 'moment', condition: 'gte' as const, level: 'critical' as const, multiplier: 0.95 },
    { name: '风速警告', sensor_type: 'wind', condition: 'gte' as const, level: 'warning' as const, fixed: 12 },
    { name: '风速临界', sensor_type: 'wind', condition: 'gte' as const, level: 'critical' as const, fixed: 20 },
  ]

  const tx = database.transaction(() => {
    for (const crane of cranes) {
      insertCrane.run(crane)

      for (const st of sensorTypes) {
        const maxVal = 'max' in st ? (st as { max: number }).max : (crane as Record<string, number>)[st.maxField]
        insertSensor.run({
          id: uuidv4(),
          crane_id: crane.id,
          type: st.type,
          unit: st.unit,
          min_value: st.min,
          max_value: maxVal,
          status: 'normal',
        })
      }

      for (const rt of ruleTemplates) {
        const sensor = sensorTypes.find((s) => s.type === rt.sensor_type)!
        let threshold: number
        if (rt.fixed !== undefined) {
          threshold = rt.fixed
        } else {
          const maxVal = 'max' in sensor ? (sensor as { max: number }).max : (crane as Record<string, number>)[sensor.maxField]
          threshold = Number((maxVal * rt.multiplier).toFixed(2))
        }
        insertRule.run({
          id: uuidv4(),
          name: `${crane.name.split(' ')[0]} ${rt.name}`,
          crane_id: 'all',
          sensor_type: rt.sensor_type,
          condition: rt.condition,
          threshold,
          level: rt.level,
          enabled: 1,
        })
      }
    }
  })

  tx()
}

function seedUserData(database: Database.Database): void {
  const userCount = database.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
  if (userCount.count === 0) {
    const insertUser = database.prepare(`
      INSERT INTO users (id, username, password, salt, display_name, email, phone, role, status, created_at, updated_at)
      VALUES (@id, @username, @password, @salt, @display_name, @email, @phone, @role, @status, @created_at, @updated_at)
    `)
    const now = new Date().toISOString()
    const adminSalt = crypto.randomBytes(16).toString('hex')
    const adminHash = crypto.pbkdf2Sync('admin123', adminSalt, 10000, 64, 'sha512').toString('hex')
    const userSalt = crypto.randomBytes(16).toString('hex')
    const userHash = crypto.pbkdf2Sync('user123', userSalt, 10000, 64, 'sha512').toString('hex')

    insertUser.run({
      id: uuidv4(),
      username: 'admin',
      password: adminHash,
      salt: adminSalt,
      display_name: '系统管理员',
      email: 'admin@example.com',
      phone: '13800000001',
      role: 'admin',
      status: 'active',
      created_at: now,
      updated_at: now,
    })
    insertUser.run({
      id: uuidv4(),
      username: 'user',
      password: userHash,
      salt: userSalt,
      display_name: '普通用户',
      email: 'user@example.com',
      phone: '13800000002',
      role: 'user',
      status: 'active',
      created_at: now,
      updated_at: now,
    })
  }
}

export default getDatabase
