## 1. 架构设计

```mermaid
graph TB
    subgraph "前端层"
        A["React 监控平台"]
        A1["实时监控大屏"]
        A2["塔机管理"]
        A3["历史数据"]
        A4["预警中心"]
        A5["数据分析"]
    end

    subgraph "后端层"
        B["Express API 服务"]
        B1["数据采集接口"]
        B2["设备管理接口"]
        B3["预警处理服务"]
        B4["数据分析服务"]
        B5["WebSocket 推送"]
    end

    subgraph "数据层"
        C["SQLite 数据库"]
        C1["设备表"]
        C2["传感器数据表"]
        C3["预警记录表"]
        C4["预警规则表"]
        C5["用户表"]
    end

    subgraph "模拟终端"
        D["传感器数据模拟器"]
        D1["起重量传感器"]
        D2["幅度传感器"]
        D3["高度传感器"]
        D4["回转角度传感器"]
        D5["风速传感器"]
    end

    D -->|"模拟数据上报"| B1
    B1 -->|"数据存储"| C
    B1 -->|"实时推送"| B5
    B5 -->|"WebSocket"| A1
    A -->|"HTTP请求"| B
    B -->|"SQL查询"| C
    B3 -->|"预警检测"| B5
```

## 2. 技术说明

- **前端**：React@18 + TypeScript + TailwindCSS@3 + Vite
- **初始化工具**：vite-init（react-express-ts模板）
- **状态管理**：Zustand
- **图表库**：Recharts
- **后端**：Express@4 + TypeScript（ESM格式）
- **数据库**：SQLite（better-sqlite3）
- **实时通信**：WebSocket（ws库）
- **数据模拟**：后端定时任务模拟传感器数据上报

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 实时监控大屏 - 全局概览和单机详细监控 |
| /cranes | 塔机管理 - 设备列表和详情 |
| /cranes/:id | 塔机详情 - 单台塔机详细信息 |
| /history | 历史数据 - 多维度历史数据查询 |
| /alerts | 预警中心 - 实时预警和预警规则 |
| /analysis | 数据分析 - 运行统计和趋势分析 |

## 4. API定义

### 4.1 设备管理接口

```typescript
interface Crane {
  id: string
  name: string
  model: string
  status: "online" | "offline" | "alarm"
  location: { x: number; y: number }
  maxLoad: number
  maxMoment: number
  maxRadius: number
  maxHeight: number
  installDate: string
  lastMaintenance: string
  sensors: Sensor[]
}

interface Sensor {
  id: string
  craneId: string
  type: "load" | "moment" | "radius" | "height" | "rotation" | "wind"
  unit: string
  minValue: number
  maxValue: number
  status: "normal" | "warning" | "alarm"
}

// GET /api/cranes - 获取所有塔机列表
// GET /api/cranes/:id - 获取塔机详情
// GET /api/cranes/:id/status - 获取塔机实时状态
```

### 4.2 传感器数据接口

```typescript
interface SensorData {
  id: string
  craneId: string
  sensorType: string
  value: number
  timestamp: string
}

interface SensorDataQuery {
  craneId?: string
  sensorType?: string
  startTime: string
  endTime: string
  interval?: "1m" | "5m" | "15m" | "1h" | "1d"
}

// GET /api/sensor-data/latest/:craneId - 获取塔机最新传感器数据
// GET /api/sensor-data/history - 查询历史传感器数据
// POST /api/sensor-data - 上报传感器数据（模拟器使用）
```

### 4.3 预警接口

```typescript
interface Alert {
  id: string
  craneId: string
  craneName: string
  sensorType: string
  level: "info" | "warning" | "critical"
  message: string
  value: number
  threshold: number
  timestamp: string
  status: "active" | "acknowledged" | "resolved"
  resolvedBy?: string
  resolvedAt?: string
}

interface AlertRule {
  id: string
  name: string
  craneId: string | "all"
  sensorType: string
  condition: "gt" | "lt" | "gte" | "lte"
  threshold: number
  level: "info" | "warning" | "critical"
  enabled: boolean
}

// GET /api/alerts - 获取预警列表
// GET /api/alerts/active - 获取活跃预警
// PUT /api/alerts/:id/acknowledge - 确认预警
// PUT /api/alerts/:id/resolve - 解决预警
// GET /api/alert-rules - 获取预警规则
// POST /api/alert-rules - 创建预警规则
// PUT /api/alert-rules/:id - 更新预警规则
```

### 4.4 数据分析接口

```typescript
interface AnalysisStats {
  craneId: string
  totalRunHours: number
  avgLoad: number
  maxLoad: number
  loadRate: number
  alertCount: number
  dailyStats: DailyStat[]
}

interface DailyStat {
  date: string
  runHours: number
  avgLoad: number
  maxLoad: number
  alertCount: number
}

// GET /api/analysis/stats/:craneId - 获取塔机运行统计
// GET /api/analysis/trend/:craneId - 获取趋势分析数据
// GET /api/analysis/safety-score/:craneId - 获取安全评分
```

### 4.5 WebSocket消息格式

```typescript
interface WSMessage {
  type: "sensor_update" | "alert" | "status_change"
  payload: SensorData | Alert | { craneId: string; status: string }
}
```

## 5. 服务架构图

```mermaid
graph LR
    subgraph "Controller层"
        A1["CraneController"]
        A2["SensorDataController"]
        A3["AlertController"]
        A4["AnalysisController"]
    end

    subgraph "Service层"
        B1["CraneService"]
        B2["SensorDataService"]
        B3["AlertService"]
        B4["AnalysisService"]
        B5["SimulatorService"]
    end

    subgraph "Repository层"
        C1["CraneRepo"]
        C2["SensorDataRepo"]
        C3["AlertRepo"]
        C4["AlertRuleRepo"]
    end

    subgraph "数据库"
        D["SQLite"]
    end

    A1 --> B1 --> C1 --> D
    A2 --> B2 --> C2 --> D
    A3 --> B3 --> C3 --> D
    B5 -->|"模拟数据"| B2
    B2 -->|"阈值检测"| B3
    B4 --> B2
    B4 --> B3
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    Crane ||--o{ SensorData : generates
    Crane ||--o{ Alert : triggers
    Crane ||--o{ Sensor : has
    AlertRule ||--o{ Alert : produces
    Crane {
        string id PK
        string name
        string model
        string status
        number location_x
        number location_y
        number max_load
        number max_moment
        number max_radius
        number max_height
        string install_date
        string last_maintenance
    }
    Sensor {
        string id PK
        string crane_id FK
        string type
        string unit
        number min_value
        number max_value
        string status
    }
    SensorData {
        string id PK
        string crane_id FK
        string sensor_type
        number value
        string timestamp
    }
    Alert {
        string id PK
        string crane_id FK
        string rule_id FK
        string sensor_type
        string level
        string message
        number value
        number threshold
        string timestamp
        string status
        string resolved_by
        string resolved_at
    }
    AlertRule {
        string id PK
        string name
        string crane_id
        string sensor_type
        string condition
        number threshold
        string level
        boolean enabled
    }
```

### 6.2 数据定义语言

```sql
CREATE TABLE cranes (
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

CREATE TABLE sensors (
  id TEXT PRIMARY KEY,
  crane_id TEXT NOT NULL REFERENCES cranes(id),
  type TEXT NOT NULL,
  unit TEXT NOT NULL,
  min_value REAL NOT NULL,
  max_value REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'normal'
);

CREATE TABLE sensor_data (
  id TEXT PRIMARY KEY,
  crane_id TEXT NOT NULL REFERENCES cranes(id),
  sensor_type TEXT NOT NULL,
  value REAL NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE INDEX idx_sensor_data_crane_time ON sensor_data(crane_id, timestamp);
CREATE INDEX idx_sensor_data_type ON sensor_data(sensor_type);

CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  crane_id TEXT NOT NULL REFERENCES cranes(id),
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

CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_crane ON alerts(crane_id);
CREATE INDEX idx_alerts_timestamp ON alerts(timestamp);

CREATE TABLE alert_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  crane_id TEXT NOT NULL,
  sensor_type TEXT NOT NULL,
  condition TEXT NOT NULL,
  threshold REAL NOT NULL,
  level TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1
);
```
