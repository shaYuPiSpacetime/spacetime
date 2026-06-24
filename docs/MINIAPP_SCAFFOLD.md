# Taro 4 小程序脚手架复用指南

> 基于 `miniapp/` 目录抽象，剥离所有业务字段，可直接用于新项目搭建。

---

## 1. 技术选型

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 跨端框架 | **Taro** | 4.x | React 版，编译到微信/支付宝/百度/字节/H5 |
| UI 运行时 | **React** | 18.x | 函数组件 + Hooks |
| 类型系统 | **TypeScript** | 5.x | 全量类型覆盖 |
| 构建工具 | **Webpack 5** | 5.x | 通过 `@tarojs/webpack5-runner` 集成 |
| 原子化 CSS | **Tailwind CSS** | 3.x | 配合 `weapp-tailwindcss` 适配小程序 |
| 组件库 | **VantUI** (Taro 版) | 3.x | `@antmjs/vantui` |
| 状态管理 | **Zustand** | 5.x | 轻量、无 boilerplate |
| CSS 预处理器 | **Sass** | 1.x | 组件级样式 |
| 代码规范 | **ESLint** + **Prettier** | 8.x / 3.x | TypeScript 规则 |

---

## 2. 目录结构（脚手架模板）

```
{{project-name}}/
├── config/
│   ├── index.ts            # Taro 编译配置（核心）
│   ├── dev.ts              # 开发环境覆盖
│   └── prod.ts             # 生产环境覆盖
├── src/
│   ├── app.config.ts       # 全局配置：路由、分包、窗口、TabBar
│   ├── app.tsx             # 应用入口（登录守卫）
│   ├── app.scss            # 全局样式
│   ├── assets/             # 运行时资源（图标、切图）
│   │   └── icons/          # Tab 图标等小图标
│   ├── components/         # 公共组件
│   │   ├── AppTabBar/      # 自定义底部导航
│   │   ├── CustomNavBar/   # 自定义顶部导航（所有页面必用）
│   │   ├── EmptyState/     # 空状态占位
│   │   └── SectionCard/    # 通用卡片容器
│   ├── constants/          # 常量
│   │   ├── config.ts       # API 地址、Token key、Mock 开关
│   │   └── enums.ts        # 业务枚举
│   ├── custom-tab-bar/     # 微信自定义 TabBar 入口
│   ├── hooks/              # 自定义 Hooks
│   │   ├── useAuth.ts      # 登录/鉴权
│   │   └── usePage.ts      # 页面通用逻辑
│   ├── pages/              # 页面，按功能分目录
│   │   └── index/          # 首页示例
│   ├── services/           # API 请求层
│   │   ├── request.ts      # 统一请求封装（自动注入 token、错误处理）
│   │   └── auth.ts         # 按业务模块分文件
│   ├── stores/             # Zustand 全局状态
│   │   ├── appStore.ts     # 应用级状态
│   │   └── authStore.ts    # 登录态
│   ├── types/              # TypeScript 类型定义
│   │   └── api.ts          # 通用响应类型
│   └── utils/              # 工具函数
│       ├── format.ts       # 格式化
│       └── storage.ts      # 本地存储封装
├── types/
│   └── global.d.ts         # 全局类型声明（图片、CSS module 等）
├── .eslintrc.cjs
├── babel.config.js
├── package.json
├── postcss.config.js
├── project.config.json     # 微信开发者工具配置
├── tailwind.config.js
└── tsconfig.json
```

---

## 3. 核心配置文件

### 3.1 `package.json`（关键依赖）

```json
{
  "name": "{{project-name}}",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev:weapp": "npm run build:weapp -- --watch",
    "build:weapp": "taro build --type weapp",
    "dev:h5": "npm run build:h5 -- --watch",
    "build:h5": "taro build --type h5",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write src"
  },
  "dependencies": {
    "@antmjs/vantui": "^3.7.0",
    "@tarojs/components": "4.1.9",
    "@tarojs/helper": "4.1.9",
    "@tarojs/plugin-framework-react": "^4.1.9",
    "@tarojs/plugin-platform-weapp": "4.1.9",
    "@tarojs/plugin-platform-h5": "4.1.9",
    "@tarojs/react": "4.1.9",
    "@tarojs/runtime": "4.1.9",
    "@tarojs/shared": "4.1.9",
    "@tarojs/taro": "4.1.9",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@babel/preset-react": "^7.24.0",
    "@tarojs/cli": "4.1.9",
    "@tarojs/webpack5-runner": "4.1.9",
    "@types/react": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^6.21.0",
    "@typescript-eslint/parser": "^6.21.0",
    "autoprefixer": "^10.5.0",
    "babel-plugin-import": "^1.13.8",
    "babel-preset-taro": "4.1.9",
    "eslint": "^8.57.1",
    "eslint-config-prettier": "^10.1.8",
    "postcss": "^8.5.15",
    "prettier": "^3.8.3",
    "sass": "^1.69.0",
    "tailwindcss": "^3.4.19",
    "typescript": "~5.6.0",
    "weapp-tailwindcss": "^3.7.0",
    "webpack": "5.91.0"
  }
}
```

### 3.2 `config/index.ts`（Taro 编译配置）

```typescript
import path from 'node:path'
import { defineConfig } from '@tarojs/cli'
import { UnifiedWebpackPluginV5 } from 'weapp-tailwindcss/webpack'

const config = {
  projectName: '{{project-name}}',
  date: '{{date}}',
  designWidth: 375,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    375: 2,
    828: 1.81 / 2
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  enableSourceMap: false,

  defineConstants: {
    'process.env.API_BASE_URL': JSON.stringify(
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:8080'
        : 'https://api.{{domain}}.com'
    )
  },

  alias: {
    '@': path.resolve(__dirname, '..', 'src')
  },

  copy: {
    patterns: [],
    options: {}
  },

  framework: 'react',
  compiler: {
    type: 'webpack5' as const,
    prebundle: { enable: false }
  },

  mini: {
    enableSourceMap: false,
    output: { clean: true },
    optimizeMainPackage: { enable: true },
    webpackChain(chain) {
      chain.plugin('weapp-tailwindcss').use(UnifiedWebpackPluginV5, [{ appType: 'taro' }])
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {}
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    }
  },

  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    router: { mode: 'hash' },
    postcss: {
      pxtransform: {
        enable: true,
        config: { baseFontSize: 50 }
      },
      autoprefixer: { enable: true, config: {} },
      cssModules: {
        enable: true,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    }
  }
}

export default defineConfig(config)
```

### 3.3 `config/dev.ts`

```typescript
export default {
  env: { NODE_ENV: '"development"' },
  defineConstants: {},
  mini: {},
  h5: {}
}
```

### 3.4 `config/prod.ts`

```typescript
export default {
  env: { NODE_ENV: '"production"' },
  defineConstants: {},
  mini: {},
  h5: { publicPath: '/' }
}
```

### 3.5 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "module": "commonjs",
    "removeComments": false,
    "preserveConstEnums": true,
    "moduleResolution": "node",
    "experimentalDecorators": true,
    "noImplicitAny": false,
    "allowSyntheticDefaultImports": true,
    "outDir": "lib",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "strictNullChecks": true,
    "sourceMap": true,
    "rootDir": ".",
    "jsx": "react-jsx",
    "allowJs": true,
    "resolveJsonModule": true,
    "typeRoots": ["node_modules/@types"],
    "paths": {
      "@/*": ["./src/*"]
    },
    "baseUrl": "."
  },
  "include": ["src", "types", "config"],
  "compileOnSave": false
}
```

### 3.6 `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',       // 小程序不支持媒体查询 dark mode
  theme: {
    extend: {
      colors: {
        // ===== 按项目自定义品牌色 =====
        primary: '#{{主色}}',
        'primary-light': '#{{主色浅}}',
      },
      fontSize: {
        // designWidth=375, pxtransform: 1px CSS = 2rpx WXSS
        // 设计稿 750px 坐标系 → ÷2 → 实际 CSS px
        xs:   '10px',
        sm:   '12px',
        base: '14px',
        lg:   '16px',
        xl:   '18px',
        '2xl': '24px',
      },
      borderRadius: {
        card: '12px',
        btn:  '24px',
      },
    },
  },
  corePlugins: {
    preflight: false,       // 小程序不支持 preflight
  },
  plugins: [],
}
```

### 3.7 `babel.config.js`

```javascript
module.exports = {
  presets: [
    ['taro', {
      framework: 'react',
      ts: true
    }]
  ],
  plugins: [
    ['import', {
      libraryName: '@antmjs/vantui',
      libraryDirectory: 'es',
      style: true
    }, '@antmjs/vantui']
  ]
}
```

### 3.8 `postcss.config.js`

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 3.9 `.eslintrc.cjs`

```javascript
module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  settings: {
    react: { version: '18' },
  },
}
```

### 3.10 `types/global.d.ts`

```typescript
/// <reference types="@tarojs/taro" />

declare module '*.png'
declare module '*.gif'
declare module '*.jpg'
declare module '*.jpeg'
declare module '*.webp'
declare module '*.svg'
declare module '*.scss'
declare module '*.sass'
declare module '*.css'

declare namespace NodeJS {
  interface ProcessEnv {
    API_BASE_URL: string
    NODE_ENV: 'development' | 'production'
  }
}
```

### 3.11 `project.config.json`（微信开发者工具）

```json
{
  "miniprogramRoot": "dist/",
  "projectname": "{{project-name}}",
  "description": "{{项目描述}}",
  "appid": "{{wx-appid}}",
  "setting": {
    "urlCheck": false,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "minified": true,
    "coverView": true,
    "nodeModules": true,
    "checkInvalidKey": true,
    "checkSiteMap": true,
    "uploadWithSourceMap": false,
    "compileHotReLoad": false,
    "lazyCodeLoading": "requiredComponents",
    "useMultiFrameRuntime": true,
    "minifyWXSS": true,
    "minifyWXML": true,
    "disableSWC": true,
    "condition": false
  },
  "compileType": "miniprogram",
  "libVersion": "3.6.0",
  "packOptions": {
    "ignore": [
      { "type": "folder", "value": ".lanhu-ref" },
      { "type": "suffix", "value": ".map" }
    ],
    "include": []
  },
  "editorSetting": {
    "tabIndent": "insertSpaces",
    "tabSize": 2
  }
}
```

---

## 4. 核心代码模板

### 4.1 `src/constants/config.ts` — 全局配置

```typescript
/** API 基础地址 */
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080'

/** Token 本地存储 key */
export const TOKEN_KEY = 'token'

/** 用户信息本地存储 key */
export const USER_INFO_KEY = 'userInfo'

/** Token 请求头字段名，与后端保持一致 */
export const TOKEN_HEADER = 'X-Token'

/** 全局 Mock 开关：true=使用 Mock 数据不请求后端，false=正常请求后端 */
export const MOCK_ENABLED = true
```

### 4.2 `src/services/request.ts` — 统一请求封装

```typescript
import Taro from '@tarojs/taro'
import { API_BASE_URL, TOKEN_HEADER, TOKEN_KEY } from '@/constants/config'

/** 请求方法 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** 请求选项 */
interface RequestOptions {
  url: string
  method?: HttpMethod
  data?: Record<string, unknown>
  header?: Record<string, string>
}

/** 后端统一响应体 */
interface R<T> {
  code: number
  msg: string
  data: T
}

/**
 * 统一请求封装
 * 自动注入 token、统一错误处理
 */
export async function request<T>(options: RequestOptions): Promise<T> {
  const token = Taro.getStorageSync(TOKEN_KEY) || ''

  const res = await Taro.request<R<T>>({
    url: API_BASE_URL + options.url,
    method: options.method || 'GET',
    data: options.data,
    header: {
      [TOKEN_HEADER]: token,
      'Content-Type': 'application/json',
      ...options.header
    }
  })

  const { code, msg, data } = res.data

  if (code === 401) {
    Taro.removeStorageSync(TOKEN_KEY)
    Taro.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
    return Promise.reject(new Error('UNAUTHORIZED'))
  }

  if (code !== 200) {
    Taro.showToast({ title: msg || '请求失败', icon: 'none' })
    return Promise.reject(new Error(msg))
  }

  return data
}

export function get<T>(url: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: 'GET', data })
}

export function post<T>(url: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: 'POST', data })
}

export function put<T>(url: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: 'PUT', data })
}

export function del<T>(url: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>({ url, method: 'DELETE', data })
}
```

### 4.3 `src/stores/authStore.ts` — 登录态管理

```typescript
import { create } from 'zustand'
import Taro from '@tarojs/taro'
import { TOKEN_KEY, USER_INFO_KEY } from '@/constants/config'

interface AuthState {
  token: string
  userId: number | null
  nickname: string
  avatar: string
  isLoggedIn: boolean

  setLogin: (token: string, userId: number, nickname: string, avatar: string) => void
  logout: () => void
  checkLogin: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: '',
  userId: null,
  nickname: '',
  avatar: '',
  isLoggedIn: false,

  /** 保存登录信息 */
  setLogin: (token, userId, nickname, avatar) => {
    Taro.setStorageSync(TOKEN_KEY, token)
    Taro.setStorageSync(USER_INFO_KEY, { userId, nickname, avatar })
    set({ token, userId, nickname, avatar, isLoggedIn: true })
  },

  /** 退出登录 */
  logout: () => {
    Taro.removeStorageSync(TOKEN_KEY)
    Taro.removeStorageSync(USER_INFO_KEY)
    set({ token: '', userId: null, nickname: '', avatar: '', isLoggedIn: false })
  },

  /** 检查本地登录态 */
  checkLogin: () => {
    const token = Taro.getStorageSync(TOKEN_KEY) || ''
    if (token) {
      const userInfo = Taro.getStorageSync(USER_INFO_KEY)
      if (userInfo) {
        set({ token, ...userInfo, isLoggedIn: true })
      }
    }
  }
}))
```

### 4.4 `src/stores/appStore.ts` — 应用级状态

```typescript
import { create } from 'zustand'

interface AppState {
  loading: boolean
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  loading: false,
  setLoading: (loading) => set({ loading })
}))
```

### 4.5 `src/app.tsx` — 应用入口（含登录守卫）

```typescript
import { PropsWithChildren } from 'react'
import Taro, { useLaunch } from '@tarojs/taro'
import { useAuthStore } from './stores/authStore'
import { MOCK_ENABLED, TOKEN_KEY } from './constants/config'

import './app.scss'

function App({ children }: PropsWithChildren<object>) {
  const { checkLogin } = useAuthStore()

  useLaunch(() => {
    if (MOCK_ENABLED) {
      // Mock 阶段不做启动未登录拦截
      checkLogin()
      return
    }

    const token = Taro.getStorageSync(TOKEN_KEY)
    if (!token) {
      Taro.reLaunch({ url: '/pages/login/index' })
    } else {
      checkLogin()
    }
  })

  return children
}

export default App
```

### 4.6 `src/app.config.ts` — 全局路由配置

```typescript
export default {
  lazyCodeLoading: 'requiredComponents',
  pages: [
    // ===== 主包页面（Tab 页 + 轻量子页） =====
    'pages/index/index',
  ],
  subPackages: [
    // ===== 分包（重资源页面放这里） =====
    // {
    //   root: 'pages/sub1',
    //   pages: ['index']
    // },
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '{{应用名称}}',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    custom: true,           // 使用自定义 TabBar
    color: '#999999',
    selectedColor: '#{{主色}}',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      // {
      //   pagePath: 'pages/index/index',
      //   text: '首页',
      //   iconPath: 'assets/icons/tab-home.png',
      //   selectedIconPath: 'assets/icons/tab-home-active.png'
      // },
    ]
  }
}
```

---

## 5. 数据流架构

```
页面 (pages/*)
  → Hooks (hooks/use*.ts)          ← 业务逻辑 + 数据请求
    → Services (services/*.ts)     ← API 请求（基于 request.ts 封装）
      → 后端 API
    → Stores (stores/*.ts)         ← Zustand 全局状态（auth, app）
```

**分层约束：**

| 层 | 职责 | 禁止 |
|----|------|------|
| `pages/` | 纯 UI 拼装 + 调 Hook | 不写业务逻辑、不直接调 `request` |
| `hooks/` | 业务逻辑 + 状态管理 | - |
| `services/` | API 请求封装 | 页面不直接 import |
| `stores/` | 全局共享状态 | 不放页面内 UI 状态 |

---

## 6. 编码规范（关键提取）

### 6.1 导航栏：统一 `navigationStyle: 'custom'` + `CustomNavBar`

所有页面必须使用自定义导航栏，禁止系统默认导航栏。

```typescript
// xxx.config.ts
export default {
  navigationStyle: 'custom',
}
```

```tsx
// 子页面（有返回按钮 + 标题）
<CustomNavBar title="页面标题" bgColor="#FFFFFF" showBack />

// Tab 页面（透明、无标题）
<CustomNavBar bgColor="transparent" />
```

### 6.2 样式：Tailwind 优先

- 统一使用 Tailwind CSS class，不写内联 `style`
- 复用样式用模板字符串合并 class
- 禁止创建 `.module.css` 文件（小程序场景）

### 6.3 页面渲染模式：代码渲染优先

所有页面默认用 Text/Image/View + Tailwind 代码渲染，**禁止用整张设计稿图片替代页面**。

唯一例外：纯插画启动页可用背景图 + 透明热区。

### 6.4 设计稿换算

`designWidth = 375`，蓝湖 750px 坐标系值 ÷ 2 = CSS px = rpx。

### 6.5 状态管理分工

| 数据类型 | 存放位置 |
|----------|----------|
| 登录用户信息 | Zustand `authStore` |
| 页面内 UI 状态 | 组件 `useState` |
| 服务端数据 | hooks 中管理 |
| 全局配置 | Zustand store |

### 6.6 命名规范

| 类型 | 规则 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `UserCard.tsx` |
| 页面目录 | kebab-case | `user-center/` |
| Hook | `useXxx.ts` | `useAuth.ts` |
| Store | `xxxStore.ts` | `authStore.ts` |
| Service | `xxx.ts` | `auth.ts` |
| 类型文件 | `xxx.ts` | `user.ts` |

### 6.7 Mock 服务模式

```typescript
// services/xxx.ts
import { MOCK_ENABLED } from '@/constants/config'

export async function getData(): Promise<DataType> {
  if (MOCK_ENABLED) {
    Taro.showToast({ title: '获取成功', icon: 'success' })
    return { /* Mock 数据 */ }
  }
  return get<DataType>('/api/path')
}
```

对接后端时只需将 `MOCK_ENABLED` 改为 `false`。

---

## 7. 快速启动

```bash
# 1. 复制本脚手架文件到新项目目录
# 2. 修改 package.json 中的 name
# 3. 修改 project.config.json 中的 appid、projectname
# 4. 修改 config/index.ts 中的 projectName、API_BASE_URL
# 5. 修改 tailwind.config.js 中的品牌色
# 6. 修改 src/app.config.ts 中的应用名称

# 7. 安装依赖
npm install

# 8. 启动开发
npm run dev:weapp

# 9. 打开微信开发者工具 → 导入项目 → 选择 dist/ 目录
```

---

## 8. 包体积门禁（微信小程序上传检查）

| 检查项 | 阈值 |
|--------|------|
| 主包尺寸 | < 1.5M |
| 图片/音频资源总量 | < 200K |
| 单文件运行时大小 | < 200K |
| 组件按需注入 | `lazyCodeLoading: 'requiredComponents'` 必须开启 |

**分包规则：**
- Tab 主页面留在主包
- 非 Tab 重资源页面放分包（`subPackages`）
- 切图统一转 WebP 后再 import，原图不进 `src/assets`

---

## 9. 与后端接口约定

| 约定 | 值 |
|------|-----|
| 成功 code | `200` |
| 未登录 code | `401` |
| Token 传递 | 请求头 `X-Token` |
| Token 存储 | `Taro.setStorageSync('token', value)` |
| 响应格式 | `{ code: number, msg: string, data: T }` |
| 时间格式 | `yyyy-MM-dd HH:mm:ss`（字符串） |
