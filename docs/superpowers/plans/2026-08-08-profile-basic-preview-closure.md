# 基本资料与主页预览闭环实施计划

> **执行要求：** 按测试驱动方式逐项落地，每个阶段先看到失败用例，再修改实现，最后执行完整验证。

**目标：** 将现居地和家乡统一为省市两级，保证编辑资料展示中文地区；修正语音删除确认、关于我动态条数，以及主页预览的语音入口、认证文案和单行展示。

**实现边界：** 保留数据库现有区县列以兼容历史数据，但移动端字段配置、选择器和保存请求不再消费区县；后台保存基础资料时清空现居/家乡历史区县。基础资料响应新增省市中文标签，编辑页只消费中文标签，不再回退展示地区编码。

---

## 任务 1：用例先行锁定产品口径

**文件：**
- 修改：`miniapp/scripts/test-profile-edit-closure.cjs`
- 修改：`backend/src/test/java/com/spacetime/miniapp/service/impl/ProfileServiceImplTest.java`
- 修改：`backend/src/test/java/com/spacetime/common/service/Prd01RuntimeConfigResolverTest.java`

1. 将现居地测试从省市区改成省市两级，并断言两个历史区县字段都被过滤、清空。
2. 增加关于我“无填写默认三条、有填写按实际条数”的测试。
3. 增加主页预览无播放入口、固定“三重认证”、副文案单行完整展示的静态断言。
4. 增加后台不再要求现居区县、保存时清空历史区县、响应返回中文标签的测试。
5. 运行测试并确认新增断言先失败。

## 任务 2：实现省市两级与中文地区

**文件：**
- 修改：`miniapp/src/domain/basicProfileRegion.ts`
- 修改：`miniapp/src/pages/verification/components/BasicInfoCard.tsx`
- 修改：`miniapp/src/pages/verification/components/LanhuPickerSheet.tsx`
- 修改：`miniapp/src/types/prd01.ts`
- 修改：`backend/src/main/java/com/spacetime/miniapp/service/impl/Prd01FieldConfigResolver.java`
- 修改：`backend/src/main/java/com/spacetime/common/service/Prd01RuntimeConfigResolver.java`
- 修改：`backend/src/main/java/com/spacetime/miniapp/service/impl/ProfileServiceImpl.java`
- 修改：`backend/src/main/java/com/spacetime/miniapp/dto/response/BasicProfileVO.java`

1. 同时退役现居区县和家乡区县配置。
2. 地区选择器固定双列，确认只回传省、市，保存载荷移除区县。
3. 后台只校验省市层级并清空两个区县历史值，不再追加条件必填。
4. 基础资料响应补充省市中文标签，供编辑页与主页预览消费。

## 任务 3：修复编辑资料动态展示

**文件：**
- 修改：`miniapp/src/domain/profileAboutPresentation.ts`
- 修改：`miniapp/src/pages/profile/edit.tsx`

1. 基础资料第二行使用现居城市中文和家乡城市/省份中文拼接“人”。
2. 删除语音确认框改为“取消 / 确认”。
3. 关于我无任何填写时展示默认三条；存在填写时仅展示全部已填写条目，条数与真实填写数一致。

## 任务 4：修复主页预览头图信息

**文件：**
- 修改：`miniapp/src/pages/profile/components/ProfilePreviewPage.tsx`

1. 移除头图语音播放按钮和播放逻辑。
2. 认证徽标固定显示“三重认证”。
3. 昵称下方目标/状态文案改为自适应宽度、禁止换行和截断。

## 任务 5：验证闭环

1. 执行 `node --test miniapp/scripts/test-profile-edit-closure.cjs`。
2. 执行后台相关单测。
3. 执行 `npm --prefix miniapp run build:weapp`。
4. 复核 `git diff`，只保留本次范围内修改并记录验证结果。
