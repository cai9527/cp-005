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

    CREATE TABLE IF NOT EXISTS device_heartbeat (
      id TEXT PRIMARY KEY,
      crane_id TEXT NOT NULL REFERENCES cranes(id) ON DELETE CASCADE,
      last_heartbeat_at TEXT NOT NULL,
      heartbeat_interval_ms INTEGER NOT NULL DEFAULT 25000,
      status TEXT NOT NULL DEFAULT 'online',
      reconnect_count INTEGER NOT NULL DEFAULT 0,
      latency_ms REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_device_heartbeat_crane ON device_heartbeat(crane_id);
    CREATE INDEX IF NOT EXISTS idx_device_heartbeat_status ON device_heartbeat(status);

    CREATE TABLE IF NOT EXISTS device_status_log (
      id TEXT PRIMARY KEY,
      crane_id TEXT NOT NULL REFERENCES cranes(id) ON DELETE CASCADE,
      old_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      reason TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_device_status_log_crane ON device_status_log(crane_id);
    CREATE INDEX IF NOT EXISTS idx_device_status_log_timestamp ON device_status_log(timestamp);

    CREATE TABLE IF NOT EXISTS rotation_simulation (
      id TEXT PRIMARY KEY,
      crane_id TEXT NOT NULL REFERENCES cranes(id) ON DELETE CASCADE,
      angular_velocity REAL NOT NULL DEFAULT 0.6,
      direction TEXT NOT NULL DEFAULT 'cw',
      center_x REAL NOT NULL DEFAULT 50,
      center_y REAL NOT NULL DEFAULT 50,
      radius REAL NOT NULL DEFAULT 30,
      status TEXT NOT NULL DEFAULT 'stopped',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rotation_trajectory (
      id TEXT PRIMARY KEY,
      simulation_id TEXT NOT NULL REFERENCES rotation_simulation(id) ON DELETE CASCADE,
      angle REAL NOT NULL,
      pos_x REAL NOT NULL,
      pos_y REAL NOT NULL,
      angular_velocity REAL NOT NULL,
      timestamp TEXT NOT NULL,
      elapsed_ms INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_rotation_trajectory_sim ON rotation_trajectory(simulation_id);
    CREATE INDEX IF NOT EXISTS idx_rotation_trajectory_time ON rotation_trajectory(timestamp);

    CREATE TABLE IF NOT EXISTS collision_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      safe_distance REAL NOT NULL DEFAULT 5,
      risk_velocity REAL NOT NULL DEFAULT 1,
      warning_distance_ratio REAL NOT NULL DEFAULT 1.5,
      critical_distance_ratio REAL NOT NULL DEFAULT 1.2,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collision_alerts (
      id TEXT PRIMARY KEY,
      crane1_id TEXT NOT NULL REFERENCES cranes(id) ON DELETE CASCADE,
      crane2_id TEXT NOT NULL REFERENCES cranes(id) ON DELETE CASCADE,
      level TEXT NOT NULL,
      distance REAL NOT NULL,
      relative_velocity REAL NOT NULL,
      approach_angle REAL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      resolved_by TEXT,
      resolved_at TEXT,
      crane1_pos_x REAL,
      crane1_pos_y REAL,
      crane2_pos_x REAL,
      crane2_pos_y REAL
    );

    CREATE INDEX IF NOT EXISTS idx_collision_alerts_status ON collision_alerts(status);
    CREATE INDEX IF NOT EXISTS idx_collision_alerts_crane1 ON collision_alerts(crane1_id);
    CREATE INDEX IF NOT EXISTS idx_collision_alerts_crane2 ON collision_alerts(crane2_id);
    CREATE INDEX IF NOT EXISTS idx_collision_alerts_timestamp ON collision_alerts(timestamp);

    CREATE TABLE IF NOT EXISTS device_position_snapshots (
      id TEXT PRIMARY KEY,
      crane_id TEXT NOT NULL REFERENCES cranes(id) ON DELETE CASCADE,
      pos_x REAL NOT NULL,
      pos_y REAL NOT NULL,
      rotation REAL NOT NULL,
      radius REAL NOT NULL,
      velocity_x REAL,
      velocity_y REAL,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_position_snapshots_crane ON device_position_snapshots(crane_id);
    CREATE INDEX IF NOT EXISTS idx_position_snapshots_timestamp ON device_position_snapshots(timestamp);

    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gender TEXT NOT NULL DEFAULT 'male',
      id_card TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      emergency_contact TEXT,
      emergency_phone TEXT,
      address TEXT,
      photo TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      hire_date TEXT NOT NULL,
      leave_date TEXT,
      experience_years INTEGER DEFAULT 0,
      crane_id TEXT REFERENCES cranes(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_id_card ON drivers(id_card);
    CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
    CREATE INDEX IF NOT EXISTS idx_drivers_crane ON drivers(crane_id);

    CREATE TABLE IF NOT EXISTS driver_certifications (
      id TEXT PRIMARY KEY,
      driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
      cert_type TEXT NOT NULL,
      cert_number TEXT NOT NULL,
      issue_authority TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'valid',
      remark TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_driver_certs_driver ON driver_certifications(driver_id);
    CREATE INDEX IF NOT EXISTS idx_driver_certs_status ON driver_certifications(status);
    CREATE INDEX IF NOT EXISTS idx_driver_certs_expiry ON driver_certifications(expiry_date);

    CREATE TABLE IF NOT EXISTS driver_work_records (
      id TEXT PRIMARY KEY,
      driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
      crane_id TEXT NOT NULL REFERENCES cranes(id),
      work_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      work_type TEXT NOT NULL,
      work_content TEXT,
      load_count INTEGER DEFAULT 0,
      max_load REAL DEFAULT 0,
      remark TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_work_records_driver ON driver_work_records(driver_id);
    CREATE INDEX IF NOT EXISTS idx_work_records_crane ON driver_work_records(crane_id);
    CREATE INDEX IF NOT EXISTS idx_work_records_date ON driver_work_records(work_date);

    CREATE TABLE IF NOT EXISTS driver_schedules (
      id TEXT PRIMARY KEY,
      driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
      crane_id TEXT NOT NULL REFERENCES cranes(id),
      schedule_date TEXT NOT NULL,
      shift_type TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      remark TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_schedules_driver ON driver_schedules(driver_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_crane ON driver_schedules(crane_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_date ON driver_schedules(schedule_date);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_schedules_unique ON driver_schedules(driver_id, schedule_date, shift_type);

    CREATE TABLE IF NOT EXISTS driver_trainings (
      id TEXT PRIMARY KEY,
      driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
      training_type TEXT NOT NULL,
      training_name TEXT NOT NULL,
      training_date TEXT NOT NULL,
      duration_hours REAL NOT NULL,
      trainer TEXT,
      training_org TEXT,
      result TEXT NOT NULL DEFAULT 'pending',
      score REAL,
      remark TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_trainings_driver ON driver_trainings(driver_id);
    CREATE INDEX IF NOT EXISTS idx_trainings_type ON driver_trainings(training_type);
    CREATE INDEX IF NOT EXISTS idx_trainings_date ON driver_trainings(training_date);
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
  seedCollisionRules(database)
  seedDriverData(database)
}

function seedCollisionRules(database: Database.Database): void {
  const ruleCount = database.prepare('SELECT COUNT(*) as count FROM collision_rules').get() as { count: number }
  if (ruleCount.count > 0) return

  const insertRule = database.prepare(`
    INSERT INTO collision_rules (id, name, safe_distance, risk_velocity, warning_distance_ratio, critical_distance_ratio, enabled, created_at, updated_at)
    VALUES (@id, @name, @safe_distance, @risk_velocity, @warning_distance_ratio, @critical_distance_ratio, @enabled, @created_at, @updated_at)
  `)

  const now = new Date().toISOString()
  insertRule.run({
    id: uuidv4(),
    name: '默认防碰撞规则',
    safe_distance: 5,
    risk_velocity: 1,
    warning_distance_ratio: 1.5,
    critical_distance_ratio: 1.2,
    enabled: 1,
    created_at: now,
    updated_at: now,
  })
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

function seedDriverData(database: Database.Database): void {
  const driverCount = database.prepare('SELECT COUNT(*) as count FROM drivers').get() as { count: number }
  if (driverCount.count > 0) return

  const cranes = database.prepare('SELECT id, name FROM cranes ORDER BY name').all() as { id: string; name: string }[]
  if (cranes.length === 0) return

  const now = new Date().toISOString()

  const insertDriver = database.prepare(`
    INSERT INTO drivers (id, name, gender, id_card, phone, emergency_contact, emergency_phone, address, status, hire_date, experience_years, crane_id, created_at, updated_at)
    VALUES (@id, @name, @gender, @id_card, @phone, @emergency_contact, @emergency_phone, @address, @status, @hire_date, @experience_years, @crane_id, @created_at, @updated_at)
  `)

  const insertCert = database.prepare(`
    INSERT INTO driver_certifications (id, driver_id, cert_type, cert_number, issue_authority, issue_date, expiry_date, status, remark, created_at, updated_at)
    VALUES (@id, @driver_id, @cert_type, @cert_number, @issue_authority, @issue_date, @expiry_date, @status, @remark, @created_at, @updated_at)
  `)

  const insertWorkRecord = database.prepare(`
    INSERT INTO driver_work_records (id, driver_id, crane_id, work_date, start_time, end_time, work_type, work_content, load_count, max_load, remark, created_at)
    VALUES (@id, @driver_id, @crane_id, @work_date, @start_time, @end_time, @work_type, @work_content, @load_count, @max_load, @remark, @created_at)
  `)

  const insertSchedule = database.prepare(`
    INSERT INTO driver_schedules (id, driver_id, crane_id, schedule_date, shift_type, start_time, end_time, status, remark, created_at, updated_at)
    VALUES (@id, @driver_id, @crane_id, @schedule_date, @shift_type, @start_time, @end_time, @status, @remark, @created_at, @updated_at)
  `)

  const insertTraining = database.prepare(`
    INSERT INTO driver_trainings (id, driver_id, training_type, training_name, training_date, duration_hours, trainer, training_org, result, score, remark, created_at, updated_at)
    VALUES (@id, @driver_id, @training_type, @training_name, @training_date, @duration_hours, @trainer, @training_org, @result, @score, @remark, @created_at, @updated_at)
  `)

  const drivers = [
    {
      id: uuidv4(),
      name: '张伟',
      gender: 'male',
      id_card: '320102199001011234',
      phone: '13912345678',
      emergency_contact: '张丽',
      emergency_phone: '13987654321',
      address: '江苏省南京市鼓楼区中央路100号',
      status: 'active',
      hire_date: '2023-03-15',
      experience_years: 8,
      crane_id: cranes[0]?.id || null,
    },
    {
      id: uuidv4(),
      name: '李强',
      gender: 'male',
      id_card: '320105198805052345',
      phone: '13823456789',
      emergency_contact: '李芳',
      emergency_phone: '13898765432',
      address: '江苏省南京市建邺区河西大街200号',
      status: 'active',
      hire_date: '2022-06-20',
      experience_years: 12,
      crane_id: cranes[1]?.id || null,
    },
    {
      id: uuidv4(),
      name: '王磊',
      gender: 'male',
      id_card: '320106199203033456',
      phone: '13734567890',
      emergency_contact: '王芳',
      emergency_phone: '13709876543',
      address: '江苏省南京市玄武区中山路300号',
      status: 'active',
      hire_date: '2024-01-10',
      experience_years: 5,
      crane_id: cranes[2]?.id || null,
    },
    {
      id: uuidv4(),
      name: '陈刚',
      gender: 'male',
      id_card: '320104199507074567',
      phone: '13645678901',
      emergency_contact: '陈静',
      emergency_phone: '13610987654',
      address: '江苏省南京市秦淮区夫子庙50号',
      status: 'leave',
      hire_date: '2023-09-01',
      experience_years: 6,
      crane_id: null,
    },
    {
      id: uuidv4(),
      name: '赵勇',
      gender: 'male',
      id_card: '320111199104045678',
      phone: '13556789012',
      emergency_contact: '赵敏',
      emergency_phone: '13521098765',
      address: '江苏省南京市浦口区江浦街道80号',
      status: 'active',
      hire_date: '2021-11-15',
      experience_years: 15,
      crane_id: cranes[3]?.id || null,
    },
  ]

  const tx = database.transaction(() => {
    for (const driver of drivers) {
      insertDriver.run({
        id: driver.id,
        name: driver.name,
        gender: driver.gender,
        id_card: driver.id_card,
        phone: driver.phone,
        emergency_contact: driver.emergency_contact,
        emergency_phone: driver.emergency_phone,
        address: driver.address,
        photo: null,
        status: driver.status,
        hire_date: driver.hire_date,
        leave_date: null,
        experience_years: driver.experience_years,
        crane_id: driver.crane_id,
        created_at: now,
        updated_at: now,
      })

      insertCert.run({
        id: uuidv4(),
        driver_id: driver.id,
        cert_type: 'tower_crane_operator',
        cert_number: `TC-${driver.id_card.slice(-4)}-${new Date(driver.hire_date).getFullYear()}`,
        issue_authority: '江苏省住房和城乡建设厅',
        issue_date: driver.hire_date,
        expiry_date: '2027-12-31',
        status: 'valid',
        remark: null,
        created_at: now,
        updated_at: now,
      })

      insertCert.run({
        id: uuidv4(),
        driver_id: driver.id,
        cert_type: 'safety_training',
        cert_number: `ST-${driver.id_card.slice(-4)}-2026`,
        issue_authority: '江苏省安全生产监督管理局',
        issue_date: '2026-01-15',
        expiry_date: '2027-01-14',
        status: 'valid',
        remark: '年度安全培训合格',
        created_at: now,
        updated_at: now,
      })

      if (driver.crane_id) {
        const recentDates = ['2026-06-14', '2026-06-13', '2026-06-12']
        for (const date of recentDates) {
          insertWorkRecord.run({
            id: uuidv4(),
            driver_id: driver.id,
            crane_id: driver.crane_id,
            work_date: date,
            start_time: `${date}T07:00:00`,
            end_time: `${date}T17:00:00`,
            work_type: 'normal',
            work_content: '日常吊装作业',
            load_count: Math.floor(Math.random() * 30) + 20,
            max_load: Math.round((Math.random() * 5 + 2) * 10) / 10,
            remark: null,
            created_at: now,
          })

          insertSchedule.run({
            id: uuidv4(),
            driver_id: driver.id,
            crane_id: driver.crane_id,
            schedule_date: date,
            shift_type: 'day',
            start_time: '07:00',
            end_time: '17:00',
            status: date === '2026-06-14' ? 'scheduled' : 'completed',
            remark: null,
            created_at: now,
            updated_at: now,
          })
        }

        insertSchedule.run({
          id: uuidv4(),
          driver_id: driver.id,
          crane_id: driver.crane_id,
          schedule_date: '2026-06-15',
          shift_type: 'day',
          start_time: '07:00',
          end_time: '17:00',
          status: 'scheduled',
          remark: null,
          created_at: now,
          updated_at: now,
        })

        insertSchedule.run({
          id: uuidv4(),
          driver_id: driver.id,
          crane_id: driver.crane_id,
          schedule_date: '2026-06-16',
          shift_type: 'day',
          start_time: '07:00',
          end_time: '17:00',
          status: 'scheduled',
          remark: null,
          created_at: now,
          updated_at: now,
        })
      }

      insertTraining.run({
        id: uuidv4(),
        driver_id: driver.id,
        training_type: 'safety',
        training_name: '塔机安全操作规程培训',
        training_date: '2026-03-20',
        duration_hours: 8,
        trainer: '王安全',
        training_org: '江苏省建筑安全培训中心',
        result: 'passed',
        score: 92,
        remark: null,
        created_at: now,
        updated_at: now,
      })

      insertTraining.run({
        id: uuidv4(),
        driver_id: driver.id,
        training_type: 'skill',
        training_name: '塔机操作技能提升培训',
        training_date: '2026-05-10',
        duration_hours: 16,
        trainer: '刘师傅',
        training_org: '中联重科培训学院',
        result: 'passed',
        score: 88,
        remark: null,
        created_at: now,
        updated_at: now,
      })
    }
  })

  tx()
}
