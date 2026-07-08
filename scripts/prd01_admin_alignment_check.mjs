import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function normalize(text) {
  return text.replace(/\s+/g, '');
}

const files = {
  customers: read('frontend/src/pages/customers/CustomersPage.tsx'),
  verification: read('frontend/src/pages/verify/VerificationManagementPage.tsx'),
  moderation: read('frontend/src/pages/moderation/ModerationPage.tsx'),
  access: read('frontend/src/pages/access/AccessConfigPage.tsx'),
  userApi: read('frontend/src/api/userApp.ts'),
  verificationApi: read('frontend/src/api/verification.ts'),
  appUserReq: read('backend/src/main/java/com/spacetime/admin/dto/request/AppUserPageReq.java'),
  verificationReq: read('backend/src/main/java/com/spacetime/admin/dto/request/VerificationPageReq.java'),
  moderationVO: read('backend/src/main/java/com/spacetime/admin/dto/response/ModerationVO.java'),
};

const checks = [
  {
    area: 'ADM-01 App 用户管理',
    file: 'customers',
    must: [
      '当前用户',
      '核心准入开放',
      '关系反馈开放',
      '7天访客 UV',
      '用户搜索',
      '核心准入',
      '认证状态',
      '身份',
      '城市',
      '关系反馈准入',
      'VIP 状态',
      '隐藏访问记录',
      '批量导入',
      '导出字段',
      '重算准入',
      '用户卡片列表',
      '卡片',
      '表格',
      '10条/页',
      '画像详情',
      '轻量资料',
      '性别/年龄',
      '定位状态',
      '身高/体重',
      '家乡/户口',
      '行业/职业',
      '公司/年收入',
      '婚姻状况',
      '扩展资料',
      '认证与准入',
      '三重认证通过',
      '千寻币/VIP',
      '客服/风控处理记录',
      '账号风险复核完成',
      '批量导入 App 用户',
      '导出固定字段确认',
      '字段范围',
      '确认导出',
      '冻结账号确认',
      '资料摘要',
      '完整度',
      '千寻币',
      '微信',
      '详情',
      '模块补充',
      '关系反馈 Tab',
      '消息互动 Tab',
      '当前被喜欢',
      '当前相互喜欢',
      '最近匹配成功时间',
      '消息未读数',
      '待回复悄悄话',
      '聊天举报数',
      '普通私信状态',
      '高敏查看审计',
      '确认导入',
      '下载模板',
      '下载错误报告',
      '预校验结果',
      '导入规则',
    ],
    forbid: [
      '画像</button>',
      '牵线</button>',
      'DrawerSection title="审核历史"',
      '参单',
      '红娘',
      '编辑运营备注',
    ],
  },
  {
    area: 'ADM-01 App 用户管理 API 参数',
    file: 'userApi',
    must: [
      'coreAccessStatus',
      'verificationStatus',
      'identity',
      'city',
      'relationshipAccess',
      'vipStatus',
      'hideVisitRecord',
      'confirmNoMask',
    ],
  },
  {
    area: 'ADM-01 App 用户管理后端查询参数',
    file: 'appUserReq',
    must: [
      'coreAccessStatus',
      'verificationStatus',
      'identity',
      'city',
      'relationshipAccess',
      'vipStatus',
      'hideVisitRecord',
    ],
  },
  {
    area: 'ADM-02 准入配置',
    file: 'access',
    must: [
      '准入与认证配置',
      '准入与认证配置 / 准入门槛 Tab',
      '查看变更日志',
      '准入门槛',
      '字段配置',
      '资料完整度',
      '上传限制',
      '审核 SLA',
      '文案配置',
      '安全策略',
      '年龄范围',
      '核心准入门槛',
      '账号状态限制',
      '准入拦截能力',
      '保存年龄',
      '字段组',
      '显示名 / 字段 ID',
      '页面菜单',
      '展示',
      '必填',
      '计分',
      '实名认证',
      '身份证号 idCardNo',
      '学信网验证码',
      '学生证材料',
      '资料背景图',
      '进入资料图片审核',
      '保存上传限制',
      '保存审核 SLA',
      '编辑文案配置',
      '保存安全策略',
      '高风险配置保存确认',
      '变更原因',
      '确认保存',
      '变更日志抽屉页',
    ],
  },
  {
    area: 'ADM-03/04/05 认证审核',
    file: 'verification',
    must: [
      '头像认证审核',
      '实名认证审核',
      '学历认证审核',
      '待审核',
      '人像失败',
      '冲突记录',
      '临近 SLA',
      '今日通过',
      '今日驳回',
      '用户搜索',
      '提交时间',
      '审核状态',
      '审核来源',
      '人像识别',
      '核心准入',
      '认证方式',
      '高敏审计',
      '学历规则',
      '头像审核列表',
      '实名审核列表',
      '学历审核列表',
      '手机号',
      '真实姓名',
      '身份证号',
      '身份',
      '学历材料',
      '驳回原因',
      '头像审核仅针对单张头像',
      '后台不展示人脸核身',
      '海外学历暂不支持',
      '不自动覆盖用户基础资料字段',
      '查看高敏二次确认',
      '查看大图',
      '复审',
      '历史',
      'auditListActionLabel',
      'canAuditAction',
      '通过确认',
      '驳回确认',
      '确认后写入审计日志',
    ],
  },
  {
    area: 'ADM-03/04/05 认证审核 API 参数',
    file: 'verificationApi',
    must: [
      'submitTime',
      'faceRecognition',
      'coreAccessStatus',
      'educationMethod',
    ],
  },
  {
    area: 'ADM-03/04/05 认证审核后端查询参数',
    file: 'verificationReq',
    must: [
      'submitTime',
      'faceRecognition',
      'coreAccessStatus',
      'educationMethod',
      'imageType',
      'textType',
    ],
  },
  {
    area: 'ADM-06/07 内容审核',
    file: 'moderation',
    must: [
      '资料图片审核',
      '开放性文字审核',
      '图库规则',
      '文本规则',
      '待审核',
      '背景图',
      '敏感命中',
      '今日通过',
      '今日驳回',
      '用户搜索',
      '图片类型',
      '文本类型',
      '提交时间',
      '审核状态',
      '审核来源',
      '资料图片审核列表',
      '开放性文字审核列表',
      '类型',
      '分类',
      '图片',
      '文本摘要',
      '相册图片与资料背景图',
      '资料背景图不计入相册计数',
      '开放性文字不展示联系方式原文',
      '查看敏感二次确认',
      '查看大图',
      '复核',
      'auditListActionLabel',
      'canAuditAction',
      '通过确认',
      '驳回确认',
      '确认后写入审计日志',
    ],
  },
  {
    area: 'ADM-06/07 内容审核 API 与 VO 字段',
    file: 'verificationApi',
    must: [
      'imageType',
      'imageCategory',
      'imageUrl',
      'textType',
      'textSummary',
      'submitTime',
    ],
  },
  {
    area: 'ADM-06/07 内容审核后端 VO 字段',
    file: 'moderationVO',
    must: [
      'imageType',
      'imageCategory',
      'imageUrl',
      'textType',
      'textSummary',
    ],
  },
];

const failures = [];

for (const check of checks) {
  const content = files[check.file];
  const compact = normalize(content);
  for (const token of check.must) {
    if (!content.includes(token) && !compact.includes(normalize(token))) {
      failures.push(`${check.area} 缺少：${token}`);
    }
  }
  for (const token of check.forbid ?? []) {
    if (content.includes(token) || compact.includes(normalize(token))) {
      failures.push(`${check.area} 禁止继续出现旧口径：${token}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`PRD01 管理后台 demo 对齐检查失败，共 ${failures.length} 项：`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('PRD01 管理后台 demo 对齐检查通过：模块、筛选、字段、按钮、弹窗、API 参数均覆盖静态 demo 关键项。');
