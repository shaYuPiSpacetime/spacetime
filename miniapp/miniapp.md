日常开发流程：
 cd miniapp
 npm run dev:weapp    # 编译 + watch，改代码自动重新编译
 # 然后在微信开发者工具中查看效果

## Mock 模式

项目内置全局 Mock 开关，在未接后端时可独立运行小程序完成所有页面流程。

**开关位置：** `src/constants/config.ts`

```typescript
/** 全局 Mock 开关：true=使用 Mock 数据不请求后端，false=正常请求后端 */
export const MOCK_ENABLED = true
```

**Mock 覆盖范围：**

| 模块 | Mock 行为 |
|------|----------|
| 登录 | 自动生成 mock token，跳过微信授权 |
| 实名认证 | 提交即通过（APPROVED） |
| 学历认证 | 提交即审核中（PENDING） |
| 头像认证 | 提交即通过 |
| 会员/成家币 | 使用 `services/mock.ts` 中的 mock 数据 |

**对接后端时：** 将 `MOCK_ENABLED` 改为 `false` 即可恢复真实请求。

ui https://lanhuapp.com/web/#/item/project/stage?pid=00cf551c-26f6-49e5-82db-1dc6fda9ca3a&image_id=0af138d0-cb20-4dd9-8eee-c82e951af16f&tid=428e8368-c279-4369-947b-a5828487924d

figma链接：https://www.figma.com/design/BqQhSLVSvuLYrZsgVlKmkU/%E6%88%90%E5%AE%B6%E7%AB%8B%E4%B8%9A?t=NH6dggfURmTA3PuA-1
