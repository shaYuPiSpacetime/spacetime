# Spacetime 团队编码规范

> 所有团队成员必须遵守此规范，Code Review 时以此文档为准。

---

## 1. 注释规范

### 1.1 必须写注释的场景

| 场景             | 注释形式       | 示例                          |
| ---------------- | -------------- | ----------------------------- |
| 每个类/接口      | 类级 Javadoc   | `/** 用户服务接口 */`         |
| 每个 public 方法 | 方法级 Javadoc | `/** @param token @return */` |
| 每个字段         | 行注释         | `/** 状态码 */`               |
| 关键步骤         | 行内注释       | `// 1. 校验 token`            |

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
>
> - Controller 不能跳过 Service 直接调 DAO
> - **ServiceImpl 不能跳过 DAO 直接调 MyBatis Mapper**
> - 只有 DAOImpl 可以注入和调用 MyBatis Mapper

> **🔑 名词区分：**
>
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

| 类型           | 规则             | 示例                   |
| -------------- | ---------------- | ---------------------- |
| 类名（后端）   | 大驼峰           | `TokenInterceptor`     |
| 方法名（后端） | 小驼峰           | `getUserById()`        |
| 变量名         | 小驼峰           | `accessKeyId`          |
| 常量（后端）   | 全大写+下划线    | `TOKEN_HEADER`         |
| 实体类         | 表名转大驼峰     | `SysUser` → `sys_user` |
| 前端组件文件   | PascalCase       | `UserList.tsx`         |
| 前端页面目录   | kebab-case       | `user-mgr/`            |
| 前端 Hook      | `useXxx.ts`      | `useAuth.ts`           |
| 前端 Store     | `xxxStore.ts`    | `authStore.ts`         |
| Service 接口   | `XxxService`     | `AuthService`          |
| Service 实现   | `XxxServiceImpl` | `AuthServiceImpl`      |
| DAO 接口       | `XxxDao`         | `UserDao`              |
| DAO 实现       | `XxxDaoImpl`     | `UserDaoImpl`          |
| Mapper         | `XxxMapper`      | `SysUserMapper`        |
| Controller     | `XxxController`  | `AuthController`       |

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

### 4.3 时间字段序列化规范

- **所有接口返回的时间类型字段统一使用字符串格式 `yyyy-MM-dd HH:mm:ss`**
- `LocalDateTime` → `"2026-05-14 18:04:42"`
- `LocalDate` → `"2026-05-14"`
- `LocalTime` → `"18:04:42"`
- 全局配置位于 `JacksonConfig.java`，VO 中禁止单独使用 `@JsonFormat` 覆盖格式
- 前端 VO 类型中时间字段统一标注为 `string` 类型

### 4.4 Controller 返回类型

- **禁止 `R<?>` 通配符返回**，必须精确返回具体类型
- 返回单个对象：`R<LoginVO>`、`R<UserDetailVO>`
- 返回列表：`R<List<MenuVO>>`
- 返回分页：`R<Page<UserVO>>`
- 无返回数据：`R<Void>`

### 4.5 异常处理

- 业务异常：抛 `BusinessException`
- 不要在各层 try-catch，统一由 `GlobalExceptionHandler` 处理

---

## 5. 数据库规范

- 所有表必须包含 `id, create_time, update_time, created_by, updated_by, deleted` 字段
- 所有实体必须继承 `BaseEntity`
- 使用 `@TableLogic` 逻辑删除，禁止物理删除
- 字符集统一 `utf8mb4`，引擎统一 `InnoDB`
- **实体字段有多个固定值时必须提取为枚举**，并在字段注释中用 `@see` 关联枚举类

```java
/** 状态 @see CommonStatusEnum */
private String status;
```

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

| 数据类型       | 存放位置          | 示例               |
| -------------- | ----------------- | ------------------ |
| 登录用户信息   | Zustand authStore | token, nickname    |
| 页面内 UI 状态 | 组件 useState     | modal 开关, 表单值 |
| 服务端数据     | hooks 中管理      | 列表数据, 详情数据 |
| 全局配置       | Zustand store     | 主题, 侧边栏折叠   |

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

| 禁止                                    | 正确做法                    |
| --------------------------------------- | --------------------------- |
| 页面内直接 `import axios`               | 走 `api/` 目录封装的函数    |
| JSX 中写复杂业务逻辑                    | 提取到 hooks 或 utils       |
| JSX 中 `user.phone.slice(0,3) + '****'` | 用 `utils/mask.ts` 脱敏函数 |
| 内联 `style={{}}`                       | 使用 Tailwind CSS class     |
| 组件文件 export 多个组件                | 一个文件一个组件            |
| API 函数无类型标注                      | 参数/返回值必须标注类型     |
| 硬编码路由路径                          | 从路由配置表引用            |
| 密码/身份证等敏感信息 console 输出      | 禁止输出或用脱敏工具        |
| 状态/类型等枚举值直接展示英文 code      | 定义映射表转为中文展示      |

### 8.9 枚举值中文化规范

后端返回的状态、类型等枚举值均为英文 code（如 `PENDING`、`BACHELOR`、`CHSI`），前端展示时必须转为中文。

**规则：**

1. 页面文件顶部定义 `XXX_MAP` 映射表，将英文 code 映射为 `{ label, variant }` 或中文 string
2. 渲染时优先取映射值，未匹配时兜底展示原始值或 `-`
3. 映射表命名：`{枚举含义}_MAP`（如 `STATUS_MAP`、`EDUCATION_LEVEL_MAP`）

**示例：**

```tsx
// 枚举值→{中文标签, Badge样式} 映射
const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary' }> = {
  PENDING: { label: '待审核', variant: 'warning' },
  APPROVED: { label: '已通过', variant: 'success' },
  REJECTED: { label: '已驳回', variant: 'destructive' },
  NOT_CERTIFIED: { label: '未认证', variant: 'secondary' },
  EXPIRED: { label: '已失效', variant: 'secondary' },
};

// 纯中文标签映射
const EDUCATION_LEVEL_MAP: Record<string, string> = {
  BACHELOR: '本科',
  MASTER: '硕士',
  DOCTOR: '博士',
};

// 渲染时使用
const st = STATUS_MAP[record.status] || { label: record.status, variant: 'secondary' as const };
<Badge variant={st.variant}>{st.label}</Badge>
```

---

## 9. 后端禁止事项

| 禁止                               | 正确做法                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------- |
| Controller 直接调用 MyBatis Mapper | 走完整六层：Controller → Service → DAO → MyBatis Mapper                   |
| ServiceImpl 直接调 MyBatis Mapper  | 必须通过 DAO 层，只有 DAOImpl 能注入 MyBatis Mapper                       |
| 各层自己 try-catch                 | 抛异常，交给 GlobalExceptionHandler                                       |
| 硬编码错误码数字                   | 使用 ResultCodeEnum                                                       |
| 密码明文/MD5                       | 使用 BCrypt                                                               |
| 物理删除数据                       | 使用 @TableLogic 逻辑删除                                                 |
| 无注释代码                         | 类/方法/字段必须有注释                                                    |
| 魔法值（字符串字面量）             | 提取为常量或枚举；枚举创建后禁止使用字符串字面量，必须用 `Enum.getCode()` |
| admin/ 调用 miniapp/               | 两个模块只能依赖 common/                                                  |
| 日期用 java.util.Date              | 统一用 LocalDateTime                                                      |
| Controller 返回 `R<?>` 通配符      | 必须返回具体类型，如 `R<LoginVO>`、`R<Void>`                              |
| 实体字段有固定值却不提取枚举       | 提取为 Enum，字段注释用 `@see` 关联枚举类                                 |

> **📌 Jackson ObjectMapper 不是 "Mapper"：** `com.fasterxml.jackson.databind.ObjectMapper` 是 JSON 序列化工具，与 MyBatis 的数据库 Mapper 是完全不同的概念。Service/ServiceImpl 可以使用它做 JSON 操作，不受 "禁止直接调 Mapper" 规则的限制。

---

## 10. 小程序编码规范

### 10.1 导航栏规范（强制）

**所有小程序页面统一使用 `navigationStyle: 'custom'` + `CustomNavBar` 组件**，禁止使用系统默认导航栏。蓝湖 1:1 还原页可使用同等约束的模块壳组件（如 `LanhuNav`、`LanhuTopTabs`），但必须遵守 10.1.1 的原生胶囊与顶部对齐规则。

**原因：**
- 系统导航栏有 0.5px 底部分割线，无法消除
- 系统导航栏背景色无法与页面背景无缝衔接
- 自定义导航栏可实现状态栏区域透明，页面背景延伸到顶

**页面配置：**

```ts
// xxx.config.ts — 所有页面统一
export default {
  navigationStyle: 'custom',
}
```

**CustomNavBar 使用方式：**

```tsx
import CustomNavBar from '@/components/CustomNavBar'

// 子页面（需要返回按钮 + 标题）
<CustomNavBar title="会员中心" bgColor="#1A1A1A" titleColor="#FFFFFF" showBack />

// Tab 页面（仅需状态栏占位，透明无标题）
<CustomNavBar bgColor="transparent" />

// 渐变背景页（透明导航栏，背景可透出）
<CustomNavBar title="选择性别" bgColor="transparent" showBack />
```

**组件 Props：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | `string` | - | 标题文字，不传则不显示 |
| `bgColor` | `string` | `#FFFFFF` | 背景色，渐变页用 `transparent` |
| `showBack` | `boolean` | `false` | 是否显示返回按钮 |
| `titleColor` | `string` | `#000000` | 标题文字颜色 |

> **⚠️ 新页面必须这样配置，Code Review 时以此为门禁。**

### 10.1.1 微信原生胶囊与蓝湖顶部还原规范（强制）

微信小程序右上角的 `...` 和圆点胶囊由客户端原生渲染，业务代码不得再次自绘。

**强制规则：**

- 页面顶部不得写 `•••`、`⊙`、`...`、圆点等模拟原生胶囊的元素。
- 自定义导航/顶部业务 Tab 只负责左侧返回、标题、业务 Tab，不绘制右上原生胶囊。
- 顶部业务 Tab 要给原生胶囊预留右侧安全宽度，当前 750rpx 设计稿统一按 `padding: '86rpx 160rpx 0 25rpx'` 对齐。
- 同一组顶部业务 Tab 必须绑定真实点击行为；未实现项要明确 toast，不允许只画不可点击文字。
- Tab 页面和伪 Tab 页面底部统一使用 `AppTabBar`，不得在页面里再自绘一套底部 TabBar，避免切换时图标上下抖动。

**蓝湖壳组件约定：**

```tsx
// 顶部业务 Tab：不画右侧胶囊，只给原生胶囊留出 160rpx 右侧空间
<LanhuTopTabs active="精选" onTabClick={handleTopTabClick} />

// 子页面标题：只画标题/返回，不画右侧原生胶囊
<LanhuNav title="会员中心" tone="dark" showBack />

// 底部：委托统一 AppTabBar
<LanhuTabBar active="index" />
```

**提交前静态扫描：**

```bash
rg -n "•••|⊙|↺|☷|ProfileTabBar|SELF_DRAWN_TABBAR_ROUTES" miniapp/src
rg -n "LanhuTopTabs active|onTabClick|LanhuTabBar active" miniapp/src/pages
```

第一条除业务文案或图标枚举外不应命中；命中顶部/底部壳代码时必须确认不是模拟原生胶囊或局部 TabBar。

### 10.1.2 小程序上传检查与包体积规范（强制）

微信开发者工具上传检查必须长期满足以下门禁，尤其是蓝湖 1:1 还原后新增大图、背景图、切图时：

| 检查项 | 项目规范 |
|--------|----------|
| 主包尺寸 | 主包不含插件应小于 `1.5M`，主包只放 Tab 页、Tab 图标、全局组件和极少量轻量子页 |
| 未使用 JS | 主包内不得存在主包未使用的 JS/TS 页面或工具文件 |
| 未使用组件 | 主包内不得存在主包未使用的组件 |
| 组件按需注入 | `miniapp/src/app.config.ts` 必须保留 `lazyCodeLoading: 'requiredComponents'`，`project.config.json`、`project.private.config.json` 必须保留 `"lazyCodeLoading": "requiredComponents"` |
| 图片和音频资源 | 主包图片/音频资源总量不得超过 `200K`；当前微信开发者工具“代码包 图片和音频资源”检查也按全上传包口径控制在 `200K` 内；运行时单文件不得超过 `200K` |
| 插件体积 | 不引入超过 `200K` 的大插件；确需引入时必须先评估主包影响 |

**分包规则：**

- Tab 主页面必须留在主包：`pages/index/index`、`pages/community/index`、`pages/chat/index`、`pages/recommend/index`、`pages/profile/index`。
- 非 Tab 重资源页面必须优先放分包，例如登录、认证、精选、会员中心、成家币、测评等页面。
- 分包配置字段必须使用微信官方 `subPackages`，不要写小写 `subpackages`。
- 分包 `root` 不得覆盖包含 Tab 页的目录。比如 `pages/profile` 包含 `pages/profile/index`，`pages/recommend` 包含 `pages/recommend/index`，不能把整个目录设为分包 root。
- 主包可保留少量与 Tab 强相关的轻量子页，例如当前 `pages/profile/edit`、`pages/recommend/post`；新增前必须确认不会推高主包。

**资源规则：**

- 运行时资源放 `miniapp/src/assets`，必须是实际页面会 import 的局部切图或压缩图。
- 蓝湖整屏参考图、未压缩原图、替换前的大图统一放 `miniapp/.lanhu-ref/` 或其子目录，不得留在 `miniapp/src/assets`。
- `miniapp/.lanhu-ref` 必须配置到 `miniapp/project.config.json` 的 `packOptions.ignore`，避免参考图进入上传包。
- 大尺寸照片、插画、背景图优先转为 WebP；新增 WebP 时必须保留 `miniapp/types/global.d.ts` 中的 `declare module '*.webp'`。
- 分包专用图片必须通过 `miniapp/config/index.ts` 的 `imageUrlLoaderOption.name` / `mediaUrlLoaderOption.name` 输出到对应分包目录，不能在 `dist/assets` 留重复副本。
- 页面代码不得引用远程蓝湖 CDN，也不得 import `.lanhu-ref` 下的参考图。
- 不要靠“当前未引用”假设打包器一定剔除资源；不用的 JS、组件、图片应移出 `src` 或删除。

**上传前静态检查：**

```bash
find miniapp/src/assets -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.webp' -o -name '*.mp3' -o -name '*.mp4' \) -size +200k -print
find miniapp/dist -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.webp' -o -name '*.mp3' -o -name '*.mp4' \) -size +200k -print
find miniapp/dist -type f | awk '!/miniapp\/dist\/pages\/(login|verification|featured|membership|coins|assessment)\// {print}' | xargs stat -f '%z' | awk '{s+=$1} END {printf "main-package-mib=%.2f\n", s/1024/1024}'
find miniapp/dist/assets -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.webp' -o -name '*.mp3' -o -name '*.mp4' \) -exec stat -f '%z' {} + | awk '{s+=$1} END {printf "main-assets-kib=%.1f\n", s/1024}'
find miniapp/dist -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.webp' -o -name '*.mp3' -o -name '*.mp4' \) -exec stat -f '%z' {} + | awk '{s+=$1} END {printf "all-assets-kib=%.1f\n", s/1024}'
du -sh miniapp/src/assets
du -sh miniapp/dist miniapp/dist/assets miniapp/dist/pages miniapp/dist/prebundle 2>/dev/null
rg -n "enableSourceMap|prebundle|optimizeMainPackage|imageUrlLoaderOption|lazyCodeLoading|subPackages|packOptions" miniapp/config/index.ts miniapp/src/app.config.ts miniapp/project.config.json miniapp/project.private.config.json
rg -n "subpackages" miniapp/src/app.config.ts miniapp/dist/app.json
rg -n "lanhuapp\\.com|alipic\\.lanhuapp|\\.lanhu-ref" miniapp/src
git diff --check -- miniapp/src/app.config.ts miniapp/project.config.json miniapp/project.private.config.json miniapp/types/global.d.ts miniapp/src/assets
```

前两条必须无输出；主包估算必须低于 `1.5M`，`main-assets-kib` 与 `all-assets-kib` 都必须低于 `200K`。若 `src` 通过但 `dist` 未通过，说明开发者工具读取的是旧编译产物，必须清理 `dist` 或重新生成上传包。

### 10.2 蓝湖设计稿管理规范

**从蓝湖下载的设计稿统一放在 `miniapp/.lanhu-ref/` 目录下**，按功能模块分目录，模仿 `miniapp/.figma-ref/` 的组织方式。

**目录结构：**

```
miniapp/.lanhu-ref/
├── 登录/           # 登录相关设计稿
│   ├── 登录.png
│   ├── 登录-授权.png
│   ├── 登录-性别选择.png
│   ├── 登录-学历.png
│   ├── 登录-地址.png
│   └── 登录-年龄选择.png
├── 觅缘/           # 觅缘（推荐）设计稿
├── 精选/           # 精选设计稿
├── 我的/           # 个人中心设计稿
├── 会员中心/       # 会员中心设计稿
├── 成家币/         # 成家币设计稿
└── 匹配/           # 匹配/管理后台设计稿
```

**下载方式：**

```bash
# 1. 用蓝湖 MCP 列出所有设计稿
mcp__lanhu__lanhu_design --url "<蓝湖项目URL>" --mode list

# 2. 从返回的 CDN URL 批量下载
curl -sL -o "文件名.png" "<CDN URL>"

# 3. 用 analyze 模式获取 HTML/CSS 布局信息
mcp__lanhu__lanhu_design --url "<URL>" --mode analyze --design_names '["设计稿名"]' --include '["html","tokens","layout"]'
```

### 10.3 1:1 设计还原流程

每做一个新页面，按以下步骤执行：

```
Step 1：从蓝湖下载对应设计稿到 .lanhu-ref/
Step 2：用 MCP analyze 模式提取 HTML+CSS+Tokens+Layout
Step 3：对照蓝湖标注逐项翻译为代码
Step 4：用 Tailwind 设计 Token（非任意值）
Step 5：编译验证 → 对照设计稿截图核对
```

> **🔴 改代码前先确保 `npm run dev:weapp` 在运行！** 没有 watch 进程 = 改了不编译 = 开发者工具里看到的永远是旧的。每次修改后等 Webpack 输出 `Compiled successfully` 再去看效果。

**度量转换（蓝湖 750px 坐标系）：**

| 蓝湖标注 | Tailwind 类 | 实际 rpx | 说明 |
|---------|------------|---------|------|
| 12px | `text-xs` | 24rpx | 辅助文字 |
| 14px | `text-sm` | 28rpx | 正文 |
| 16px | `text-base` | 32rpx | 标题 |
| 18px | `text-lg` | 36rpx | 大标题 |
| 24px | `text-xl` | 48rpx | - |

> **关键公式**：蓝湖 750px 设计值 ÷ 2 = CSS px = rpx（designWidth=375）

**颜色 Token（tailwind.config.js 已定义）：**

| Token | 色值 | 用途 |
|-------|------|------|
| `brand-blue` | `#2876FF` | 按钮/高亮/链接 |
| `primary` | `#E54D42` | 品牌红 |
| `text-dark` | `#153060` | 深色标题 |
| `vip-gold` | `#FFC969` | VIP 金色 |

**还原后核对清单：**

- [ ] 背景色/背景图是否与设计稿一致
- [ ] 页面左右边距、区块间距
- [ ] 所有文字的字号、颜色、行高
- [ ] 卡片圆角、内边距
- [ ] 按钮尺寸、圆角、颜色
- [ ] 分割线/边框颜色
- [ ] 底部安全区 `env(safe-area-inset-bottom)`

### 10.4 页面渲染模式选择（强制）

**所有页面默认使用代码渲染**（Text / Image / View + Tailwind），禁止用整张设计稿图片替代。

#### 10.4.1 代码渲染模式（默认，99% 页面）

设计稿只是参考，UI 的每个元素都由代码实现：

```tsx
// ✅ 正确：代码渲染每一个 UI 元素
<View className="bg-white rounded-card p-4">
  <Text className="text-lg font-semibold text-text-dark">标题</Text>
  <Text className="text-sm text-gray-400">副标题</Text>
  <View className="bg-brand-blue rounded-btn" onClick={handleClick}>
    <Text className="text-white">按钮</Text>
  </View>
</View>

// ❌ 错误：把整张设计稿 PNG 当背景图用
<Image className="w-full" src={fullPageDesignPng} mode="widthFix" />
<View style={{ top: '200rpx', height: '50rpx' }} onClick={handleClick} />
```

**原因：**
- 体积大 — 设计稿 PNG 动辄 1MB+，当前上传门禁按主包不含插件小于 `1.5M` 控制
- 不可维护 — 改文案/改颜色必须重新切图
- 不适配 — 不同屏幕比例会拉伸变形
- 不无障碍 — 文字在图片里，屏幕阅读器无法识别

#### 10.4.2 背景图模式（仅限纯插画启动页）

**只有**登录启动页这种纯插画页面（无文字列表、无卡片、无数据）才可以用背景图模式：

| 判断条件 | 渲染模式 |
|---------|---------|
| 页面包含文字列表、卡片、表单、标签 | **必须代码渲染** |
| 页面包含用户数据（头像、昵称、数字等） | **必须代码渲染** |
| 页面是纯插画 + 1 个 CTA 按钮 | 可用背景图 + 透明热区 |

```tsx
// ✅ 唯一允许的背景图场景：纯插画启动页
<View className="relative w-full h-screen">
  <Image className="absolute top-0 left-0 w-full" src={illustBg} mode="widthFix" />
  {/* 背景图提供视觉，代码只放透明热区 */}
  <View className="absolute left-0 right-0" style={{ bottom: '107rpx', height: '98rpx' }}
    onClick={handleClick}
  />
</View>
```

> **⚠️ 凡是含文字列表、卡片、用户数据的页面用背景图模式，Code Review 直接打回。**

### 10.5 小程序目录结构补充

```
miniapp/
├── src/
│   ├── assets/
│   │   ├── icons/          # Tab 图标等小图标
│   │   ├── profile/        # 个人页配图
│   │   └── login/          # 登录页背景图
│   ├── components/
│   │   ├── AppTabBar/       # 自定义底部 TabBar
│   │   ├── CustomNavBar/    # 自定义顶部导航栏（所有页面必用）
│   │   ├── EmptyState/      # 空状态占位组件
│   │   ├── SectionCard/     # 通用卡片容器
│   │   └── UserCard/        # 用户信息卡片
│   ├── hooks/               # 自定义 hooks
│   ├── pages/               # 页面，按功能分目录
│   ├── services/            # Mock 数据 / API 服务
│   ├── stores/              # Zustand stores
│   └── types/               # TypeScript 类型
├── .figma-ref/              # Figma 设计参考图
├── .lanhu-ref/              # 蓝湖设计稿（按模块分目录）
│   ├── 登录/
│   ├── 觅缘/
│   ├── 精选/
│   ├── 我的/
│   ├── 会员中心/
│   ├── 成家币/
│   └── 匹配/
├── tailwind.config.js
└── config/index.ts
```

### 10.6 小程序禁止事项

| 禁止 | 正确做法 |
|------|---------|
| 使用系统默认导航栏 | 统一 `navigationStyle: 'custom'` + `CustomNavBar` |
| 页面 config 忘记设 custom | 每个新页面必须配 `navigationStyle: 'custom'` |
| 背景图+代码双重渲染按钮 | 背景图提供视觉，代码只放透明热区 |
| 用 CSS 渐变/手绘替代设计稿背景 | 从蓝湖切局部背景并压缩为运行资源，整屏原图只放 `.lanhu-ref/` 归档 |
| 设计稿图片散落各处 | 统一放 `.lanhu-ref/` 按模块分目录 |
| 蓝湖标注值直接当 rpx 用 | 蓝湖 750px ÷ 2 = CSS px = rpx |
| 自定义样式覆盖 Tailwind Token | 优先用 `tailwind.config.js` 已定义的颜色/字号/圆角 |
| 整张设计稿 PNG 当页面背景 | 代码渲染每一个 UI 元素，设计稿只是参考（10.4） |
| 内容页用透明热区覆盖背景图 | 文字/卡片/列表必须用 Text/View 代码实现（10.4） |
| 给 PickerView 子元素设 style/className | 原生组件不认 CSS，只能用 maskStyle/indicatorStyle（10.7） |
| style 中用 alignItems/justifyContent 但没写 display: 'flex' | flex 属性必须配 `display: 'flex'`，否则不生效（10.8） |
| flex 容器里用 Text 做布局（换行/居中/间距） | 用 `View` + `textAlign: 'center'`，Text 是原生内联元素不参与 flex（10.8） |
| 改完小程序代码不编译就去开发者工具看效果 | 先 `npm run dev:weapp`（watch 模式），确认 Webpack 编译通过再验收 |

### 10.7 微信原生组件约束（强制）

**PickerView、PickerViewColumn 是微信原生组件**，渲染由客户端原生层控制，不是 WebView。因此：

- **子元素的 `style`、`className`、`fontWeight`、`color` 等 CSS 属性一律不生效**
- 可生效的属性只有 PickerView 自身的 `indicatorStyle` 和 `maskStyle`（均为字符串，非 CSS 对象）
- 选项文字颜色由系统主题决定（浅色模式下选中项为深色、未选中项为灰色）

**正确做法：**

```tsx
// ✅ 通过 indicatorStyle/maskStyle 控制外观，子元素不设任何样式
<PickerView
  value={value}
  onChange={handleChange}
  indicatorStyle="height: 44px; border-radius: 10px; background: rgba(235,240,250,0.9);"
  maskStyle="background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.2) 100%);"
  style={{ width: '100%', height: '220px', background: '#FFFFFF', borderRadius: '16rpx' }}
>
  <PickerViewColumn>
    {items.map((item) => (
      <View key={item} className="flex items-center justify-center h-[44px]">
        <Text>{item}</Text>  {/* 不设任何 style/className */}
      </View>
    ))}
  </PickerViewColumn>
</PickerView>

// ❌ 错误：给原生组件子元素加样式，完全不生效
<Text style={{ color: '#000', fontWeight: 700 }}>{item}</Text>
```

**如果需要完全自定义选择器样式**（自定义颜色、字号、行高、动画），必须放弃 PickerView，用 ScrollView + View 手写选择器组件。

> **⚠️ Code Review 看到 PickerView 子元素带 style/className 就直接打回。**

### 10.8 Text 组件布局陷阱（强制）

**微信小程序的 `<text>` 是原生内联元素，不参与 flex 布局。**  
即使父容器设置了 `display: 'flex'` + `flexDirection: 'column'` + `alignItems: 'center'`，`<text>` 子元素也不会换行、不会居中。

**原因：**
- 微信小程序 `<text>` 是客户端原生组件，渲染层级独立于 WebView
- `<text>` 默认 `display: inline`（内联），多个 `<text>` 会并排显示在一行
- `<text>` 不完全支持 flex 容器上下文，`flexDirection` / `alignItems` 对它无效

**规则：需要布局控制（换行、居中、间距）的文字，必须用 `<View>` 代替 `<Text>`。**

```tsx
// ❌ 错误：Text 在 flex 容器中不换行、不居中
<View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
  <Text>标题</Text>    {/* 不会换行！不会居中！ */}
  <Text>描述</Text>
</View>

// ✅ 正确：用 View + textAlign 替代 flex
<View style={{ textAlign: 'center' }}>
  <View style={{ fontSize: '36rpx', lineHeight: '50rpx' }}>标题</View>
  <View style={{ fontSize: '28rpx', marginTop: '28rpx' }}>描述</View>
</View>
```

**Text vs View 使用决策：**

| 场景 | 用什么 | 原因 |
|------|--------|------|
| 单行纯文字（无布局需求） | `Text` | 轻量，内联即可 |
| 需要换行/居中/间距 | `View` | View 是块级元素，天然换行；`textAlign: 'center'` 可靠居中 |
| 需要 flex 布局 | `View` | View 完整支持 flex 上下文 |
| 长文本自动换行 | `Text`（设置 `space` 等原生属性） | Text 有原生文本处理能力 |

**快速检查清单：**
- 看到两个以上 `Text` 需要上下排列 → 换成 `View`
- 看到 `alignItems: 'center'` 下面有 `Text` → 换成 `View` + `textAlign: 'center'`
- 看到 `display: 'flex'` 下面有 `Text` → 换成 `View`

> **⚠️ Code Review 看到 flex 容器里用 Text 做布局就直接打回。**

### 10.9 Mock 服务规范

小程序在未接后端时可使用 Mock 模式独立运行，所有 API 调用通过全局开关控制。

**全局开关：** `src/constants/config.ts` 中的 `MOCK_ENABLED`

```typescript
/** 全局 Mock 开关：true=使用 Mock 数据不请求后端，false=正常请求后端 */
export const MOCK_ENABLED = true
```

**Mock 实现规则：**

1. 每个 service 函数在入口处检查 `MOCK_ENABLED`，为 `true` 时直接返回 Mock 数据，不发起网络请求
2. Mock 数据必须与后端约定的响应结构完全一致（类型标注复用 `types/` 中的接口）
3. Mock 成功时调用 `Taro.showToast` 给用户反馈，模拟真实交互体验
4. Mock 数据集中定义在 service 文件顶部，标注 `// ==================== Mock 数据 ====================`

**示例（`services/verification.ts`）：**

```typescript
import { MOCK_ENABLED } from '@/constants/config'

export async function submitRealName(data: RealNameSubmitReq): Promise<VerificationStatusVO> {
  if (MOCK_ENABLED) {
    Taro.showToast({ title: '实名认证提交成功', icon: 'success' })
    return { realNameStatus: 'APPROVED', verifyLevel: 1, unlockMateRecommend: true }
  }
  return post<VerificationStatusVO>('/miniapp/verify/real-name', data)
}
```

**对接后端时：** 只需将 `MOCK_ENABLED` 改为 `false`，无需修改任何 service 代码。

**Code Review 检查项：**

- [ ] 新增 API 接口是否已添加 Mock 分支
- [ ] Mock 返回数据结构是否与 `types/` 类型定义一致
- [ ] Mock 模式下是否仍残留真实网络请求调用
