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
      last_maintenance TEXT NOT NULL,
      manufacturer TEXT,
      serial_number TEXT,
      production_date TEXT,
      project_name TEXT,
      construction_unit TEXT,
      registration_number TEXT,
      min_radius REAL DEFAULT 2,
      tip_load REAL,
      hoist_speed REAL,
      slewing_speed REAL,
      trolley_speed REAL,
      motor_power REAL,
      total_weight REAL,
      jib_weight REAL,
      counterweight REAL,
      free_standing_height REAL,
      max_anchored_height REAL,
      working_temp_min REAL DEFAULT -20,
      working_temp_max REAL DEFAULT 40,
      max_wind_operational REAL DEFAULT 12,
      max_wind_nonoperational REAL DEFAULT 30,
      power_supply TEXT DEFAULT '380V/50Hz'
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

  migrateCranesTable(database)
}

function migrateCranesTable(database: Database.Database): void {
  const columns = database.prepare("PRAGMA table_info(cranes)").all() as { name: string }[]
  const colNames = new Set(columns.map(c => c.name))

  const newColumns: { name: string; definition: string }[] = [
    { name: 'manufacturer', definition: 'TEXT' },
    { name: 'serial_number', definition: 'TEXT' },
    { name: 'production_date', definition: 'TEXT' },
    { name: 'project_name', definition: 'TEXT' },
    { name: 'construction_unit', definition: 'TEXT' },
    { name: 'registration_number', definition: 'TEXT' },
    { name: 'min_radius', definition: 'REAL DEFAULT 2' },
    { name: 'tip_load', definition: 'REAL' },
    { name: 'hoist_speed', definition: 'REAL' },
    { name: 'slewing_speed', definition: 'REAL' },
    { name: 'trolley_speed', definition: 'REAL' },
    { name: 'motor_power', definition: 'REAL' },
    { name: 'total_weight', definition: 'REAL' },
    { name: 'jib_weight', definition: 'REAL' },
    { name: 'counterweight', definition: 'REAL' },
    { name: 'free_standing_height', definition: 'REAL' },
    { name: 'max_anchored_height', definition: 'REAL' },
    { name: 'working_temp_min', definition: 'REAL DEFAULT -20' },
    { name: 'working_temp_max', definition: 'REAL DEFAULT 40' },
    { name: 'max_wind_operational', definition: 'REAL DEFAULT 12' },
    { name: 'max_wind_nonoperational', definition: 'REAL DEFAULT 30' },
    { name: 'power_supply', definition: "TEXT DEFAULT '380V/50Hz'" },
  ]

  for (const col of newColumns) {
    if (!colNames.has(col.name)) {
      database.prepare(`ALTER TABLE cranes ADD COLUMN ${col.name} ${col.definition}`).run()
    }
  }
}

function seedInitialData(database: Database.Database): void {
  seedCraneData(database)
  seedUserData(database)
}

function seedCraneData(database: Database.Database): void {
  const craneCount = database.prepare('SELECT COUNT(*) as count FROM cranes').get() as { count: number }
  if (craneCount.count > 0) return

  const insertCrane = database.prepare(`
    INSERT INTO cranes (id, name, model, status, location_x, location_y, max_load, max_moment, max_radius, max_height, install_date, last_maintenance,
      manufacturer, serial_number, production_date, project_name, construction_unit, registration_number,
      min_radius, tip_load, hoist_speed, slewing_speed, trolley_speed, motor_power, total_weight, jib_weight, counterweight,
      free_standing_height, max_anchored_height, working_temp_min, working_temp_max, max_wind_operational, max_wind_nonoperational, power_supply)
    VALUES (@id, @name, @model, @status, @location_x, @location_y, @max_load, @max_moment, @max_radius, @max_height, @install_date, @last_maintenance,
      @manufacturer, @serial_number, @production_date, @project_name, @construction_unit, @registration_number,
      @min_radius, @tip_load, @hoist_speed, @slewing_speed, @trolley_speed, @motor_power, @total_weight, @jib_weight, @counterweight,
      @free_standing_height, @max_anchored_height, @working_temp_min, @working_temp_max, @max_wind_operational, @max_wind_nonoperational, @power_supply)
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
      manufacturer: '中联重科',
      serial_number: 'ZL2024QTZ80-0156',
      production_date: '2024-11-20',
      project_name: '滨江新城A区项目',
      construction_unit: '中建三局集团有限公司',
      registration_number: '粤AQ-T2025-0031',
      min_radius: 2.5,
      tip_load: 1.3,
      hoist_speed: 70,
      slewing_speed: 0.6,
      trolley_speed: 35,
      motor_power: 37,
      total_weight: 45,
      jib_weight: 6.8,
      counterweight: 14.5,
      free_standing_height: 45,
      max_anchored_height: 180,
      working_temp_min: -20,
      working_temp_max: 40,
      max_wind_operational: 12,
      max_wind_nonoperational: 30,
      power_supply: '380V/50Hz',
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
      manufacturer: '徐工集团',
      serial_number: 'XG2024QTZ125-0089',
      production_date: '2024-10-15',
      project_name: '滨江新城A区项目',
      construction_unit: '中建三局集团有限公司',
      registration_number: '粤AQ-T2025-0032',
      min_radius: 3,
      tip_load: 2.1,
      hoist_speed: 80,
      slewing_speed: 0.55,
      trolley_speed: 40,
      motor_power: 55,
      total_weight: 68,
      jib_weight: 9.2,
      counterweight: 21,
      free_standing_height: 52,
      max_anchored_height: 220,
      working_temp_min: -20,
      working_temp_max: 40,
      max_wind_operational: 12,
      max_wind_nonoperational: 30,
      power_supply: '380V/50Hz',
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
      manufacturer: '三一重工',
      serial_number: 'SY2025QTZ63-0023',
      production_date: '2025-01-10',
      project_name: '滨江新城B区项目',
      construction_unit: '中建八局第一建设有限公司',
      registration_number: '粤AQ-T2025-0045',
      min_radius: 2.5,
      tip_load: 1.0,
      hoist_speed: 60,
      slewing_speed: 0.65,
      trolley_speed: 32,
      motor_power: 30,
      total_weight: 36,
      jib_weight: 5.2,
      counterweight: 11,
      free_standing_height: 40,
      max_anchored_height: 150,
      working_temp_min: -20,
      working_temp_max: 40,
      max_wind_operational: 12,
      max_wind_nonoperational: 30,
      power_supply: '380V/50Hz',
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
      manufacturer: '中联重科',
      serial_number: 'ZL2025QTZ160-0012',
      production_date: '2025-02-28',
      project_name: '滨江新城B区项目',
      construction_unit: '中建八局第一建设有限公司',
      registration_number: '粤AQ-T2025-0046',
      min_radius: 3,
      tip_load: 2.5,
      hoist_speed: 85,
      slewing_speed: 0.5,
      trolley_speed: 42,
      motor_power: 75,
      total_weight: 82,
      jib_weight: 11.5,
      counterweight: 26,
      free_standing_height: 60,
      max_anchored_height: 250,
      working_temp_min: -20,
      working_temp_max: 40,
      max_wind_operational: 12,
      max_wind_nonoperational: 30,
      power_supply: '380V/50Hz',
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
        const craneAny = crane as unknown as Record<string, number>
        const maxVal = 'max' in st ? (st as { max: number }).max : craneAny[st.maxField]
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
          const craneAny = crane as unknown as Record<string, number>
          const maxVal = 'max' in sensor ? (sensor as { max: number }).max : craneAny[sensor.maxField]
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
    const adminHash = crypto.pbkdf2Sync('Admin123', adminSalt, 10000, 64, 'sha512').toString('hex')
    const userSalt = crypto.randomBytes(16).toString('hex')
    const userHash = crypto.pbkdf2Sync('User123', userSalt, 10000, 64, 'sha512').toString('hex')

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
