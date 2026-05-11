# Spacetime 团队编码规范

> 所有团队成员必须遵守此规范，Code Review 时以此文档为准。

---

## 1. 注释规范

### 1.1 必须写注释的场景

| 场景 | 注释形式 | 示例 |
|------|---------|------|
| 每个类/接口 | 类级 Javadoc | `/** 用户服务接口 */` |
| 每个 public 方法 | 方法级 Javadoc | `/** @param token @return */` |
| 每个字段 | 行注释 | `/** 状态码 */` |
| 关键步骤 | 行内注释 | `// 1. 校验 token` |

### 1.2 类注释模板

```java
/**
 * 类的功能描述
 * 关键设计说明（如有）
 */
```

### 1.3 方法注释模板

```java
/**
 * 方法功能描述
 * @param xxx 参数说明
 * @return 返回值说明
 */
```

### 1.4 字段注释模板

```java
/** 字段说明 */
private int code;
```

### 1.5 关键步骤注释

复杂方法内部用 `// 1. / 2. / 3.` 标记关键步骤，让代码逻辑一目了然。

---

## 2. 项目结构规范

### 2.1 六层架构（自上而下）

```
Controller  → 接收请求、参数校验、调用 Service
Service     → 业务逻辑接口
ServiceImpl → 业务逻辑实现，调用 DAO
DAO         → 数据访问接口
DAOImpl     → 数据访问实现，调用 MyBatis Mapper
Mapper      → MyBatis-Plus BaseMapper（数据库映射层）
```

> **⚠️ 关键约束：每一层只能调用紧邻的下一层。**
> - Controller 不能跳过 Service 直接调 DAO
> - **ServiceImpl 不能跳过 DAO 直接调 MyBatis Mapper**
> - 只有 DAOImpl 可以注入和调用 MyBatis Mapper

> **🔑 名词区分：**
> - **MyBatis Mapper**（`XxxMapper`）= 数据库映射接口，继承 `BaseMapper`，**只有 DAOImpl 能调**
> - **Jackson ObjectMapper**（`com.fasterxml.jackson.databind.ObjectMapper`）= JSON 序列化/反序列化工具，**与数据库无关**，Service 层可以使用

### 2.2 包结构

```
com.spacetime
├── common/           # 公共模块
│   ├── config/       # 配置类
│   ├── constant/     # 常量
│   ├── dao/          # DAO 接口 + impl/
│   ├── dto/          # 通用 DTO（分页等）
│   ├── entity/       # 数据库实体
│   ├── enums/        # 枚举
│   ├── exception/    # 异常类
│   ├── interceptor/  # 拦截器
│   ├── mapper/       # MyBatis Mapper
│   ├── result/       # 统一返回体 R
│   └── util/         # 工具类
├── admin/            # 管理后台模块
│   ├── controller/
│   ├── service/      # 接口 + impl/
│   └── dto/          # request/ + response/
└── miniapp/          # 小程序模块
    ├── controller/
    ├── service/      # 接口 + impl/
    └── dto/          # request/ + response/
```

### 2.3 前端目录结构

```
frontend/
├── src/
│   ├── components/       # 公共组件（ui/ layout/ common/）
│   ├── pages/            # 页面，按菜单模块分目录
│   ├── hooks/            # 自定义 hooks（useTable 等）
│   ├── stores/           # Zustand stores
│   ├── api/              # axios 请求模块，按业务分文件
│   ├── router/           # 路由配置 + 守卫
│   ├── types/            # TypeScript 类型定义
│   ├── utils/            # 工具函数
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── index.html
```

### 2.4 前端关键约束

1. 页面组件只拼 UI + 调 Hook，不写业务逻辑
2. API 调用统一走 `api/` 目录，禁止在页面内直接 axios
3. 路由守卫在 `router/guard.tsx` 统一处理
4. 敏感字段脱敏在工具函数做，禁止 JSX 里直接 slice

---

## 3. 命名规范

| 类型 | 规则 | 示例 |
|------|------|------|
| 类名（后端） | 大驼峰 | `TokenInterceptor` |
| 方法名（后端） | 小驼峰 | `getUserById()` |
| 变量名 | 小驼峰 | `accessKeyId` |
| 常量（后端） | 全大写+下划线 | `TOKEN_HEADER` |
| 实体类 | 表名转大驼峰 | `SysUser` → `sys_user` |
| 前端组件文件 | PascalCase | `UserList.tsx` |
| 前端页面目录 | kebab-case | `user-mgr/` |
| 前端 Hook | `useXxx.ts` | `useAuth.ts` |
| 前端 Store | `xxxStore.ts` | `authStore.ts` |
| Service 接口 | `XxxService` | `AuthService` |
| Service 实现 | `XxxServiceImpl` | `AuthServiceImpl` |
| DAO 接口 | `XxxDao` | `UserDao` |
| DAO 实现 | `XxxDaoImpl` | `UserDaoImpl` |
| Mapper | `XxxMapper` | `SysUserMapper` |
| Controller | `XxxController` | `AuthController` |

---

## 4. 返回规范

### 4.1 统一使用 R 包装

```java
// 成功
return R.ok(data);
return R.ok();

// 失败
return R.fail(ResultCodeEnum.PARAM_ERROR);
return R.fail("用户名不能为空");
```

### 4.2 错误码使用 ResultCodeEnum

- `SUCCESS(200)` — 成功
- `UNAUTHORIZED(401)` — 未登录
- `FORBIDDEN(403)` — 无权限
- `PARAM_ERROR(4001)` — 参数错误
- `BUSINESS_ERROR(5001)` — 业务异常
- `SYSTEM_ERROR(5000)` — 系统异常

### 4.3 异常处理

- 业务异常：抛 `BusinessException`
- 不要在各层 try-catch，统一由 `GlobalExceptionHandler` 处理

---

## 5. 数据库规范

- 所有表必须包含 `id, create_time, update_time, created_by, updated_by, deleted` 字段
- 所有实体必须继承 `BaseEntity`
- 使用 `@TableLogic` 逻辑删除，禁止物理删除
- 字符集统一 `utf8mb4`，引擎统一 `InnoDB`

---

## 6. 登录 / 鉴权规范

- Token 放在请求头 `X-Auth-Token`
- 管理后台 token 前缀：`admin:token:`
- 小程序 token 前缀：`miniapp:token:`
- 用户上下文通过 `UserContextHolder.get()` 获取
- 密码使用 BCrypt 加密（Hutool `SecureUtil.bcrypt()`）
- 退出登录时删除 Redis 中的 token（后端销毁，非前端清除）

---

## 7. Git 规范

### 7.1 分支策略

- `master` — 主分支，始终保持可部署状态
- `dev` — 开发分支
- `feature/xxx` — 功能分支
- `fix/xxx` — 修复分支

### 7.2 Commit 格式

```
<type>: <简短描述>

feat: 添加登录接口
fix: 修复分页越界问题
docs: 更新 API 文档
refactor: 重构 TokenInterceptor
```

---

## 8. 前端编码规范

### 8.1 组件编写规范

```tsx
/**
 * 组件功能描述
 */
export function UserCard({ user, onEdit }: UserCardProps) {
  // 1. Hooks 放最前
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // 2. 派生状态
  const isAdmin = user.roles?.includes('admin');

  // 3. 事件处理函数
  const handleEdit = () => {
    setOpen(true);
    onEdit?.(user.id);
  };

  // 4. 渲染
  return (
    <div className="...">
      <h3>{user.nickname}</h3>
      {isAdmin && <Badge>管理员</Badge>}
      <Button onClick={handleEdit}>编辑</Button>
    </div>
  );
}
```

核心规则：
1. 一个文件只 export 一个组件（页面目录除外）
2. Hooks 声明 → 派生状态 → 事件处理 → JSX 渲染，按此顺序
3. 组件 Props 必须定义 TypeScript 接口
4. 复杂逻辑提取到 hooks/ 或 utils/

### 8.2 样式规范

- 统一使用 Tailwind CSS class，不写内联 style
- 复用样式用 `cn()` 工具函数合并 class
- 主题色用 CSS 变量 `bg-primary`、`text-primary-foreground`
- 禁止创建 `.module.css` 文件

```tsx
// 正确
<button className={cn("px-4 py-2 rounded", isActive && "bg-primary text-primary-foreground")}>

// 错误
<button style={{ padding: '8px 16px' }}>
```

### 8.3 状态管理规范

| 数据类型 | 存放位置 | 示例 |
|---------|---------|------|
| 登录用户信息 | Zustand authStore | token, nickname |
| 页面内 UI 状态 | 组件 useState | modal 开关, 表单值 |
| 服务端数据 | hooks 中管理 | 列表数据, 详情数据 |
| 全局配置 | Zustand store | 主题, 侧边栏折叠 |

### 8.4 路由规范

```
/                       首页 Dashboard
/login                  登录页（无需登录）
/user-mgr               用户管理
/auth-review            认证审核
/scale-mgr              量表管理
/finance                财务中心
/operation              运营中心
/system                 系统管理
/promotion              推广管理
```

- 路由守卫在 `router/guard.tsx` 统一处理
- 菜单配置从路由表派生，不硬编码
- 页面目录名 = URL 路径（kebab-case）

### 8.5 API 调用规范

```tsx
// api/auth.ts — 按业务模块分文件
import request from './request';

export function adminLogin(username: string, password: string) {
  return request.post('/admin/login', { username, password });
}

// 页面中调用
import { adminLogin } from '@/api/auth';
const handleLogin = async () => {
  const res = await adminLogin(username, password);
  // res.data 已自动解包
};
```

核心规则：
1. 所有请求函数放 `api/` 目录，按业务模块分文件
2. 页面组件禁止直接 `import axios` 或调 `request`
3. 每个 API 函数必须标注参数和返回值类型
4. 请求拦截器自动带 token，响应拦截器自动解包 data

### 8.6 类型定义规范

```tsx
// types/user.ts — 类型文件名与 API 模块对齐
export interface UserDetailVO {
  id: number;
  nickname: string;
  username: string;
  status: string;
  createTime: string;
}

export interface UserPageReq {
  page: number;
  size: number;
  keyword?: string;
  status?: string;
}
```

- Type 名称与后端 VO/Req 对齐
- 文件放在 `types/`，按模块分文件
- 组件内 Props 接口定义在组件文件内，不进 types/

### 8.7 页面文件模板

```tsx
// pages/user-mgr/UserMgrPage.tsx
/**
 * 用户管理页面
 */
import { useState } from 'react';
import { useTable } from '@/hooks/useTable';
import { getUserPage } from '@/api/user';
import type { UserDetailVO } from '@/types/user';

export default function UserMgrPage() {
  const { list, total, loading, page, setPage, reload } = useTable(getUserPage);
  const [keyword, setKeyword] = useState('');

  return (
    <div className="p-6">
      {/* 搜索栏 */}
      <div className="flex gap-4 mb-4">
        <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <Button onClick={reload}>搜索</Button>
      </div>
      {/* 表格 */}
      <Table data={list} columns={columns} loading={loading} />
      {/* 分页 */}
      <Pagination current={page} total={total} onChange={setPage} />
    </div>
  );
}
```

### 8.8 前端禁止事项

| 禁止 | 正确做法 |
|------|---------|
| 页面内直接 `import axios` | 走 `api/` 目录封装的函数 |
| JSX 中写复杂业务逻辑 | 提取到 hooks 或 utils |
| JSX 中 `user.phone.slice(0,3) + '****'` | 用 `utils/mask.ts` 脱敏函数 |
| 内联 `style={{}}` | 使用 Tailwind CSS class |
| 组件文件 export 多个组件 | 一个文件一个组件 |
| API 函数无类型标注 | 参数/返回值必须标注类型 |
| 硬编码路由路径 | 从路由配置表引用 |
| 密码/身份证等敏感信息 console 输出 | 禁止输出或用脱敏工具 |

---

## 9. 后端禁止事项

| 禁止 | 正确做法 |
|------|---------|
| Controller 直接调用 MyBatis Mapper | 走完整六层：Controller → Service → DAO → MyBatis Mapper |
| ServiceImpl 直接调 MyBatis Mapper | 必须通过 DAO 层，只有 DAOImpl 能注入 MyBatis Mapper |
| 各层自己 try-catch | 抛异常，交给 GlobalExceptionHandler |
| 硬编码错误码数字 | 使用 ResultCodeEnum |
| 密码明文/MD5 | 使用 BCrypt |
| 物理删除数据 | 使用 @TableLogic 逻辑删除 |
| 无注释代码 | 类/方法/字段必须有注释 |
| 魔法值 | 提取为常量或枚举 |
| admin/ 调用 miniapp/ | 两个模块只能依赖 common/ |
| 日期用 java.util.Date | 统一用 LocalDateTime |

> **📌 Jackson ObjectMapper 不是 "Mapper"：** `com.fasterxml.jackson.databind.ObjectMapper` 是 JSON 序列化工具，与 MyBatis 的数据库 Mapper 是完全不同的概念。Service/ServiceImpl 可以使用它做 JSON 操作，不受 "禁止直接调 Mapper" 规则的限制。
