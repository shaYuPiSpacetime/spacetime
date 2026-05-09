# 成家立业 — 架构设计文档 V1.0

## 1. 项目概述

"成家立业"是聚焦大学生群体的社交与成长微信小程序平台。本文档定义**管理后台 + 小程序后端 + 管理后台前端**的技术架构、目录结构、编码规范。

**范围：**

- 管理后台后端（Spring Boot）
- 小程序后端（同一 Spring Boot 项目，包路径区分）
- 管理后台前端（React）
- 不含：小程序前端（独立项目）

---

## 2. 技术栈

### 后端

| 项 | 选型 | 版本 |
|---|------|------|
| 语言 | Java | 21 |
| 框架 | Spring Boot | 3.x |
| ORM | MyBatis-Plus | 3.5+ |
| 数据库 | MySQL | 8.0 |
| 缓存 | Redis | 7.x |
| 认证 | 轻量 Token 校验（拦截器 + Redis） | — |
| API 文档 | Knife4j | — |
| 文件存储 | 阿里云 OSS | — |
| 构建 | Maven | — |
| 部署 | Docker | — |

### 前端（管理后台）

| 项 | 选型 |
|---|------|
| 框架 | React 18+ |
| 语言 | TypeScript |
| 构建 | Vite |
| UI 组件 | shadcn/ui + Radix UI |
| 样式 | Tailwind CSS |
| 路由 | react-router-dom v6 |
| 状态管理 | Zustand |
| HTTP | axios |
| 图表 | ECharts |

---

## 3. 系统架构

### 3.1 架构模式

**单仓库单体应用**，内部通过包路径（package）划分模块边界。管理后台和小程序共用同一个 Spring Boot 服务。

### 3.2 请求流向

```
React 管理后台（浏览器） ──调 /admin/**──┐
                                          ├──→ Spring Boot（Docker 容器）
微信小程序（独立项目） ──调 /miniapp/**──┘        │
                                                 ├── MySQL 8.0
                                                 ├── Redis 7.x
                                                 └── 阿里云 OSS
```

### 3.3 认证流程

```
请求 → TokenInterceptor（从 Header 取 Token）
     → Redis 校验（是否存在、未过期）
     → 通过：写入 ThreadLocal 当前用户信息
     → 不通过：返回 401
```

不使用 Spring Security，拦截器自行实现。

### 3.4 项目目录结构

```
chengjialiye/
├── backend/                     ← Spring Boot 项目
│   ├── src/main/java/com/chengjialiye/
│   │   ├── common/              ← 公共模块
│   │   │   ├── entity/          ← 实体类（数据库表映射）
│   │   │   ├── enums/           ← 枚举常量
│   │   │   ├── util/            ← 工具类
│   │   │   ├── config/          ← Spring 配置
│   │   │   ├── exception/       ← 异常定义 + 全局异常处理
│   │   │   └── result/          ← 统一返回体 R<T>
│   │   ├── admin/               ← 管理后台模块
│   │   │   ├── controller/
│   │   │   ├── service/         ← 接口
│   │   │   ├── service/impl/    ← 实现类
│   │   │   ├── dao/             ← 数据访问接口
│   │   │   ├── dao/impl/        ← 数据访问实现
│   │   │   ├── mapper/          ← MyBatis-Plus Mapper + XML
│   │   │   └── dto/
│   │   │       ├── request/
│   │   │       └── response/
│   │   ├── miniapp/             ← 小程序模块
│   │   │   ├── controller/
│   │   │   ├── service/
│   │   │   ├── service/impl/
│   │   │   ├── dao/
│   │   │   ├── dao/impl/
│   │   │   ├── mapper/
│   │   │   └── dto/
│   │   │       ├── request/
│   │   │       └── response/
│   │   └── ChengjialiyeApplication.java
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   ├── application-dev.yml
│   │   └── application-prod.yml
│   ├── Dockerfile
│   └── pom.xml
├── admin-web/                   ← React 管理后台前端
│   ├── src/
│   │   ├── components/          ← 公共组件
│   │   ├── pages/               ← 页面（按菜单模块分目录）
│   │   ├── hooks/               ← 自定义 hooks
│   │   ├── stores/              ← Zustand stores
│   │   ├── api/                 ← axios 请求
│   │   ├── router/              ← 路由配置 + 守卫
│   │   ├── types/               ← TypeScript 类型
│   │   ├── utils/               ← 工具函数
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
└── docs/                        ← 文档
```

---

## 4. 分层架构

### 4.1 调用链路

```
Controller → Service(接口) → ServiceImpl → DAO(接口) → DAOImpl → Mapper
```

### 4.2 各层职责

| 层 | 职责 | 禁止 |
|----|------|------|
| Controller | 接收请求、参数校验(@Valid)、调 Service、返回 R<T> | 写业务逻辑、直接调 DAO |
| Service | 接口定义 + Javadoc | 写实现代码 |
| ServiceImpl | 业务逻辑、事务控制(@Transactional)、组装数据 | 写 SQL、直接调 Mapper |
| DAO | 数据访问接口定义 | 写实现代码 |
| DAOImpl | 数据访问实现，注入 Mapper，调 MyBatis-Plus | 写业务逻辑 |
| Mapper | 继承 BaseMapper<Entity>，XML 写复杂 SQL | 写业务逻辑 |

### 4.3 跨包约束

- `admin/` 和 `miniapp/` 不能互相调用（import）
- 两个包只能依赖 `common/`
- Entity 统一放 `common/entity/`，所有 Mapper 引用同一份

---

## 5. 数据库设计

### 5.1 基础字段规范

所有表必须包含以下字段：

```sql
id          BIGINT(20) NOT NULL AUTO_INCREMENT,
create_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
update_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
updated_by  BIGINT(20) NULL DEFAULT NULL COMMENT '修改人id',
created_by  BIGINT(20) NULL DEFAULT NULL COMMENT '创建人id',
deleted     BIT(1) NULL DEFAULT b'0' COMMENT '删除标识',
PRIMARY KEY (id)
```

### 5.2 字段类型规范

- 金额：DECIMAL(16,4)
- 状态字段：VARCHAR，实体类定义枚举常量
- 手机号、身份证、URL：VARCHAR
- 日期时间：DATETIME
- 字符集：utf8mb4，排序规则 utf8mb4_general_ci
- 引擎：InnoDB

### 5.3 索引命名

- 普通索引：`idx_表名_字段`
- 唯一索引：`uk_表名_字段`

### 5.4 核心表清单（19 张）

| 域 | 表名 | 说明 |
|----|------|------|
| 认证与权限 | sys_user | 管理员账号 |
| | sys_role | 角色表 |
| | sys_permission | 权限点（菜单/按钮/接口/数据） |
| | sys_role_permission | 角色-权限关联 |
| | sys_log | 操作日志 |
| 用户中心 | app_user | 小程序用户 |
| | app_user_auth | 认证记录（实名/学历/头像） |
| 测评系统 | scale | 量表基本信息 |
| | scale_dimension | 维度 |
| | scale_question | 题目 |
| | scale_question_option | 选项 |
| | scale_result_range | 结果分段 |
| 财务 | pay_order | 充值/VIP 订单 |
| | pay_refund | 退款记录 |
| | app_user_coin_log | 成家币流水 |
| 配置 | sys_config | 系统参数 KV 配置 |
| 推广 | promotion_rule | 推广奖励规则 |
| | promotion_record | 推广记录 |
| | promotion_agent | 代理信息 |

---

## 6. 后端编码规范

### 6.1 命名规范

| 层级 | 命名规则 | 示例 |
|------|---------|------|
| Controller | XxxController | UserMgrController |
| Service 接口 | XxxService | UserMgrService |
| ServiceImpl | XxxServiceImpl | UserMgrServiceImpl |
| DAO 接口 | XxxDao | UserDao |
| DAOImpl | XxxDaoImpl | UserDaoImpl |
| Mapper | XxxMapper | UserMapper |
| Entity | 表名驼峰 | AppUser |
| Request DTO | XxxReq | UserPageReq |
| Response VO | XxxVO | UserDetailVO |
| 枚举 | XxxEnum | UserStatusEnum |

### 6.2 关键约束

1. Controller 不写业务逻辑，只做参数校验 + 调 Service + 返回 R<T>
2. Controller 统一返回 `R<T>`（code + msg + data）
3. Service 接口必须写，不能在 Controller 直接调 ServiceImpl
4. Mapper 不能跨包调用：admin 的 Service 不能调 miniapp 的 Mapper
5. 分页查询统一用 MyBatis-Plus Page + LambdaQueryWrapper
6. 复杂 SQL 写 XML，简单查询用 LambdaQueryWrapper
7. 异常统一抛 BusinessException，GlobalExceptionHandler 拦截处理
8. 日期字段用 LocalDateTime，禁止 java.util.Date
9. 敏感字段脱敏用工具类 DesensitizeUtil.mask()

---

## 7. SQL 规范

1. 关键字大写，表名字段名小写下划线（SELECT ... FROM ... WHERE ...）
2. 禁止 `SELECT *`，必须列出字段
3. WHERE 条件列必须走索引，建表时同步评估索引
4. 批量操作使用 MyBatis-Plus `saveBatch / updateBatch`，禁止循环单条
5. 模糊查询用 `LIKE CONCAT('%', #{val}, '%')`，禁止 `${}` 拼接
6. 分页查询必须有 ORDER BY
7. 配置类数据走单表 KV 结构

---

## 8. 前端编码规范

### 8.1 目录结构

```
src/
├── components/    ← 公共组件（ui/ layout/ common/）
├── pages/         ← 页面，按菜单模块分目录
├── hooks/         ← 自定义 hooks
├── stores/        ← Zustand stores
├── api/           ← axios 请求模块
├── router/        ← 路由配置 + 守卫
├── types/         ← TypeScript 类型定义
├── utils/         ← 工具函数
├── App.tsx
└── main.tsx
```

### 8.2 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | UserList.tsx |
| 页面目录 | kebab-case | user-mgr/ |
| Hook | useXxx.ts | useAuth.ts |
| Store | xxxStore.ts | authStore.ts |
| API 文件 | 按模块 | user.ts, finance.ts |
| Type | 和后端对齐 | UserDetailVO, UserPageReq |

### 8.3 关键约束

1. 页面组件只负责拼 UI + 调 Hook，不写业务逻辑
2. API 调用统一走 `api/` 目录，禁止在页面内直接 axios
3. 列表页统一用 `useTable` hook 管理分页/搜索/排序
4. 路由守卫在 `router/guard.tsx` 统一处理
5. 敏感字段脱敏在工具函数做，禁止 JSX 里直接 slice

---

## 9. 部署

- Docker 单容器部署后端
- 前端构建静态文件，Nginx 反代或以静态资源方式挂载
- MySQL 8.0 / Redis 7.x 独立部署或云服务
- 暂不引入消息队列

---

## 10. 暂不做

- 微服务拆分
- 消息队列
- 数据监控与报表（PRD 标记暂缓）
- 发票与导出（PRD 标记暂缓）
- 风控与大额支付（PRD 标记暂缓）
- AB 测试（PRD 标记暂缓）
