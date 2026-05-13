# Spacetime 成家立业

大学交友小程序平台 - 管理后台 + 后端服务

## 技术栈


| 层级   | 技术                           |
| ---- | ---------------------------- |
| 后端框架 | Spring Boot 3.4 + Java 21    |
| ORM  | MyBatis-Plus 3.5             |
| 数据库  | MySQL 8.0                    |
| 缓存   | Redis 7.x                    |
| 前端   | React 18 + TypeScript + Vite |
| UI   | Tailwind CSS + shadcn/ui     |
| 状态管理 | Zustand                      |


## 项目结构

```
spacetime/
├── backend/           # Spring Boot 后端
│   ├── common/        # 公共模块（实体、工具、拦截器）
│   ├── admin/         # 管理后台 API
│   └── miniapp/       # 小程序 API
├── frontend/          # React 管理后台前端
└── docs/              # 文档
```

## 快速开始

### 环境要求

- JDK 21+
- Maven 3.8+
- MySQL 8.0+
- Redis 7.x+
- Node.js 18+

### 后端启动

```bash
cd backend

# 修改 src/main/resources/application-dev.yml 中的数据库和 Redis 连接信息
# 或设置环境变量 DB_PASSWORD、REDIS_PASSWORD

mvn spring-boot:run
# 启动后访问 http://localhost:8080
# API 文档：http://localhost:8080/doc.html
```

### 前端启动

```bash
cd frontend

# Vite 代理已在 vite.config.ts 中配置到 localhost:8080
npm install
npm run dev
# 启动后访问 http://localhost:5173
```

### 初始化数据库

```sql
-- 创建数据库
CREATE DATABASE spacetime DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 编码规范

详见 [TEAM_STANDARDS.md](./TEAM_STANDARDS.md)

## 架构文档

详见 [docs/superpowers/specs/](./docs/superpowers/specs/)