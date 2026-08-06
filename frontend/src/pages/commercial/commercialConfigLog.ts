import type { CommercialConfig, CommercialConfigLog } from '@/api/commercial';

export interface CommercialLogChange {
  item: string;
  before: string;
  after: string;
}

type Snapshot = Partial<CommercialConfig> & Record<string, unknown>;
type SnapshotRecord = Record<string, unknown>;

interface FieldDefinition {
  key: string;
  label: string;
}

interface ArraySectionDefinition {
  key: keyof Pick<CommercialConfig, 'vipBenefits' | 'vipPackages' | 'coinPackages' | 'coinScenes'>;
  label: string;
  identityKeys: string[];
  nameKeys: string[];
  fields: FieldDefinition[];
}

const ARRAY_SECTIONS: ArraySectionDefinition[] = [
  {
    key: 'vipBenefits',
    label: '会员权益',
    identityKeys: ['benefitCode', 'id'],
    nameKeys: ['benefitName', 'benefitCode'],
    fields: [
      { key: 'benefitName', label: '权益名称' },
      { key: 'mobileIcon', label: '移动端图标' },
      { key: 'benefitValue', label: '权益数值' },
      { key: 'displayOrder', label: '排序' },
      { key: 'status', label: '状态' },
    ],
  },
  {
    key: 'vipPackages',
    label: '会员套餐',
    identityKeys: ['id', 'packageName'],
    nameKeys: ['packageName'],
    fields: [
      { key: 'packageName', label: '套餐名称' },
      { key: 'price', label: '售价' },
      { key: 'originPrice', label: '原价' },
      { key: 'durationDays', label: '有效天数' },
      { key: 'packageTag', label: '套餐标签' },
      { key: 'recommendFlag', label: '推荐状态' },
      { key: 'sortOrder', label: '排序' },
      { key: 'status', label: '状态' },
    ],
  },
  {
    key: 'coinPackages',
    label: '千寻币套餐',
    identityKeys: ['id', 'packageName'],
    nameKeys: ['packageName'],
    fields: [
      { key: 'packageName', label: '套餐名称' },
      { key: 'amount', label: '支付金额' },
      { key: 'originAmount', label: '原价' },
      { key: 'discountAmount', label: '优惠价' },
      { key: 'coinCount', label: '千寻币数量' },
      { key: 'bonusCoinCount', label: '赠送数量' },
      { key: 'mobileTag', label: '移动端标签' },
      { key: 'recommendFlag', label: '推荐状态' },
      { key: 'sortOrder', label: '排序' },
      { key: 'status', label: '状态' },
    ],
  },
  {
    key: 'coinScenes',
    label: '千寻币消费场景',
    identityKeys: ['sceneCode', 'id'],
    nameKeys: ['mobileName', 'sceneCode'],
    fields: [
      { key: 'mobileName', label: '场景名称' },
      { key: 'mobileIcon', label: '移动端图标' },
      { key: 'sceneDesc', label: '场景说明' },
      { key: 'unitPrice', label: '单价' },
      { key: 'retentionDays', label: '保留天数' },
      { key: 'sortOrder', label: '排序' },
      { key: 'status', label: '状态' },
    ],
  },
];

const SETTING_FIELDS: FieldDefinition[] = [
  { key: 'idealBatchMax', label: '理想型批量上限' },
  { key: 'idealBatchDiscountPercent', label: '理想型解锁全部折扣比例' },
  { key: 'idealRetentionDays', label: '理想型保留天数' },
  { key: 'normalViewQuota', label: '普通用户每日查看配额' },
  { key: 'vipViewQuota', label: '会员每日查看配额' },
  { key: 'vipExpireRemindDays', label: '会员到期提醒提前天数' },
  { key: 'refundDisplay', label: '退款状态前台展示' },
  { key: 'exposureReserveEnabled', label: '曝光包预留开关' },
  { key: 'exposureReserveDescription', label: '曝光包预留说明' },
];

function parseSnapshot(value?: string): Snapshot | null {
  if (!value?.trim()) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Snapshot : null;
  } catch {
    return null;
  }
}

function recordValue(record: SnapshotRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value);
  }
  return '未命名配置';
}

function recordIndex(value: unknown, definition: ArraySectionDefinition): Map<string, SnapshotRecord> {
  if (!Array.isArray(value)) return new Map();
  return new Map(value.filter((item): item is SnapshotRecord => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .map((item) => [recordValue(item, definition.identityKeys), item]));
}

function displayValue(value: unknown, key?: string): string {
  if (value === undefined || value === null || value === '') return '未设置';
  if (key === 'status') return value === 'ENABLED' ? '启用' : value === 'DISABLED' ? '停用' : String(value);
  if (key === 'recommendFlag') return Number(value) === 1 ? '推荐' : '不推荐';
  if (typeof value === 'boolean') return value ? '开启' : '关闭';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function recordSummary(record: SnapshotRecord, fields: FieldDefinition[]): string {
  return fields
    .filter(({ key }) => record[key] !== undefined)
    .map(({ key, label }) => `${label}：${displayValue(record[key], key)}`)
    .join('；') || '无可展示配置';
}

function buildArrayChanges(before: Snapshot, after: Snapshot, definition: ArraySectionDefinition): CommercialLogChange[] {
  const beforeItems = recordIndex(before[definition.key], definition);
  const afterItems = recordIndex(after[definition.key], definition);
  const identities = new Set([...beforeItems.keys(), ...afterItems.keys()]);
  const changes: CommercialLogChange[] = [];

  identities.forEach((identity) => {
    const beforeItem = beforeItems.get(identity);
    const afterItem = afterItems.get(identity);
    const displayName = recordValue(afterItem || beforeItem || {}, definition.nameKeys);
    if (!beforeItem && afterItem) {
      changes.push({ item: `${definition.label} / ${displayName}`, before: '不存在', after: recordSummary(afterItem, definition.fields) });
      return;
    }
    if (beforeItem && !afterItem) {
      changes.push({ item: `${definition.label} / ${displayName}`, before: recordSummary(beforeItem, definition.fields), after: '已删除' });
      return;
    }
    if (!beforeItem || !afterItem) return;
    definition.fields.forEach(({ key, label }) => {
      if (!sameValue(beforeItem[key], afterItem[key])) {
        changes.push({
          item: `${definition.label} / ${displayName} / ${label}`,
          before: displayValue(beforeItem[key], key),
          after: displayValue(afterItem[key], key),
        });
      }
    });
  });
  return changes;
}

function moduleName(log: CommercialConfigLog): string {
  if (log.changeModuleName?.trim()) return log.changeModuleName;
  return log.changeModule === 'commercial' ? '商业化配置' : log.changeModule || '商业化配置';
}

export function buildCommercialLogChanges(log: CommercialConfigLog): CommercialLogChange[] {
  const before = parseSnapshot(log.beforeSnapshot);
  const after = parseSnapshot(log.afterSnapshot);
  if (!before || !after) {
    return [{ item: moduleName(log), before: '历史记录未保存快照', after: '历史记录未保存快照' }];
  }

  const changes = ARRAY_SECTIONS.flatMap((definition) => buildArrayChanges(before, after, definition));
  const beforeSettings = before.settings && typeof before.settings === 'object' ? before.settings as unknown as SnapshotRecord : {};
  const afterSettings = after.settings && typeof after.settings === 'object' ? after.settings as unknown as SnapshotRecord : {};
  SETTING_FIELDS.forEach(({ key, label }) => {
    if (!sameValue(beforeSettings[key], afterSettings[key])) {
      changes.push({ item: label, before: displayValue(beforeSettings[key], key), after: displayValue(afterSettings[key], key) });
    }
  });

  return changes.length
    ? changes
    : [{ item: moduleName(log), before: '未检测到配置值变化', after: '未检测到配置值变化' }];
}
