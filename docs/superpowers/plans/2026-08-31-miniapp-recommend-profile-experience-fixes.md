# 小程序推荐与资料预览体验修复实施计划

> **给执行代理：** 必须逐项按 `test-driven-development` 的红—绿—重构流程实施，并在完成声明前使用 `verification-before-completion`。步骤使用复选框跟踪。

**目标：** 修复小程序理想型入口、推荐心动、偏好城市、标签选择、编辑资料布局及主页预览的七项体验问题。

**架构：** 保持现有 Taro 页面与服务边界不变；理想型入口复用真实筛选记录接口，城市选择复用既有省市树，资料预览继续由共享 `ProfilePreviewPage` 承载。交互规则尽量下沉为可测试的纯函数，页面只负责状态和导航。

**技术栈：** Taro 4、React 18、TypeScript、Node.js `node:test`、现有小程序构建门禁。

## 全局约束

- 仅修改 `miniapp/` 与本实施计划，不改后端接口和用户已有的 `bobo-todo.md`。
- 所有用户可见文案和代码注释使用中文。
- 真实交互继续使用 Taro 组件，不增加截图控件、透明热区或本地非 Tab 图标。
- MBTI 分类 code 按后端稳定值 `MBTI` 判断；其余标签仍受总数 16 个限制。
- 个人动态读取现有 `/miniapp/community/me/posts`，无数据或读取失败时不渲染动态模块。
- 本次不自动创建分支、提交或推送。

---

### 任务 1：建立七项回归门禁

**文件：**

- 新建：`miniapp/scripts/test-0831-miniapp-experience-fixes.cjs`
- 修改：`miniapp/package.json`

**接口：**

- 消费：现有页面源码与 `profilePreviewVisibility.ts`。
- 产出：覆盖七项验收条件的可重复 Node 测试，并接入 `predev:weapp`、`prebuild:weapp`。

- [x] **步骤 1：先写失败测试**

  测试分别断言：最新筛选快照直达结果、无记录落到理想型落地页、居住地为省市两列联动、心动成功调用无“跳过”副作用的下一位逻辑、MBTI 替换同组旧值、编辑页无固定超长高度、照片不过度截断、个人动态有数据才渲染。

- [x] **步骤 2：运行并确认 RED**

  运行：`node --test scripts/test-0831-miniapp-experience-fixes.cjs`

  预期：测试因当前单列城市、固定高度、四张截断等真实缺陷失败，而不是语法或夹具错误。

### 任务 2：修复理想型入口与心动后切换

**文件：**

- 修改：`miniapp/src/pages/recommend/index.tsx`
- 新建：`miniapp/src/domain/recommendCandidateQueue.ts`
- 复用：`miniapp/src/services/ideal.ts`

**接口：**

- 消费：`getIdealSearchRecords()` 返回按创建时间倒序的 `items`。
- 产出：`openIdealTab()`；有最新 `status=active` 的 `snapshotNo` 时导航到 `/pages/prd08/ideal/results/index`，无有效记录时显示现有理想型落地页。

- [x] **步骤 1：接入最新筛选快照判断**

  ```ts
  const latest = (await getIdealSearchRecords()).items?.find(item => item.status === 'active')
  if (latest?.snapshotNo) {
    await Taro.navigateTo({
      url: `/pages/prd08/ideal/results/index?snapshotNo=${encodeURIComponent(latest.snapshotNo)}`,
    })
    return
  }
  setActiveTab('ideal')
  ```

- [x] **步骤 2：拆分“记录跳过”和“展示下一位”**

  `advanceCandidate()` 先写跳过日志再调用 `showNextCandidate()`；首次送出心动成功后直接调用 `showNextCandidate()`，不得额外写跳过日志。取消已有心动时保留当前卡片。

- [x] **步骤 3：运行定向测试并确认 GREEN**

  运行：`node --test scripts/test-0831-miniapp-experience-fixes.cjs scripts/test-prd08-recommend-ideal-closure.cjs`

### 任务 3：把偏好居住地改为省市两级联动

**文件：**

- 修改：`miniapp/src/pages/prd08/recommend/preference/index.tsx`
- 复用：`miniapp/src/domain/twoLevelRegionWheel.ts`

**接口：**

- 消费：`RegionTreeOption[]` 省市树。
- 产出：`Picker mode="multiSelector"` 的两列范围；省份变化时城市索引重置为 0，确认后仍保存城市 code。

- [x] **步骤 1：增加受控省市索引**

  ```ts
  const [regionSelection, setRegionSelection] = useState<TwoLevelRegionSelection>([0, 0])
  const selectedProvince = cities[regionSelection[0]]
  const cityRange = selectedProvince?.children || []
  ```

- [x] **步骤 2：替换拍平的单列 Picker**

  省列变化时执行 `[provinceIndex, 0]`，市列变化时使用 `normalizeTwoLevelRegionSelection` 收敛索引；最终继续调用现有 `addCity` 和 VIP 城市数量门禁。

- [x] **步骤 3：运行定向测试并确认 GREEN**

  运行：`node --test scripts/test-0831-miniapp-experience-fixes.cjs`

### 任务 4：实现 MBTI 分类单选

**文件：**

- 新建：`miniapp/src/domain/profileTagSelection.ts`
- 修改：`miniapp/src/pages/profile-edit/tags.tsx`

**接口：**

- 产出：

  ```ts
  toggleProfileTagSelection(
    selectedCodes: string[],
    optionCode: string,
    categoryCode: string,
    categoryOptionCodes: string[],
    maxCount?: number,
  ): { codes: string[]; limitExceeded: boolean }
  ```

- [x] **步骤 1：实现单一行为纯函数**

  已选项再次点击时取消；新增 MBTI 时先移除该分类其他 code；其他分类维持多选；超过 16 个时返回原值和 `limitExceeded: true`。

- [x] **步骤 2：页面统一调用纯函数**

  无论用户位于“全部”还是“MBTI”Tab，都从 `profileTagGroups` 找到真实分类和同组 code，避免只按当前 Tab 判断。

- [x] **步骤 3：运行定向测试并确认 GREEN**

  运行：`node --test scripts/test-0831-miniapp-experience-fixes.cjs scripts/test-profile-edit-closure.cjs`

### 任务 5：收口编辑页与补齐预览内容

**文件：**

- 修改：`miniapp/src/pages/profile/edit.tsx`
- 修改：`miniapp/src/domain/profilePreviewVisibility.ts`
- 修改：`miniapp/src/pages/profile/components/ProfilePreviewPage.tsx`
- 新建：`miniapp/src/pages/profile/components/ProfileCommunityPostsSection.tsx`
- 修改：`miniapp/scripts/validate-profile-preview-lanhu.mjs`
- 修改：`miniapp/scripts/test-profile-edit-closure.cjs`

**接口：**

- 消费：`getMyCommunityPosts(1, 20)`。
- 产出：预览展示全部非空相册 URL；`ProfilePreviewModel.communityPosts`；动态列表为空时组件返回 `null`。

- [x] **步骤 1：取消四张照片截断**

  ```ts
  photos: input.photos.map(normalizeText).filter(Boolean)
  ```

- [x] **步骤 2：加载本人动态并注入共享预览**

  动态请求独立于资料主请求；失败只回落为空数组，不阻断资料编辑。仅展示已发布内容，动态卡片显示正文、最多三张缩略图和时间，并可进入现有动态详情页。

- [x] **步骤 3：移除编辑页固定超长高度**

  删除 `minHeight: '5812rpx'`，容器高度跟随真实内容；底部只保留安全区与紧凑呼吸空间。

- [x] **步骤 4：同步既有视觉门禁**

  把“最多四张”旧断言改成“保留全部有效照片”，增加动态显隐和编辑页自然高度断言。

### 任务 6：完整验证与差异复核

**文件：**

- 只读复核：`git diff -- miniapp docs/superpowers/plans/2026-08-31-miniapp-recommend-profile-experience-fixes.md`

- [x] **步骤 1：运行定向回归**

  ```bash
  npm --prefix miniapp exec -- node --test scripts/test-0831-miniapp-experience-fixes.cjs scripts/test-profile-edit-closure.cjs scripts/test-prd08-recommend-ideal-closure.cjs
  ```

- [x] **步骤 2：运行静态门禁和 lint**

  ```bash
  node miniapp/scripts/validate-profile-preview-lanhu.mjs
  npm --prefix miniapp run lint
  ```

- [x] **步骤 3：运行完整微信小程序构建**

  ```bash
  npm --prefix miniapp run build:weapp
  ```

- [x] **步骤 4：逐条核对七项验收条件**

  检查测试输出、构建退出码、工作区差异和子代理只读复核；如环境导致运行态截图不可执行，明确报告限制，不把静态检查描述为真机验收。

## 执行结果

- 专项回归：`test:0831-fixes` 7/7 通过；资料编辑与 PRD-08 既有定向回归 53/53 通过。
- 静态检查：本轮改动文件 ESLint 与 `git diff --check` 通过；全量 ESLint 仍有两处本轮未改文件的既有全角空格错误和一个既有未使用类型警告。
- 构建：`npm --prefix miniapp run build:weapp` 通过，页面注册、无开发 Token 与包体门禁全部通过。
- 运行态限制：本轮未连接微信开发者工具或真机账号，未把静态门禁与构建结果表述为真机截图验收。
