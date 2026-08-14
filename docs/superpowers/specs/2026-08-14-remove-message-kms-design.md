# 消息模块移除应用层 KMS 设计

## 目标

移除 PRD-03 消息模块对应用层 KMS/AES Cipher 的全部运行时依赖，使消息首页、系统公告、官方助手、私信、悄悄话和举报证据流程不因 KMS 配置缺失而失败。

## 已确认范围

- 系统公告、官方助手和用户业务通知不经过 TIM，也不经过 KMS。
- 普通私信和悄悄话继续通过 TIM 收发，并在 `app_message_record.content_text` 明文归档。
- 系统/助手消息继续在平台数据库明文保存和查询。
- 举报证据改为 `community_report_evidence.content_text` 明文快照。
- 举报正文仍只允许有效案件处理人查看，并保留查看原因、权限校验和访问审计。
- 云数据库磁盘、备份或 TDE 加密不在本次范围，应用无需感知。

## 数据设计

### 可靠事件 Inbox

`app_message_event_inbox` 新增 `payload_json MEDIUMTEXT`，保存不含聊天正文的受限业务事件 JSON。处理成功、载荷到期或事件进入死信后继续清空载荷，保留事件元数据、状态和错误摘要。

历史 `payload_ciphertext/payload_iv/payload_key_version/payload_hmac` 列暂不物理删除，避免破坏性迁移；应用代码不再读写。没有明文载荷的历史未完成密文事件标记为死信，由业务重新投递。

### 举报证据

`community_report_evidence` 新增 `content_text MEDIUMTEXT`，新证据直接复制消息主表正文。历史密文字段改为可空并保留，不再由应用读取；没有 `content_text` 的历史证据显示正文不可用。

### 系统/助手消息

仅使用 `title_text/content_text`。历史密文字段暂留数据库，实体和服务不再声明或解密这些字段。

## 运行流程

```text
上游业务事件
-> 明文 JSON 写入 Inbox
-> Inbox 认领与幂等消费
-> 按模板生成系统消息明文
-> 成功后清空 payload_json

聊天举报
-> 校验举报人与消息关系
-> 从 app_message_record 复制最小必要正文
-> content_text 写入证据表
-> 有权限的案件处理人填写原因后查看
-> 写入敏感访问审计
```

## 失败边界

- 消息首页不再存在 KMS 错误码。
- Inbox JSON 缺失或格式错误按原重试/死信规则处理。
- 历史仅密文证据不尝试降级解密，返回正文不可用。
- TIM、权限、数据库或模板错误仍按各自错误处理，不被包装成 KMS 错误。

## 验收

- `prod` profile 在没有任何 `MESSAGE_TEXT_*` 参数时可以装配消息服务。
- 打开消息首页可以生成公告/助手摘要，不调用任何 Cipher。
- 系统事件明文载荷可以完成入箱、消费和清理。
- 举报证据明文冻结、受控查看和审计完整通过。
- 代码、配置、测试和对接文档中不再声明生产 KMS 是消息模块上线门禁。
