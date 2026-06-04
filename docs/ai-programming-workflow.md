# AI 编程工作流

> 适用项目：Spacetime 成家立业 | 最后更新：2026-06-04

---

## 总览

```
需求输入 → 方案设计 → 编码实现 → 自检验证 → Code Review → 提交
   │            │           │           │            │          │
   └─ 理清边界  └─ 出方案   └─ 写代码   └─ 跑编译   └─ 逐条查  └─ git commit
```

---

## 阶段一：需求分析

**触发条件**：接到新需求，但边界不清、不知道怎么实现

**操作步骤**：

```
1. 说清楚"用户是谁、要做什么、做完是什么样"
2. 如果需求模糊 → 直接问，不要猜
3. 列出验收条件（做完后怎么判断对/错）
```

**可用 Skill**：`superpowers:brainstorming`

**要点**：
- 一句话能说清需求才算理解到位
- 不确定的事问清楚再动手，别先写代码再返工

---

## 阶段二：方案设计

**触发条件**：需求已明确，需要落地方案

**操作步骤**：

```
1. 确定改动范围：涉及哪些文件、哪个层（Controller / Service / 页面）
2. 画数据流：数据从哪来、经过哪些层、最终落到哪
3. 出实施计划：分几个步骤、每个步骤做什么
4. 列出风险点：哪些地方容易出错
```

**可用 Skill**：`superpowers:writing-plans`

**小程序 UI 还原额外步骤**：

```
1. 用蓝湖 MCP 列出设计稿    → mcp__lanhu__lanhu_design mode=list
2. 下载设计稿到 .lanhu-ref   → curl CDN URL
3. 用 MCP 提取 HTML/CSS     → mcp__lanhu__lanhu_design mode=analyze include=["html","tokens","layout"]
4. 翻译蓝湖标注为代码规格     → 蓝湖 750px ÷ 2 = CSS px = rpx
5. 对照 tailwind.config.js   → 能用 Token 的不用任意值
```

**输出物**：
- 设计分析文档（可选，复杂需求时写）
- 实施步骤清单（必须，至少心中有数）

---

## 阶段三：编码实现

**触发条件**：方案已经清晰，开始写代码

### 3.1 后端开发

```
Controller  → 接收请求、参数校验、调用 Service
Service     → 业务逻辑接口
ServiceImpl → 业务逻辑实现，调用 DAO
DAO         → 数据访问接口
DAOImpl     → 数据访问实现，调用 MyBatis Mapper
Mapper      → MyBatis-Plus BaseMapper（数据库映射层）

⚠️ 每一层只调紧邻下一层，严禁跨层
```

### 3.2 前端开发（管理后台）

```
页面组件 → 只拼 UI + 调 Hook
Hook     → 封装业务逻辑 + API 调用
API 层   → axios 请求封装，按模块分文件
Store    → Zustand 全局状态
```

### 3.3 小程序开发

```
1. 页面 config  → navigationStyle: 'custom'（强制！）
2. 页面顶部     → <CustomNavBar />（必须有！）
3. 样式         → Tailwind class 优先，style={{}} 仅做动态值
4. 背景图       → Image mode="widthFix"，代码只放透明热区
5. 颜色/字号    → 用 tailwind.config.js 已定义的 Token
```

#### 3.3.1 多 Agent 并行 UI 还原（批量页面）

当需要同时还原多个页面时，使用 Workflow 并行调度：

```
1. 蓝湖 MCP 批量 analyze  →  获取所有目标设计稿的 HTML+CSS+Tokens
2. 分类设计模式           →  image 模式（整张背景图）vs HTML 模式（可提取元素）
3. Workflow 并行派发      →  每个页面一个 agent，同时实现
4. 统一编译验证           →  npx taro build --type weapp
```

**调度脚本模板**：

```javascript
const designs = {
  页面A: { page: 'pages/a/index.tsx', design: '设计稿名', mode: 'html', specs: '...' },
  页面B: { page: 'pages/b/index.tsx', design: '设计稿名', mode: 'image', specs: '...' },
}

// Phase 1: 分析
phase('Analyze')
// 蓝湖 MCP 批量获取设计数据

// Phase 2: 并行实现
phase('Implement')
await parallel(Object.entries(designs).map(([name, d]) => async () => {
  await agent(/* 实现 prompt */, { label: `restore:${name}` })
}))

// Phase 3: 验证
phase('Verify')
await agent('cd miniapp && npx taro build --type weapp')
```

**设计模式判断**：
- `image` 模式：蓝湖 analyze 返回 fallback_mode=sketch，设计是一张整图 → 背景图 + 透明热区
- `html` 模式：蓝湖 analyze 返回完整 HTML 布局 → 精确提取尺寸/颜色/字体实现

**可用 Skill**：`superpowers:executing-plans`、`superpowers:test-driven-development`

**编码同步检查项**：
- [ ] 类/方法/字段注释是否完整
- [ ] 是否符合六层架构分层
- [ ] 枚举值是否提取为 Enum
- [ ] 小程序：config 是否设了 `navigationStyle: 'custom'`
- [ ] 小程序：是否用 `CustomNavBar` 替代了系统导航栏
- [ ] 设计稿还原：度量值是否正确转换（蓝湖÷2）

---

## 阶段四：自检验证

**触发条件**：编码完成，准备提交前

**操作步骤**：

```
1. 编译检查 → 无 error（warning 分类处理）
2. 功能检查 → 对照验收条件逐条过
3. 规范检查 → 对照 TEAM_STANDARDS.md 自查
```

**可用 Skill**：`superpowers:verification-before-completion`

**具体命令**：

```bash
# 后端编译
cd backend && mvn compile

# 前端编译
cd frontend && npm run build

# 小程序编译
cd miniapp && npx taro build --type weapp
```

**禁止事项自查清单**（见 TEAM_STANDARDS.md 第 8.8、9、10.6 节）

---

## 阶段五：Code Review

**触发条件**：自检通过，准备提交/PR

**操作步骤**：

```
1. 自查 diff → 有没有不该改的文件、调试代码残留
2. 对照 TEAM_STANDARDS.md → 逐条检查是否合规
3. 通用 Review → 逻辑是否正确、边界是否覆盖
```

**可用 Skill**：`superpowers:requesting-code-review`

**常见 Review 关注点**：
- 跨层调用（Controller 直接调 DAO / ServiceImpl 直接调 Mapper）
- 导航栏配置遗漏
- 设计稿还原偏差
- 魔法值未提取为枚举
- 注释缺失
- 背景图+代码双重渲染

---

## 阶段六：提交

**触发条件**：Review 通过

**操作步骤**：

```
1. 确认在正确的分支上
2. git add 相关文件
3. git commit -m "<type>: <简短描述>"
4. 推 PR（如需要）
```

**可用 Skill**：`git-utils`

**Commit 格式**：`<type>: <简短描述>`

---

## 快速参考卡片

### 蓝湖 MCP 工具

| 操作 | 命令 |
|------|------|
| 列出所有设计稿 | `lanhu_design mode=list` |
| 分析设计稿 HTML/CSS | `lanhu_design mode=analyze design_names=["名称"] include=["html","tokens","layout"]` |
| 提取切图资源 | `lanhu_design mode=slices design_names=["名称"]` |
| 分析 PRD 页面 | `lanhu_page mode=analyze page_names=["页面名"]` |

### 小程序文件创建清单

新页面必须包含：
```
pages/xxx/
├── index.config.ts    ← navigationStyle: 'custom'
├── index.tsx          ← import CustomNavBar + <CustomNavBar ... />
└── （业务文件）
```

### 度量转换速查

```
蓝湖 750px 标注 ÷ 2 = CSS px = rpx

示例：
  蓝湖 36px 字号 → CSS 18px → text-lg (18px)
  蓝湖 20px 圆角 → CSS 10px → rounded-[10px]
  蓝湖 #2876FF   → text-brand-blue
```

### 小程序禁止事项速查

| ❌ 禁止 | ✅ 必须 |
|---------|--------|
| 系统默认导航栏 | `navigationStyle: 'custom'` + `CustomNavBar` |
| CSS 渐变替代设计稿背景 | 下载设计稿原图 |
| 背景图+代码双重渲染 | 背景图提供视觉，代码放透明热区 |
| 蓝湖标注直接当 rpx | 蓝湖值 ÷ 2 = rpx |
| 任意色值 | 用 tailwind.config.js Token |
