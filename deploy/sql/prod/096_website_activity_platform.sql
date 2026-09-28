-- 官网独立活动平台；重复执行不覆盖业务数据。
CREATE TABLE IF NOT EXISTS website_user (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  nickname VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL, updated_by BIGINT NULL, deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_website_user_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='官网用户';

CREATE TABLE IF NOT EXISTS website_legal_document (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  document_type VARCHAR(30) NOT NULL,
  version VARCHAR(30) NOT NULL,
  title VARCHAR(100) NOT NULL,
  content LONGTEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL, updated_by BIGINT NULL, deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_website_legal_version (document_type,version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='官网协议版本';

CREATE TABLE IF NOT EXISTS website_agreement_acceptance (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  agreement_version VARCHAR(30) NOT NULL,
  privacy_version VARCHAR(30) NOT NULL,
  request_ip VARCHAR(64) NULL,
  accepted_at DATETIME NOT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL, updated_by BIGINT NULL, deleted TINYINT NOT NULL DEFAULT 0,
  KEY idx_website_agreement_user (user_id,accepted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='官网协议同意记录';

CREATE TABLE IF NOT EXISTS website_activity (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  author_id BIGINT NOT NULL,
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  location VARCHAR(200) NOT NULL,
  estimated_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  audit_note VARCHAR(500) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL, updated_by BIGINT NULL, deleted TINYINT NOT NULL DEFAULT 0,
  KEY idx_website_activity_public (status,start_time,deleted),
  KEY idx_website_activity_author (author_id,deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='官网线下活动';

CREATE TABLE IF NOT EXISTS website_registration (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  activity_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'REGISTERED',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL, updated_by BIGINT NULL, deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_website_registration (activity_id,user_id),
  KEY idx_website_registration_user (user_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='官网免费报名';

CREATE TABLE IF NOT EXISTS website_conversation (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  activity_id BIGINT NOT NULL,
  user_low_id BIGINT NOT NULL,
  user_high_id BIGINT NOT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL, updated_by BIGINT NULL, deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_website_conversation (activity_id,user_low_id,user_high_id),
  KEY idx_website_conversation_low (user_low_id,deleted),
  KEY idx_website_conversation_high (user_high_id,deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='官网活动一对一会话';

CREATE TABLE IF NOT EXISTS website_media (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  owner_id BIGINT NOT NULL,
  object_key VARCHAR(400) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'UPLOADED',
  target_type VARCHAR(20) NULL,
  target_id BIGINT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL, updated_by BIGINT NULL, deleted TINYINT NOT NULL DEFAULT 0,
  KEY idx_website_media_target (target_type,target_id,deleted),
  KEY idx_website_media_owner (owner_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='官网图片审核与归属';

CREATE TABLE IF NOT EXISTS website_message (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT NOT NULL,
  sender_id BIGINT NOT NULL,
  message_type VARCHAR(10) NOT NULL,
  content_text VARCHAR(500) NULL,
  media_id BIGINT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL, updated_by BIGINT NULL, deleted TINYINT NOT NULL DEFAULT 0,
  KEY idx_website_message_conversation (conversation_id,id,deleted),
  KEY idx_website_message_sender (sender_id,create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='官网私聊消息事实';

CREATE TABLE IF NOT EXISTS website_report (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  reporter_id BIGINT NOT NULL,
  target_type VARCHAR(20) NOT NULL,
  target_id BIGINT NULL,
  reason VARCHAR(1000) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  resolution VARCHAR(500) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL, updated_by BIGINT NULL, deleted TINYINT NOT NULL DEFAULT 0,
  KEY idx_website_report_status (status,create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='官网不良信息举报';

CREATE TABLE IF NOT EXISTS website_audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_type VARCHAR(10) NOT NULL,
  actor_id BIGINT NULL,
  action VARCHAR(50) NOT NULL,
  target_type VARCHAR(20) NULL,
  target_id BIGINT NULL,
  request_ip VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  remark VARCHAR(500) NULL,
  retain_until DATETIME NOT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL, updated_by BIGINT NULL, deleted TINYINT NOT NULL DEFAULT 0,
  KEY idx_website_audit_time (create_time),
  KEY idx_website_audit_target (target_type,target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='官网不少于六个月操作日志';

INSERT INTO website_legal_document(document_type,version,title,content,status)
SELECT 'USER_AGREEMENT','1.0','官网用户服务协议',
'一、服务范围：本网站提供线下活动信息发布、浏览、免费报名和活动相关一对一沟通服务，当前不收取报名服务费。发起人填写的线下预计费用仅供参考，不通过本网站收取。\n二、账号：用户使用本人手机号验证码注册，并对账号行为负责。不得冒用他人身份、发布虚假活动或利用私聊骚扰他人。\n三、活动：发起人应如实填写活动时间、地点、内容及线下预计费用；参加者应自行核实交通、场地等实际安排。发布、报名和交流均应遵守法律法规与社区规则。\n四、内容治理：平台对帖子、图片和聊天进行敏感词筛查、人工审核，允许用户举报；违规内容可被拒绝、下架或删除，并按规定留存处置记录。\n五、服务变更：活动取消、时间变化或平台维护时会在网站中提示。用户可通过网站举报入口反馈违法不良信息及服务问题。\n六、其他：本网站不提供婚恋匹配和新闻出版等专项服务。协议更新后将展示新版本，并在需要时重新取得同意。',
'DRAFT' WHERE NOT EXISTS(SELECT 1 FROM website_legal_document WHERE document_type='USER_AGREEMENT' AND version='1.0');

INSERT INTO website_legal_document(document_type,version,title,content,status)
SELECT 'PRIVACY_POLICY','1.0','官网隐私政策',
'一、处理者：上海兴家立业网络科技通过本网站提供线下活动服务。\n二、收集范围：注册时处理手机号和验证码；发布活动时处理用户填写的标题、正文、图片、时间、地点和预计费用；报名、私聊、举报时处理相应记录；为安全和故障排查记录登录、操作时间、IP 地址及浏览器信息。\n三、使用目的：身份验证、活动展示与报名、消息送达、内容审核、举报处理及安全审计。公开活动仅展示发布者昵称和经审核的内容，不公开手机号。\n四、共享与存储：图片存储在平台使用的对象存储服务，短信由受委托的短信服务商发送。除依法提供监管查询或用户主动公开的活动内容外，不向其他用户展示私聊内容。授权审核人员因处理举报和违规内容可按权限查看聊天，并记录查看原因。\n五、保存期限：登录、发帖、聊天和操作日志至少保存六个月；超过必要期限后依法删除或匿名化，但法律规定和争议处理另有要求的除外。\n六、用户权利：用户可在网站查看自己的活动、报名和聊天记录；需要更正、删除账号资料或反馈隐私问题，可通过网站举报入口提交请求。\n七、保护措施：平台采用访问控制、权限分离、传输加密和审核留痕。协议更新时展示新版本，并在需要时重新取得同意。',
'DRAFT' WHERE NOT EXISTS(SELECT 1 FROM website_legal_document WHERE document_type='PRIVACY_POLICY' AND version='1.0');

INSERT INTO sys_menu(parent_id,menu_name,menu_type,icon,menu_sort,visible,status,remark,create_time,update_time,deleted)
SELECT 0,'官网活动','M','CalendarCheck',84,1,'ENABLED','官网活动审核与日志',NOW(),NOW(),0
WHERE NOT EXISTS(SELECT 1 FROM sys_menu WHERE parent_id=0 AND menu_name='官网活动' AND deleted=0);

INSERT INTO sys_menu(parent_id,menu_name,menu_type,path,component,icon,perms,menu_sort,visible,status,remark,create_time,update_time,deleted)
SELECT p.id,'官网活动管理','C','/website/activities','website/WebsiteManagementPage','CalendarCheck','website:activity:list',1,1,'ENABLED','活动、私聊、举报与日志',NOW(),NOW(),0
FROM sys_menu p WHERE p.parent_id=0 AND p.menu_name='官网活动' AND p.deleted=0
AND NOT EXISTS(SELECT 1 FROM sys_menu WHERE perms='website:activity:list' AND deleted=0);

INSERT INTO sys_menu(parent_id,menu_name,menu_type,perms,menu_sort,visible,status,remark,create_time,update_time,deleted)
SELECT p.id,seed.name,'F',seed.perm,seed.sort_no,0,'ENABLED','官网审核权限',NOW(),NOW(),0
FROM sys_menu p JOIN (
 SELECT '审核活动' name,'website:activity:audit' perm,1 sort_no
 UNION ALL SELECT '查看聊天记录','website:message:list',2
 UNION ALL SELECT '查看敏感聊天内容','website:message:content',3
 UNION ALL SELECT '处置聊天消息','website:message:moderate',4
 UNION ALL SELECT '处理举报','website:report:manage',5
 UNION ALL SELECT '查看审计日志','website:audit:list',6
 UNION ALL SELECT '导出聊天记录','website:message:export',7
) seed ON 1=1 WHERE p.perms='website:activity:list' AND p.deleted=0
AND NOT EXISTS(SELECT 1 FROM sys_menu m WHERE m.perms=seed.perm AND m.deleted=0);

INSERT INTO sys_role_menu(role_id,menu_id)
SELECT r.id,m.id FROM sys_role r JOIN sys_menu m ON m.perms LIKE 'website:%' AND m.deleted=0
WHERE r.role_code='super_admin' AND r.status='ENABLED' AND r.deleted=0
AND NOT EXISTS(SELECT 1 FROM sys_role_menu rm WHERE rm.role_id=r.id AND rm.menu_id=m.id);
