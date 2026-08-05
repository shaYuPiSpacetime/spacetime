import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { showToast } from '@/components/ui/toast';
import {
  exportCommercialFlows,
  exportCommercialOrders,
  exportCommercialReconcile,
  exportCommercialRefunds,
  getCommercialConfig,
  getCommercialConfigLogs,
  getCommercialFlowList,
  getCommercialOrderDetail,
  getCommercialOrderList,
  getCommercialReconcileDaily,
  getCommercialRefundDetail,
  getCommercialRefundList,
  refundCommercialOrder,
  saveCommercialConfig,
  type CoinFlow,
  type CoinPackageConfig,
  type CoinSceneConfig,
  type CommercialConfig,
  type CommercialConfigLog,
  type CommercialSettings,
  type ReconcileDaily,
  type RefundRecord,
  type TradeOrder,
  type VipBenefitConfig,
  type VipPackageConfig,
} from '@/api/commercial';
import { cn } from '@/lib/utils';

type WorkspaceKey = 'config' | 'orders' | 'flows' | 'refunds' | 'reconcile';
type ConfigTabKey = 'benefits' | 'vipPackages' | 'coinPackages' | 'scenePrices' | 'retention' | 'social' | 'exposure';

interface BenefitRow {
  code: string;
  name: string;
  type: string;
  desc: string;
  mobileIcon: string;
  configType: '开关' | '次数' | '分数';
  configValue?: number;
  enabled: boolean;
}

interface VipPackageRow {
  id: string;
  name: string;
  type: 'normal';
  purchaseMode: 'once';
  originalPrice: number;
  price: number;
  duration: string;
  tag: string;
  status: 'on' | 'off';
}

interface CoinPackageRow {
  id: string;
  name: string;
  originalPrice: number;
  payAmount: number;
  coinCount: number;
  bonusCoin: number;
  tag: string;
  recommended: boolean;
  status: 'on' | 'off';
}

interface ScenePriceRow {
  scene: string;
  code: string;
  mobileDisplayName: string;
  mobileIcon: string;
  desc: string;
  price: number;
  retentionDays: number;
  enabled: boolean;
}

interface OrderRow {
  id?: number;
  orderNo: string;
  user: string;
  type: string;
  packageName: string;
  amount: string;
  status: string;
  createTime: string;
  payTime: string;
  channelNo: string;
  source: string;
}

interface FlowRow {
  id?: number;
  flowNo: string;
  user: string;
  assetType: string;
  flowType: string;
  amount: string;
  scene: string;
  orderNo: string;
  time: string;
  before?: number | string;
  after?: number | string;
  idempotencyKey?: string;
  remark?: string;
}

interface RefundRow {
  id?: number;
  refundNo: string;
  orderNo: string;
  user: string;
  amount: string;
  status: string;
  initiator: string;
  reason: string;
  reversal: string;
  remark: string;
  createdTime: string;
  finishedTime: string;
}

interface ReconcileRow {
  date: string;
  successCount: number;
  vipCount: number;
  coinCount: number;
  refundCount: number;
  orderAmount: string;
  refundAmount: string;
  netAmount: string;
  refundRate: string;
}

const WORKSPACE_META: Record<WorkspaceKey, { id: string; title: string; desc: string }> = {
  config: {
    id: 'ADM-04-PAGE-commerce-config',
    title: '商业化配置',
    desc: '移动端配置管理 / 商业化配置。7 个 Tab 覆盖会员、千寻币、消费场景、保留期、社交与订单参数和曝光包预留。',
  },
  orders: {
    id: 'ADM-04-PAGE-commerce-order-list',
    title: '商业化订单管理',
    desc: '查询会员订单和千寻币充值订单；支付成功订单可在详情抽屉内发起退款。',
  },
  flows: {
    id: 'ADM-04-PAGE-asset-flow-list',
    title: '资产流水管理',
    desc: '查询充值、消费、赠送、奖励、退款退回和会员权益流水。',
  },
  refunds: {
    id: 'ADM-04-PAGE-refund-list',
    title: '退款记录管理',
    desc: '展示商业化订单详情内发起的退款台账；本期申请即默认已退款，不做审批流。',
  },
  reconcile: {
    id: 'ADM-04-PAGE-commerce-reconcile',
    title: '轻量对账',
    desc: '按日查看会员订单、千寻币订单、退款订单数量与金额，不做渠道级自动差错追账。',
  },
};

const CONFIG_TABS: { key: ConfigTabKey; label: string }[] = [
  { key: 'benefits', label: '会员权益' },
  { key: 'vipPackages', label: '会员套餐' },
  { key: 'coinPackages', label: '千寻币套餐' },
  { key: 'scenePrices', label: '千寻币消费场景' },
  { key: 'retention', label: '解锁保留期' },
  { key: 'social', label: '社交与订单参数' },
  { key: 'exposure', label: '曝光包预留' },
];

const ICON_GLYPHS: Record<string, string> = {
  'icon-heart-list': '♥',
  'icon-visitor': '👁',
  'icon-whisper': '✉',
  'icon-browse-plus': '+',
  'icon-filter': '⌕',
  'icon-exposure': '★',
  'icon-privacy': '◌',
  'icon-replay-3d': '↺',
  'icon-heart-chance': '♡',
  'icon-heart-unlock': '♥',
  'icon-eye-unlock': '👁',
  'icon-target-user': '◎',
  'icon-target-batch': '◎+',
  'icon-compatible-person': '≋',
  'icon-soulmate': '知',
  'icon-career-recommend': '业',
};

const STATUS_LABELS: Record<string, string> = {
  unpaid: '待支付',
  success: '支付成功',
  refunded: '已退款',
  refunding: '退款中',
  closed: '已关闭',
  failed: '支付失败',
  processing: '处理中',
  ENABLED: '上架',
  DISABLED: '下架',
};

function currentWorkspace(pathname: string): WorkspaceKey {
  if (pathname.startsWith('/commercial/orders')) return 'orders';
  if (pathname.startsWith('/commercial/flows')) return 'flows';
  if (pathname.startsWith('/commercial/refunds')) return 'refunds';
  if (pathname.startsWith('/commercial/reconcile')) return 'reconcile';
  return 'config';
}

function pageRecords<T>(res: unknown): T[] {
  return ((res as any)?.data?.records ?? []) as T[];
}

function pageTotal(res: unknown): number {
  return Number((res as any)?.data?.total ?? 0);
}

function responseData<T>(res: unknown, fallback: T): T {
  return ((res as any)?.data ?? fallback) as T;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value?: number | string) {
  const text = typeof value === 'number' ? value.toFixed(2) : value || '0.00';
  return `¥${text}`;
}

function statusClass(text?: string) {
  if (!text) return 'brand';
  if (['支付成功', '已退款', '上架', '启用', '推荐档'].includes(text)) return 'success';
  if (['待支付', '退款中', '处理中', '协议待补'].includes(text)) return 'warning';
  if (['下架', '已关闭', '支付失败', '停用'].includes(text)) return 'danger';
  return 'brand';
}

function statusText(status?: string) {
  return status ? STATUS_LABELS[status] ?? status : '-';
}

function amountClass(value: string) {
  return value.includes('-') ? 'amount-minus' : 'amount-plus';
}

function configFromApi(config: CommercialConfig | null): {
  benefits: BenefitRow[];
  vipPackages: VipPackageRow[];
  coinPackages: CoinPackageRow[];
  scenes: ScenePriceRow[];
  version: string;
} {
  return {
    benefits: (config?.vipBenefits ?? []).map(toBenefitRow),
    vipPackages: (config?.vipPackages ?? []).map((item, index) => toVipPackageRow(item, index)),
    coinPackages: (config?.coinPackages ?? []).map((item, index) => toCoinPackageRow(item, index)),
    scenes: (config?.coinScenes ?? []).map(toScenePriceRow),
    version: config?.configVersion || '-',
  };
}

function toBenefitRow(item: VipBenefitConfig): BenefitRow {
  return {
    code: item.benefitCode || String(item.id ?? '-'),
    name: item.benefitName || '-',
    type: item.benefitType || '-',
    desc: item.benefitDesc || '-',
    mobileIcon: item.mobileIcon || '',
    configType: benefitConfigType(item),
    configValue: item.benefitValue,
    enabled: (item.status ?? 'ENABLED') !== 'DISABLED',
  };
}

function benefitConfigType(item: VipBenefitConfig): BenefitRow['configType'] {
  if (item.benefitCode?.includes('exposure') || item.benefitType?.includes('曝光')) return '分数';
  if (item.benefitValue != null && item.fixedFlag !== 1) return '次数';
  return '开关';
}

function toVipPackageRow(item: VipPackageConfig, index: number): VipPackageRow {
  return {
    id: `VIP-${String(item.id ?? index + 1).padStart(2, '0')}`,
    name: item.packageName,
    type: 'normal',
    purchaseMode: 'once',
    originalPrice: Number(item.originPrice ?? item.price),
    price: Number(item.price ?? 0),
    duration: `${item.durationDays || 31} 天`,
    tag: item.packageTag || '后台配置',
    status: item.status === 'DISABLED' ? 'off' : 'on',
  };
}

function normalizeVipPackage(item: VipPackageConfig): VipPackageConfig {
  return {
    ...item,
    packageType: 'normal',
    subscriptionType: 'once',
    wechatProductId: undefined,
    agreementConfig: undefined,
  };
}

function normalizeCommercialConfig(value: CommercialConfig): CommercialConfig {
  return {
    ...value,
    vipPackages: (value.vipPackages || []).map(normalizeVipPackage),
  };
}

function toCoinPackageRow(item: CoinPackageConfig, index: number): CoinPackageRow {
  return {
    id: `COIN-${item.coinCount || index + 1}`,
    name: item.packageName,
    originalPrice: Number(item.originAmount ?? item.amount),
    payAmount: Number(item.discountAmount ?? item.amount),
    coinCount: Number(item.coinCount ?? 0),
    bonusCoin: Number(item.bonusCoinCount ?? 0),
    tag: item.mobileTag || item.packageTag || '-',
    recommended: item.recommendFlag === 1,
    status: item.status === 'DISABLED' ? 'off' : 'on',
  };
}

function toScenePriceRow(item: CoinSceneConfig): ScenePriceRow {
  return {
    scene: item.mobileName || item.sceneCode || '-',
    code: item.sceneCode || '-',
    mobileDisplayName: item.mobileName || '-',
    mobileIcon: item.mobileIcon || '',
    desc: item.sceneDesc || '-',
    price: Number(item.unitPrice ?? 0),
    retentionDays: Number(item.retentionDays ?? 0),
    enabled: (item.status ?? 'ENABLED') !== 'DISABLED',
  };
}

function toOrderRow(item: TradeOrder): OrderRow {
  return {
    id: item.id,
    orderNo: item.orderNo,
    user: `用户 ID ${item.userId}`,
    type: item.orderType === 'coin' ? '千寻币充值订单' : '会员订单',
    packageName: item.packageName || '-',
    amount: Number(item.payAmount ?? 0).toFixed(2),
    status: statusText(item.orderStatus),
    createTime: item.createTime || '-',
    payTime: item.successTime || '-',
    channelNo: item.channelTradeNo || '-',
    source: item.orderType === 'coin' ? '余额不足弹窗' : '会员中心',
  };
}

function toFlowRow(item: CoinFlow): FlowRow {
  return {
    id: item.id,
    flowNo: item.flowNo,
    user: `用户 ID ${item.userId}`,
    assetType: assetTypeLabel(item.assetType),
    flowType: flowTypeLabel(item.flowType),
    amount: `${Number(item.changeAmount ?? 0) >= 0 ? '+' : ''}${item.changeAmount ?? 0}`,
    scene: item.bizDesc || item.bizScene || '-',
    orderNo: item.refType === 'order' ? String(item.refId ?? '-') : '-',
    time: item.createTime || '-',
    before: item.balanceBefore ?? '-',
    after: item.balanceAfter ?? '-',
    idempotencyKey: item.refType ? `${item.refType}:${item.refId ?? '-'}` : '-',
    remark: item.bizDesc || '-',
  };
}

function assetTypeLabel(type?: string) {
  const labels: Record<string, string> = { coin: '千寻币', vip: '会员权益' };
  return type ? labels[type] ?? type : '千寻币';
}

function flowTypeLabel(type?: string) {
  const labels: Record<string, string> = { recharge: '充值', consume: '消费', gift: '奖励', refund: '退款退回' };
  return type ? labels[type] ?? type : '-';
}

function toRefundRow(item: RefundRecord): RefundRow {
  return {
    id: item.id,
    refundNo: item.refundNo,
    orderNo: item.orderNo,
    user: `用户 ID ${item.userId}`,
    amount: Number(item.refundAmount ?? 0).toFixed(2),
    status: statusText(item.refundStatus),
    initiator: '运营后台',
    reason: item.refundReason || '-',
    reversal: item.assetRollbackAction || '按订单资产回退',
    remark: item.channelRefundStatus || '退款记录已写入审计',
    createdTime: item.createTime || '-',
    finishedTime: item.refundTime || '-',
  };
}

function toReconcileRow(item: ReconcileDaily): ReconcileRow {
  return {
    date: item.date,
    successCount: Number(item.successOrderCount ?? 0),
    vipCount: Number(item.vipOrderCount ?? 0),
    coinCount: Number(item.coinOrderCount ?? 0),
    refundCount: Number(item.refundOrderCount ?? 0),
    orderAmount: Number(item.orderAmount ?? 0).toFixed(2),
    refundAmount: Number(item.refundAmount ?? 0).toFixed(2),
    netAmount: Number(item.netAmount ?? 0).toFixed(2),
    refundRate: `${(Number(item.refundRate ?? 0) * 100).toFixed(2)}%`,
  };
}

function dateRange(startDate: string, endDate: string) {
  const start = startDate || endDate || today();
  const end = endDate || startDate || today();
  const startTime = new Date(`${start}T00:00:00`);
  const endTime = new Date(`${end}T00:00:00`);
  if (!Number.isFinite(startTime.getTime()) || !Number.isFinite(endTime.getTime())) return [today()];
  const from = startTime.getTime() <= endTime.getTime() ? startTime : endTime;
  const to = startTime.getTime() <= endTime.getTime() ? endTime : startTime;
  const days: string[] = [];
  for (const cursor = new Date(from); cursor <= to && days.length < 31; cursor.setDate(cursor.getDate() + 1)) {
    days.push(formatInputDate(cursor));
  }
  return days;
}

function formatInputDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function CommercialManagement() {
  const location = useLocation();
  const active = currentWorkspace(location.pathname);

  return (
    <div className="commerce-demo-page">
      <style>{commerceStyles}</style>
      {active === 'config' && <ConfigWorkspace />}
      {active === 'orders' && <OrderWorkspace />}
      {active === 'flows' && <FlowWorkspace />}
      {active === 'refunds' && <RefundWorkspace />}
      {active === 'reconcile' && <ReconcileWorkspace />}
    </div>
  );
}

function PageFrame({
  workspace,
  action,
  children,
}: {
  workspace: WorkspaceKey;
  action?: ReactNode;
  children: ReactNode;
}) {
  const meta = WORKSPACE_META[workspace];
  return (
    <section className="section-band admin-page" id={meta.id} data-admin-page>
      <div className="admin-page-inner">
        <div className="admin-page-header">
          <div>
            <h1>{meta.title}</h1>
            <p>{meta.desc}</p>
          </div>
          {action && <div className="admin-actions">{action}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}

function ConfigWorkspace() {
  const location = useLocation();
  const requestedTab = new URLSearchParams(location.search).get('tab') as ConfigTabKey | null;
  const initialTab = requestedTab && CONFIG_TABS.some((item) => item.key === requestedTab) ? requestedTab : 'benefits';
  const [config, setConfig] = useState<CommercialConfig | null>(null);
  const [activeTab, setActiveTab] = useState<ConfigTabKey>(initialTab);
  const [configLogOpen, setConfigLogOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [vipEditOpen, setVipEditOpen] = useState(false);
  const [coinEditOpen, setCoinEditOpen] = useState(false);
  const [sceneEditOpen, setSceneEditOpen] = useState(false);
  const [vipEditIndex, setVipEditIndex] = useState<number | null>(null);
  const [coinEditIndex, setCoinEditIndex] = useState<number | null>(null);
  const [sceneEditIndex, setSceneEditIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveReason, setSaveReason] = useState('');
  const [logs, setLogs] = useState<Array<{ id: string; operator: string; item: string; before: string; after: string; time: string }>>([]);

  const load = useCallback(async () => {
    try {
      const res = await getCommercialConfig();
      const loaded = responseData<CommercialConfig | null>(res, null);
      setConfig(loaded ? normalizeCommercialConfig(loaded) : null);
    } catch {
      setConfig(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const data = useMemo(() => configFromApi(config), [config]);
  const configSummary = useMemo<[string, ReactNode][]>(() => [
    ['配置版本', data.version],
    ['会员权益', `${data.benefits.length} 项`],
    ['套餐配置', `${data.vipPackages.length + data.coinPackages.length} 项`],
    ['消费场景', `${data.scenes.length} 项`],
  ], [data]);

  const handleConfigTabChange = (tab: ConfigTabKey) => {
    setActiveTab(tab);
  };

  const openLogs = async () => {
    try {
      const res = await getCommercialConfigLogs({ page: 1, size: 10 });
      const rows = pageRecords<CommercialConfigLog>(res);
      if (rows.length) {
        setLogs(rows.map((row) => ({
          id: row.configVersion,
          operator: row.operatorName || '运营后台',
          item: row.changeModule || 'commercial',
          before: '-',
          after: row.changeSummary || '-',
          time: row.createTime || '-',
        })));
      }
    } catch {
      setLogs([]);
    }
    setConfigLogOpen(true);
  };

  const save = async () => {
    if (!config) {
      showToast('配置尚未加载，不能覆盖数据库', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = normalizeCommercialConfig(config);
      const res = await saveCommercialConfig({ ...payload, changeSummary: saveReason });
      setConfig(normalizeCommercialConfig(responseData<CommercialConfig>(res, payload)));
      showToast('商业化配置已保存', 'success');
      setSaveOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const updateConfigList = <K extends 'vipBenefits' | 'vipPackages' | 'coinPackages' | 'coinScenes'>(key: K, index: number | null, value: CommercialConfig[K][number]) => {
    setConfig((current) => {
      if (!current) return current;
      const list = [...current[key]] as CommercialConfig[K];
      if (index == null) list.push(value as never);
      else list[index] = value as never;
      return { ...current, [key]: list } as CommercialConfig;
    });
  };

  const toggleConfigStatus = (key: 'vipBenefits' | 'vipPackages' | 'coinPackages' | 'coinScenes', index: number) => {
    setConfig((current) => {
      if (!current) return current;
      const list = [...current[key]] as Array<{ status?: string }>;
      list[index] = { ...list[index], status: list[index]?.status === 'DISABLED' ? 'ENABLED' : 'DISABLED' };
      return { ...current, [key]: list } as CommercialConfig;
    });
  };

  const saveCoinPackageDraft = (index: number | null, value: CoinPackageConfig) => {
    setConfig((current) => {
      if (!current) return current;
      const list = current.coinPackages.map((item) => value.recommendFlag === 1 ? { ...item, recommendFlag: 0 } : item);
      if (index == null) list.push(value);
      else list[index] = value;
      return { ...current, coinPackages: list };
    });
  };

  const updateCommercialSettings = (patch: Partial<CommercialSettings>) => {
    setConfig((current) => current ? { ...current, settings: { ...current.settings, ...patch } } : current);
  };

  return (
    <PageFrame
      workspace="config"
      action={
        <>
          <button className="btn" type="button" onClick={openLogs}>查看变更日志</button>
          <button className="btn primary" type="button" disabled={!config || saving} onClick={() => setSaveOpen(true)}>保存当前配置</button>
        </>
      }
    >
      <SummaryGrid items={configSummary} />

      <div className="config-workbench">
        <nav className="commerce-tabs" aria-label="商业化配置 Tab">
          {CONFIG_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={cn('commerce-tab', activeTab === tab.key && 'is-active')}
              data-config-tab={tab.key}
              onClick={() => handleConfigTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <ConfigPanel active={activeTab === 'benefits'} name="benefits">
          <TableWrap minWidth={1120}>
            <thead>
              <tr><th>权益编码</th><th>名称</th><th>类型</th><th>移动端图标配置</th><th>说明</th><th>启停</th><th>次数/分数配置</th></tr>
            </thead>
            <tbody data-render="admin-benefits">
              {data.benefits.map((item, index) => (
                <tr key={item.code}>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.type}</td>
                  <td><IconConfigInput value={item.mobileIcon} onChange={(value) => updateConfigList('vipBenefits', index, { ...config!.vipBenefits[index], mobileIcon: value })} /></td>
                  <td>{item.desc}</td>
                  <td><MiniSwitch on={item.enabled} onClick={() => toggleConfigStatus('vipBenefits', index)} /></td>
                  <td>{renderBenefitConfig(item, (value) => updateConfigList('vipBenefits', index, { ...config!.vipBenefits[index], benefitValue: value }))}</td>
                </tr>
              ))}
              {!data.benefits.length && <EmptyTableRow colSpan={7} />}
            </tbody>
          </TableWrap>
          <Notice title="配置边界">会员权益固定 9 项；心动名单、访客、高级筛选、隐私权益、三天回放仅支持启停；免费悄悄话、额外浏览、每日心动机会配置每日次数；曝光配置分数；每项可配置移动端图标；名称、类型、说明不可编辑，不提供新增、删除、排序。</Notice>
        </ConfigPanel>

        <ConfigPanel active={activeTab === 'vipPackages'} name="vipPackages">
          <Toolbar title="会员套餐（一次性购买）">
            <button className="btn primary" type="button" onClick={() => { setVipEditIndex(null); setVipEditOpen(true); }}>新增套餐</button>
          </Toolbar>
          <TableWrap minWidth={1120}>
            <thead><tr><th>套餐编号</th><th>套餐名称</th><th>套餐类型</th><th>购买方式</th><th>原价</th><th>优惠价</th><th>有效天数</th><th>标签</th><th>状态</th><th>操作</th></tr></thead>
            <tbody data-render="admin-vip-packages">
              {data.vipPackages.map((item, index) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>普通套餐</td>
                  <td>一次性购买</td>
                  <td>{money(item.originalPrice)}</td>
                  <td>{money(item.price)}</td>
                  <td>{item.duration}</td>
                  <td><Tag>{item.tag}</Tag></td>
                  <td><Tag tone={item.status === 'on' ? 'success' : 'danger'}>{item.status === 'on' ? '上架' : '下架'}</Tag></td>
                  <td><button className="btn" type="button" onClick={() => { setVipEditIndex(index); setVipEditOpen(true); }}>编辑</button> <button className="btn danger" type="button" onClick={() => toggleConfigStatus('vipPackages', index)}>切换状态</button></td>
                </tr>
              ))}
              {!data.vipPackages.length && <EmptyTableRow colSpan={10} />}
            </tbody>
          </TableWrap>
          <Notice title="购买方式">所有会员套餐均为普通套餐，通过微信支付一次性购买；再次购买只延长会员有效期，不会自动扣费。</Notice>
        </ConfigPanel>

        <ConfigPanel active={activeTab === 'coinPackages'} name="coinPackages">
          <Toolbar title="千寻币套餐">
            <button className="btn primary" type="button" onClick={() => { setCoinEditIndex(null); setCoinEditOpen(true); }}>新增币包</button>
          </Toolbar>
          <TableWrap minWidth={1120}>
            <thead><tr><th>套餐编号</th><th>名称</th><th>原价</th><th>优惠价</th><th>到账币数</th><th>赠送币</th><th>标签</th><th>推荐</th><th>状态</th><th>操作</th></tr></thead>
            <tbody data-render="admin-coin-packages">
              {data.coinPackages.map((item, index) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{money(item.originalPrice)}</td>
                  <td>{money(item.payAmount)}</td>
                  <td>{item.coinCount}</td>
                  <td>{item.bonusCoin}</td>
                  <td><Tag>{item.tag}</Tag></td>
                  <td>{item.recommended ? <Tag tone="success">推荐档</Tag> : '-'}</td>
                  <td><Tag tone={item.status === 'on' ? 'success' : 'danger'}>{item.status === 'on' ? '上架' : '下架'}</Tag></td>
                  <td><button className="btn" type="button" onClick={() => { setCoinEditIndex(index); setCoinEditOpen(true); }}>编辑</button> <button className="btn" type="button" onClick={() => toggleConfigStatus('coinPackages', index)}>切换状态</button></td>
                </tr>
              ))}
              {!data.coinPackages.length && <EmptyTableRow colSpan={10} />}
            </tbody>
          </TableWrap>
        </ConfigPanel>

        <ConfigPanel active={activeTab === 'scenePrices'} name="scenePrices">
          <Notice title="千寻币消费场景">仅展示 8 个消费场景；支持移动端展示名称、说明、单价、启停和移动端图标配置；邀请奖励场景不进入消费配置。</Notice>
          <TableWrap minWidth={1120}>
            <thead><tr><th>消费场景</th><th>场景 code</th><th>移动端展示名称</th><th>移动端图标配置</th><th>说明</th><th>单价</th><th>状态</th><th>操作</th></tr></thead>
            <tbody data-render="admin-scene-prices">
              {data.scenes.map((item, index) => (
                <tr key={item.code}>
                  <td>{item.scene}</td>
                  <td>{item.code}</td>
                  <td>{item.mobileDisplayName}</td>
                  <td><MobileIcon icon={item.mobileIcon} /> <span className="helper">{item.mobileIcon || '-'}</span></td>
                  <td>{item.desc}</td>
                  <td>{item.price} 千寻币</td>
                  <td><Tag tone={item.enabled ? 'success' : 'danger'}>{item.enabled ? '启用' : '停用'}</Tag></td>
                  <td><button className="btn" type="button" onClick={() => { setSceneEditIndex(index); setSceneEditOpen(true); }}>编辑</button></td>
                </tr>
              ))}
              {!data.scenes.length && <EmptyTableRow colSpan={8} />}
            </tbody>
          </TableWrap>
        </ConfigPanel>

        <ConfigPanel active={activeTab === 'retention'} name="retention">
          <SettingsForm title="解锁保留期">
            <label className="field">理想型批量上限<input type="number" min="1" value={config?.settings.idealBatchMax ?? ''} onChange={(event) => updateCommercialSettings({ idealBatchMax: Number(event.target.value) })} /></label>
            <label className="field">理想型保留天数<input type="number" min="1" value={config?.settings.idealRetentionDays ?? ''} onChange={(event) => updateCommercialSettings({ idealRetentionDays: Number(event.target.value) })} /></label>
          </SettingsForm>
          <Notice title="复用规则">合拍的人、知音-觅知音保留期复用理想型保留天数；消费业务 code 与单价仍由消费场景 Tab 维护。</Notice>
        </ConfigPanel>

        <ConfigPanel active={activeTab === 'social'} name="social">
          <SettingsForm title="社交与订单参数">
            <label className="field">普通用户每日查看配额<input type="number" min="0" value={config?.settings.normalViewQuota ?? ''} onChange={(event) => updateCommercialSettings({ normalViewQuota: Number(event.target.value) })} /></label>
            <label className="field">会员每日查看配额<input type="number" min="0" value={config?.settings.vipViewQuota ?? ''} onChange={(event) => updateCommercialSettings({ vipViewQuota: Number(event.target.value) })} /></label>
            <label className="field">会员到期提醒提前天数<input type="number" min="1" max="30" value={config?.settings.vipExpireRemindDays ?? ''} onChange={(event) => updateCommercialSettings({ vipExpireRemindDays: Number(event.target.value) })} /></label>
            <label className="field">退款状态前台展示<MiniSwitch on={Boolean(config?.settings.refundDisplay)} onClick={() => updateCommercialSettings({ refundDisplay: !config?.settings.refundDisplay })} /></label>
          </SettingsForm>
          <Notice title="订单关闭">未支付订单固定 30 分钟自动关闭，不提供后台修改。</Notice>
        </ConfigPanel>

        <ConfigPanel active={activeTab === 'exposure'} name="exposure">
          <SettingsForm title="曝光包预留">
            <label className="field">预留开关<MiniSwitch on={Boolean(config?.settings.exposureReserveEnabled)} onClick={() => updateCommercialSettings({ exposureReserveEnabled: !config?.settings.exposureReserveEnabled })} /></label>
            <label className="field">预留说明<textarea value={config?.settings.exposureReserveDescription || ''} onChange={(event) => updateCommercialSettings({ exposureReserveDescription: event.target.value })} /></label>
          </SettingsForm>
          <Notice title="售卖边界">首版仅维护预留状态和说明，不开放购买入口。</Notice>
        </ConfigPanel>
      </div>

      <Drawer id="configLogDrawer" title="配置变更日志" open={configLogOpen} onClose={() => setConfigLogOpen(false)}>
        {logs.map((row) => (
          <div className="drawer-section" key={row.id}>
            <h3>{row.id}</h3>
            <DrawerKV label="操作人">{row.operator}</DrawerKV>
            <DrawerKV label="配置项">{row.item}</DrawerKV>
            <DrawerKV label="变更前">{row.before}</DrawerKV>
            <DrawerKV label="变更后">{row.after}</DrawerKV>
            <DrawerKV label="时间">{row.time}</DrawerKV>
          </div>
        ))}
        {!logs.length && <EmptyState text="暂无后台返回的变更日志" />}
      </Drawer>

      <Modal id="configSaveModal" title="保存配置确认" open={saveOpen} onClose={() => setSaveOpen(false)}>
        <p>本次变更将立即影响移动端套餐、单价或权益展示，并写入审计日志。</p>
        <label className="field">变更原因<textarea value={saveReason} onChange={(event) => setSaveReason(event.target.value)} /></label>
        <div className="modal-actions"><button className="btn" type="button" onClick={() => setSaveOpen(false)}>取消</button><button className="btn primary" type="button" disabled={saving} onClick={save}>确认保存</button></div>
      </Modal>

      <VipPackageModal
        open={vipEditOpen}
        initial={vipEditIndex == null ? null : config?.vipPackages[vipEditIndex] || null}
        onClose={() => setVipEditOpen(false)}
        onSubmit={(value) => { updateConfigList('vipPackages', vipEditIndex, value); setVipEditOpen(false); }}
      />
      <CoinPackageModal
        open={coinEditOpen}
        initial={coinEditIndex == null ? null : config?.coinPackages[coinEditIndex] || null}
        onClose={() => setCoinEditOpen(false)}
        onSubmit={(value) => { saveCoinPackageDraft(coinEditIndex, value); setCoinEditOpen(false); }}
      />
      <CoinSceneModal
        open={sceneEditOpen}
        initial={sceneEditIndex == null ? null : config?.coinScenes[sceneEditIndex] || null}
        onClose={() => setSceneEditOpen(false)}
        onSubmit={(value) => { updateConfigList('coinScenes', sceneEditIndex, value); setSceneEditOpen(false); }}
      />
    </PageFrame>
  );
}

function renderBenefitConfig(item: BenefitRow, onChange: (value: number) => void) {
  if (item.configType === '次数') return <><input className="number-input" type="number" value={item.configValue ?? 0} onChange={(event) => onChange(Number(event.target.value))} /> 次/日</>;
  if (item.configType === '分数') return <><input className="number-input" type="number" value={item.configValue ?? 0} onChange={(event) => onChange(Number(event.target.value))} /> 分</>;
  return <span className="helper">仅开关</span>;
}

function OrderWorkspace() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ orderNo: '', userId: '', orderType: '', orderStatus: '', payDate: '' });
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [refundForm, setRefundForm] = useState({ amount: '', reason: '', reversal: '回收会员权益' });

  const load = useCallback(async () => {
    try {
      const res = await getCommercialOrderList({
        page,
        size: 10,
        orderNo: filters.orderNo,
        userId: filters.userId ? Number(filters.userId) : undefined,
        orderType: filters.orderType,
        orderStatus: filters.orderStatus,
        ...dateFilterParams(filters.payDate),
      });
      const rows = pageRecords<TradeOrder>(res).map(toOrderRow);
      setOrders(rows);
      setTotal(pageTotal(res));
    } catch {
      setOrders([]);
      setTotal(0);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (row: OrderRow) => {
    if (row.id) {
      try {
        const res = await getCommercialOrderDetail(row.id);
        setSelected(toOrderRow(responseData<TradeOrder>(res, {} as TradeOrder)));
      } catch {
        setSelected(row);
      }
    } else {
      setSelected(row);
    }
  };

  const openRefund = () => {
    if (!selected || selected.status !== '支付成功') {
      showToast('当前订单不可发起退款', 'info');
      return;
    }
    setRefundForm({ amount: selected.amount, reason: '', reversal: selected.type.includes('会员') ? '回收会员权益' : '扣回到账千寻币' });
    setRefundOpen(true);
  };

  const submitRefund = async () => {
    if (!selected) return;
    if (!refundForm.amount || !refundForm.reason.trim()) {
      showToast('请填写退款金额和退款原因', 'info');
      return;
    }
    if (selected.id) {
      await refundCommercialOrder(selected.id, { reason: refundForm.reason, refundAmount: Number(refundForm.amount) });
    }
    await load();
    setSelected(null);
    setRefundOpen(false);
    showToast('退款已提交，订单状态已重新拉取', 'success');
  };

  const exportData = async () => {
    const res = await exportCommercialOrders();
    showToast(responseData<any>(res, {}).message || '订单导出任务已创建', 'success');
    setExportOpen(false);
  };

  return (
    <PageFrame workspace="orders" action={<button className="btn primary" type="button" onClick={() => setExportOpen(true)}>导出订单</button>}>
      <SummaryGrid items={orderSummary(orders, total)} />
      <QueryPanel title="查询条件" actions={<><button className="btn primary" type="button" onClick={() => { setPage(1); load(); }}>查询</button><button className="btn" type="button" onClick={() => { setPage(1); setFilters({ orderNo: '', userId: '', orderType: '', orderStatus: '', payDate: '' }); }}>重置</button></>}>
        <ControlField label="订单号"><input value={filters.orderNo} onChange={(event) => setFilters({ ...filters, orderNo: event.target.value })} /></ControlField>
        <ControlField label="用户 ID"><input inputMode="numeric" value={filters.userId} onChange={(event) => setFilters({ ...filters, userId: event.target.value.replace(/\D/g, '') })} /></ControlField>
        <ControlField label="订单类型"><select value={filters.orderType} onChange={(event) => setFilters({ ...filters, orderType: event.target.value })}><option value="">全部</option><option value="vip">会员订单</option><option value="coin">千寻币充值订单</option></select></ControlField>
        <ControlField label="订单状态"><select value={filters.orderStatus} onChange={(event) => setFilters({ ...filters, orderStatus: event.target.value })}><option value="">全部</option><option value="success">支付成功</option><option value="unpaid">待支付</option><option value="refunded">已退款</option></select></ControlField>
        <ControlField label="支付时间"><input type="date" value={filters.payDate} onChange={(event) => setFilters({ ...filters, payDate: event.target.value })} /></ControlField>
      </QueryPanel>
      <TableWrap minWidth={1120}>
        <thead><tr><th>订单号</th><th>用户</th><th>类型</th><th>套餐</th><th>金额</th><th>状态</th><th>创建时间</th><th>支付时间</th><th>操作</th></tr></thead>
        <tbody data-render="orders">
          {orders.map((row) => (
            <tr key={row.orderNo}>
              <td>{row.orderNo}</td><td>{row.user}</td><td>{row.type}</td><td>{row.packageName}</td><td>{money(row.amount)}</td><td><Tag tone={statusClass(row.status)}>{row.status}</Tag></td><td>{row.createTime}</td><td>{row.payTime}</td>
              <td><button className="btn" type="button" onClick={() => openDetail(row)}>详情</button></td>
            </tr>
          ))}
          {!orders.length && <EmptyTableRow colSpan={9} />}
        </tbody>
      </TableWrap>
      <Pagination text={`共 ${total} 条，10 条/页`} current={page} total={total} onChange={setPage} />

      <Drawer id="orderDrawer" title="订单详情" open={!!selected} onClose={() => setSelected(null)} actions={<><button className="btn" type="button" onClick={() => setSelected(null)}>关闭</button><button className="btn danger" type="button" disabled={selected?.status !== '支付成功'} onClick={openRefund}>{selected?.status === '支付成功' ? '发起退款' : '已退款/不可退款'}</button></>}>
        {selected && (
          <>
            <div className="drawer-section">
              <DrawerKV label="订单号">{selected.orderNo}</DrawerKV>
              <DrawerKV label="用户">{selected.user}</DrawerKV>
              <DrawerKV label="订单类型">{selected.type}</DrawerKV>
              <DrawerKV label="套餐名称">{selected.packageName}</DrawerKV>
              <DrawerKV label="支付金额">{selected.amount}</DrawerKV>
              <DrawerKV label="订单状态">{selected.status}</DrawerKV>
              <DrawerKV label="渠道流水">{selected.channelNo}</DrawerKV>
              <DrawerKV label="来源场景">{selected.source}</DrawerKV>
            </div>
            <Notice title="退款入口">支付成功且未退款订单可在详情抽屉内发起退款；提交后默认生成已退款记录。</Notice>
          </>
        )}
      </Drawer>

      <RefundApplyModal open={refundOpen} form={refundForm} onChange={setRefundForm} selected={selected} onClose={() => setRefundOpen(false)} onSubmit={submitRefund} />
      <ExportModal type="订单" open={exportOpen} onClose={() => setExportOpen(false)} onConfirm={exportData} />
    </PageFrame>
  );
}

function FlowWorkspace() {
  const [flows, setFlows] = useState<FlowRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<FlowRow | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [filters, setFilters] = useState({ user: '', assetType: '', flowType: '', scene: '' });

  const load = useCallback(async () => {
    try {
      const res = await getCommercialFlowList({ page, size: 10, userId: filters.user.replace(/\D/g, '') || undefined, assetType: filters.assetType, flowType: filters.flowType, bizScene: filters.scene });
      const rows = pageRecords<CoinFlow>(res).map(toFlowRow);
      setFlows(rows);
      setTotal(pageTotal(res));
    } catch {
      setFlows([]);
      setTotal(0);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const exportData = async () => {
    const res = await exportCommercialFlows();
    showToast(responseData<any>(res, {}).message || '流水导出任务已创建', 'success');
    setExportOpen(false);
  };

  return (
    <PageFrame workspace="flows" action={<button className="btn primary" type="button" onClick={() => setExportOpen(true)}>导出流水</button>}>
      <SummaryGrid items={flowSummary(flows, total)} />
      <QueryPanel title="查询条件" actions={<><button className="btn primary" type="button" onClick={() => { setPage(1); load(); }}>查询</button><button className="btn" type="button" onClick={() => { setPage(1); setFilters({ user: '', assetType: '', flowType: '', scene: '' }); }}>重置</button></>}>
        <ControlField label="用户 ID"><input inputMode="numeric" value={filters.user} onChange={(event) => setFilters({ ...filters, user: event.target.value.replace(/\D/g, '') })} /></ControlField>
        <ControlField label="资产类型"><select value={filters.assetType} onChange={(event) => setFilters({ ...filters, assetType: event.target.value })}><option value="">全部</option><option value="coin">千寻币</option><option value="vip">会员权益</option></select></ControlField>
        <ControlField label="流水类型"><select value={filters.flowType} onChange={(event) => setFilters({ ...filters, flowType: event.target.value })}><option value="">全部</option><option value="recharge">充值</option><option value="consume">消费</option><option value="gift">奖励</option><option value="refund">退款退回</option></select></ControlField>
        <ControlField label="业务场景"><input value={filters.scene} onChange={(event) => setFilters({ ...filters, scene: event.target.value })} /></ControlField>
      </QueryPanel>
      <TableWrap minWidth={1120}>
        <thead><tr><th>流水号</th><th>用户</th><th>资产类型</th><th>流水类型</th><th>变动</th><th>业务场景</th><th>关联订单</th><th>发生时间</th><th>操作</th></tr></thead>
        <tbody data-render="asset-flows">
          {flows.map((row) => (
            <tr key={row.flowNo}>
              <td>{row.flowNo}</td><td>{row.user}</td><td>{row.assetType}</td><td>{row.flowType}</td><td className={amountClass(row.amount)}>{row.amount}</td><td>{row.scene}</td><td>{row.orderNo}</td><td>{row.time}</td>
              <td><button className="btn" type="button" onClick={() => setSelected(row)}>详情</button></td>
            </tr>
          ))}
          {!flows.length && <EmptyTableRow colSpan={9} />}
        </tbody>
      </TableWrap>
      <Pagination text={`共 ${total} 条，10 条/页`} current={page} total={total} onChange={setPage} compact />

      <Drawer id="flowDrawer" title="流水详情" open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div className="drawer-section">
            <DrawerKV label="流水号">{selected.flowNo}</DrawerKV>
            <DrawerKV label="用户">{selected.user}</DrawerKV>
            <DrawerKV label="资产类型">{selected.assetType}</DrawerKV>
            <DrawerKV label="流水类型">{selected.flowType}</DrawerKV>
            <DrawerKV label="变动数量">{selected.amount}</DrawerKV>
            <DrawerKV label="业务场景">{selected.scene}</DrawerKV>
            <DrawerKV label="变动前余额">{selected.before}</DrawerKV>
            <DrawerKV label="变动后余额">{selected.after}</DrawerKV>
            <DrawerKV label="幂等键">{selected.idempotencyKey}</DrawerKV>
            <DrawerKV label="备注">{selected.remark}</DrawerKV>
          </div>
        )}
      </Drawer>
      <ExportModal type="资产流水" open={exportOpen} onClose={() => setExportOpen(false)} onConfirm={exportData} />
    </PageFrame>
  );
}

function RefundWorkspace() {
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RefundRow | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [filters, setFilters] = useState({ orderNo: '', userId: '', refundDate: '' });

  const load = useCallback(async () => {
    try {
      const res = await getCommercialRefundList({
        page,
        size: 10,
        orderNo: filters.orderNo,
        userId: filters.userId ? Number(filters.userId) : undefined,
        ...dateFilterParams(filters.refundDate),
      });
      const rows = pageRecords<RefundRecord>(res).map(toRefundRow);
      setRefunds(rows);
      setTotal(pageTotal(res));
    } catch {
      setRefunds([]);
      setTotal(0);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (row: RefundRow) => {
    if (row.id) {
      try {
        const res = await getCommercialRefundDetail(row.id);
        const detail = responseData<any>(res, null);
        setSelected(detail?.refund ? toRefundRow(detail.refund) : row);
      } catch {
        setSelected(row);
      }
    } else {
      setSelected(row);
    }
  };

  const exportData = async () => {
    const res = await exportCommercialRefunds();
    showToast(responseData<any>(res, {}).message || '退款导出任务已创建', 'success');
    setExportOpen(false);
  };

  return (
    <PageFrame workspace="refunds" action={<button className="btn primary" type="button" onClick={() => setExportOpen(true)}>导出退款</button>}>
      <SummaryGrid items={refundSummary(refunds, total)} />
      <QueryPanel title="查询条件" actions={<><button className="btn primary" type="button" onClick={() => { setPage(1); load(); }}>查询</button><button className="btn" type="button" onClick={() => { setPage(1); setFilters({ orderNo: '', userId: '', refundDate: '' }); }}>重置</button></>}>
        <ControlField label="订单号"><input value={filters.orderNo} onChange={(event) => setFilters({ ...filters, orderNo: event.target.value })} /></ControlField>
        <ControlField label="用户 ID"><input value={filters.userId} onChange={(event) => setFilters({ ...filters, userId: event.target.value.replace(/\D/g, '') })} /></ControlField>
        <ControlField label="退款时间"><input type="date" value={filters.refundDate} onChange={(event) => setFilters({ ...filters, refundDate: event.target.value })} /></ControlField>
      </QueryPanel>
      <TableWrap minWidth={1220}>
        <thead><tr><th>退款单号</th><th>订单号</th><th>用户</th><th>金额</th><th>状态</th><th>发起人</th><th>原因</th><th>资产回退</th><th>发起时间</th><th>完成时间</th><th>操作</th></tr></thead>
        <tbody data-render="refunds">
          {refunds.map((row) => (
            <tr key={row.refundNo}>
              <td>{row.refundNo}</td><td>{row.orderNo}</td><td>{row.user}</td><td>{money(row.amount)}</td><td><Tag tone={statusClass(row.status)}>{row.status}</Tag></td><td>{row.initiator}</td><td>{row.reason}</td><td>{row.reversal}</td><td>{row.createdTime}</td><td>{row.finishedTime}</td>
              <td><button className="btn" type="button" onClick={() => openDetail(row)}>详情</button></td>
            </tr>
          ))}
          {!refunds.length && <EmptyTableRow colSpan={11} />}
        </tbody>
      </TableWrap>
      <Pagination text={`共 ${total} 条，10 条/页`} current={page} total={total} onChange={setPage} compact />

      <Drawer id="refundDrawer" title="退款详情" open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <div className="drawer-section">
              <DrawerKV label="退款单号">{selected.refundNo}</DrawerKV>
              <DrawerKV label="关联订单">{selected.orderNo}</DrawerKV>
              <DrawerKV label="用户">{selected.user}</DrawerKV>
              <DrawerKV label="退款金额">{selected.amount}</DrawerKV>
              <DrawerKV label="退款状态">{selected.status}</DrawerKV>
              <DrawerKV label="发起人">{selected.initiator}</DrawerKV>
              <DrawerKV label="退款原因">{selected.reason}</DrawerKV>
              <DrawerKV label="资产回退">{selected.reversal}</DrawerKV>
              <DrawerKV label="处理备注">{selected.remark}</DrawerKV>
              <DrawerKV label="发起时间">{selected.createdTime}</DrawerKV>
              <DrawerKV label="完成时间">{selected.finishedTime}</DrawerKV>
            </div>
            <Notice title="只读边界">退款记录由订单详情发起后生成，本期申请即默认已退款；退款记录页不提供状态筛选和人工改状态按钮。</Notice>
          </>
        )}
      </Drawer>
      <ExportModal type="退款记录" open={exportOpen} onClose={() => setExportOpen(false)} onConfirm={exportData} />
    </PageFrame>
  );
}

function ReconcileWorkspace() {
  const [filters, setFilters] = useState({ startDate: today(), endDate: today() });
  const [rows, setRows] = useState<ReconcileRow[]>([]);
  const [exportOpen, setExportOpen] = useState(false);

  const summary = useMemo(() => ({
    orderAmount: rows.reduce((sum, row) => sum + parseAmount(row.orderAmount), 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    refundAmount: rows.reduce((sum, row) => sum + parseAmount(row.refundAmount), 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    netAmount: rows.reduce((sum, row) => sum + parseAmount(row.netAmount), 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    days: rows.length,
  }), [rows]);

  const load = useCallback(async () => {
    try {
      const responses = await Promise.all(dateRange(filters.startDate, filters.endDate).map(async (date) => {
        const res = await getCommercialReconcileDaily(date);
        return responseData<ReconcileDaily | null>(res, null);
      }));
      setRows(responses.filter(Boolean).map((item) => toReconcileRow(item as ReconcileDaily)));
    } catch {
      setRows([]);
    }
  }, [filters.endDate, filters.startDate]);

  useEffect(() => {
    load();
  }, [load]);

  const exportData = async () => {
    const res = await exportCommercialReconcile();
    showToast(responseData<any>(res, {}).message || '对账导出任务已创建', 'success');
    setExportOpen(false);
  };

  return (
    <PageFrame workspace="reconcile" action={<button className="btn primary" type="button" onClick={() => setExportOpen(true)}>导出对账</button>}>
      <QueryPanel title="日期筛选" actions={<><button className="btn primary" type="button" onClick={load}>查询</button><button className="btn" type="button" onClick={() => setFilters({ startDate: '', endDate: '' })}>重置</button></>}>
        <ControlField label="开始日期"><input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} /></ControlField>
        <ControlField label="结束日期"><input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} /></ControlField>
      </QueryPanel>
      <SummaryGrid items={[['查询天数', summary.days], ['订单支付金额', summary.orderAmount], ['退款金额', summary.refundAmount], ['净收入', summary.netAmount]]} />
      <Notice title="统计延迟">轻量对账可接受分钟级延迟，页面展示数据更新时间。</Notice>
      <TableWrap minWidth={1120}>
        <thead><tr><th>日期</th><th>成功订单数</th><th>会员订单数</th><th>千寻币订单数</th><th>订单支付金额</th><th>退款订单数</th><th>退款金额</th><th>净收入</th><th>退款率</th></tr></thead>
        <tbody data-render="reconcile-rows">
          {rows.map((row) => (
            <tr key={row.date}><td>{row.date}</td><td>{row.successCount}</td><td>{row.vipCount}</td><td>{row.coinCount}</td><td>{money(row.orderAmount)}</td><td>{row.refundCount}</td><td>{money(row.refundAmount)}</td><td>{money(row.netAmount)}</td><td>{row.refundRate}</td></tr>
          ))}
          {!rows.length && <EmptyTableRow colSpan={9} />}
        </tbody>
      </TableWrap>
      <ExportModal type="轻量对账" open={exportOpen} onClose={() => setExportOpen(false)} onConfirm={exportData} />
    </PageFrame>
  );
}

function parseAmount(value: string) {
  return Number(value.replace(/,/g, '')) || 0;
}

function dateFilterParams(date: string) {
  if (!date) return {};
  return {
    startTime: `${date}T00:00:00`,
    endTime: `${date}T23:59:59`,
  };
}

function orderSummary(rows: OrderRow[], total: number): [string, ReactNode][] {
  const successAmount = rows
    .filter((row) => row.status === '支付成功')
    .reduce((sum, row) => sum + parseAmount(row.amount), 0)
    .toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return [
    ['订单总数', String(total)],
    ['当前页支付成功金额', successAmount],
    ['当前页已退款', rows.filter((row) => row.status === '已退款').length],
    ['当前页订单', rows.length],
  ];
}

function flowSummary(rows: FlowRow[], total: number): [string, ReactNode][] {
  const income = rows.filter((row) => !row.amount.includes('-')).reduce((sum, row) => sum + parseAmount(row.amount.replace('+', '')), 0);
  const expense = rows.filter((row) => row.amount.includes('-')).reduce((sum, row) => sum + Math.abs(parseAmount(row.amount)), 0);
  return [
    ['流水总数', String(total)],
    ['当前页收入', `+${income}`],
    ['当前页支出', `-${expense}`],
    ['当前页退款退回', rows.filter((row) => row.flowType === '退款退回').length],
  ];
}

function refundSummary(rows: RefundRow[], total: number): [string, ReactNode][] {
  const amount = rows.reduce((sum, row) => sum + parseAmount(row.amount), 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return [
    ['退款总数', String(total)],
    ['当前页已退款', rows.filter((row) => row.status === '已退款').length],
    ['当前页退款金额', amount],
    ['当前页记录', rows.length],
  ];
}

function SummaryGrid({ items }: { items: [string, ReactNode][] }) {
  return (
    <div className="admin-summary-grid">
      {items.map(([label, value]) => (
        <article className="stat-card" key={label}><span>{label}</span><strong>{value}</strong></article>
      ))}
    </div>
  );
}

function EmptyTableRow({ colSpan, text = '暂无后台返回数据' }: { colSpan: number; text?: string }) {
  return <tr><td className="empty-cell" colSpan={colSpan}>{text}</td></tr>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function Toolbar({ title, children }: { title: string; children: ReactNode }) {
  return <div className="toolbar"><strong>{title}</strong>{children}</div>;
}

function TableWrap({ children, minWidth = 1120 }: { children: ReactNode; minWidth?: number }) {
  return <div className="table-wrap"><table style={{ minWidth }}>{children}</table></div>;
}

function QueryPanel({ title, children, actions }: { title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <div className="query-panel">
      <h2>{title}</h2>
      <div className="query-grid">{children}</div>
      <div className="admin-actions">{actions}</div>
    </div>
  );
}

function ControlField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="control-field">{label}{children}</label>;
}

function SettingsForm({ title, children }: { title: string; children: ReactNode }) {
  return <div className="query-panel"><h2>{title}</h2><div className="settings-form-grid">{children}</div></div>;
}

function ConfigPanel({ active, name, children }: { active: boolean; name: string; children: ReactNode }) {
  return <div className={cn('config-panel', active && 'is-active')} data-config-panel={name}>{children}</div>;
}

function Tag({ children, tone }: { children: ReactNode; tone?: string }) {
  return <span className={cn('tag', tone || statusClass(String(children)))}>{children}</span>;
}

function MiniSwitch({ on, label, onClick }: { on: boolean; label?: string; onClick?: () => void }) {
  return <button type="button" className={cn('mini-switch', !on && 'off')} onClick={onClick}>{label || (on ? '启用' : '停用')}</button>;
}

function MobileIcon({ icon }: { icon?: string }) {
  const code = icon || 'icon-default';
  return <span className="mobile-icon" title={code}>{ICON_GLYPHS[code] || '•'}</span>;
}

function IconConfigInput({ value, onChange }: { value?: string; onChange?: (value: string) => void }) {
  return (
    <span className="icon-config-cell">
      <MobileIcon icon={value} />
      <input className="icon-config-input" value={value || ''} aria-label="移动端图标配置" onChange={(event) => onChange?.(event.target.value)} />
    </span>
  );
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return <div className="notice"><strong>{title}</strong>{children}</div>;
}

function Drawer({
  id,
  title,
  open,
  onClose,
  children,
  actions,
}: {
  id: string;
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={cn('drawer-backdrop', open && 'is-open')} id={id} aria-hidden={!open} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer">
        <h2>{title}</h2>
        <div className="drawer-body">{children}</div>
        <div className="drawer-actions">{actions || <button className="btn" type="button" onClick={onClose}>关闭</button>}</div>
      </aside>
    </div>
  );
}

function Modal({ id, title, open, onClose, children }: { id: string; title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <div className={cn('modal-backdrop', open && 'is-open')} id={id} aria-hidden={!open} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal">
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function DrawerKV({ label, children }: { label: string; children: ReactNode }) {
  return <div className="drawer-kv"><span>{label}</span><strong>{children ?? '-'}</strong></div>;
}

function Pagination({ text, current, total, onChange, compact = false }: { text: string; current: number; total: number; onChange: (page: number) => void; compact?: boolean }) {
  const pageCount = Math.max(1, Math.ceil(total / 10));
  const previousDisabled = current <= 1;
  const nextDisabled = current >= pageCount;
  return (
    <div className="pagination">
      <span>{text}</span>
      <button className="btn" type="button" disabled={previousDisabled} onClick={() => onChange(Math.max(1, current - 1))}>上一页</button>
      <button className="btn primary" type="button" aria-current="page">{current} / {pageCount}</button>
      <button className="btn" type="button" disabled={nextDisabled} onClick={() => onChange(Math.min(pageCount, current + 1))}>下一页</button>
    </div>
  );
}

function VipPackageModal({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial: VipPackageConfig | null;
  onClose: () => void;
  onSubmit: (value: VipPackageConfig) => void;
}) {
  const [form, setForm] = useState<VipPackageConfig>({ packageName: '', packageType: 'normal', price: 0, durationDays: 30, subscriptionType: 'once', status: 'ENABLED' });
  useEffect(() => {
    if (open) setForm(initial || { packageName: '', packageType: 'normal', price: 0, durationDays: 30, subscriptionType: 'once', status: 'ENABLED' });
  }, [initial, open]);
  return (
    <Modal id="vipPackageEditModal" title="会员套餐新增/编辑" open={open} onClose={onClose}>
      <div className="form-stack">
        <label className="field">套餐名称<input value={form.packageName} onChange={(event) => setForm({ ...form, packageName: event.target.value })} /></label>
        <label className="field">套餐类型<input value="普通套餐" readOnly /></label>
        <label className="field">售价<input type="number" value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} /></label>
        <label className="field">原价<input type="number" value={form.originPrice ?? ''} onChange={(event) => setForm({ ...form, originPrice: event.target.value ? Number(event.target.value) : undefined })} /></label>
        <label className="field">时长（天）<input type="number" value={form.durationDays} onChange={(event) => setForm({ ...form, durationDays: Number(event.target.value) })} /></label>
        <label className="field">购买方式<input value="一次性购买" readOnly /></label>
        <label className="field">标签<input value={form.packageTag || ''} onChange={(event) => setForm({ ...form, packageTag: event.target.value })} /></label>
      </div>
      <Notice title="购买方式">固定为普通套餐、一次性购买，不签约自动续费。</Notice>
      <div className="modal-actions"><button className="btn" type="button" onClick={onClose}>取消</button><button className="btn primary" type="button" disabled={!form.packageName.trim() || form.price <= 0} onClick={() => onSubmit(normalizeVipPackage(form))}>确认</button></div>
    </Modal>
  );
}

function CoinPackageModal({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial: CoinPackageConfig | null;
  onClose: () => void;
  onSubmit: (value: CoinPackageConfig) => void;
}) {
  const [form, setForm] = useState<CoinPackageConfig>({ packageName: '', amount: 0, coinCount: 0, status: 'ENABLED' });
  useEffect(() => {
    if (open) setForm(initial || { packageName: '', amount: 0, coinCount: 0, status: 'ENABLED' });
  }, [initial, open]);
  return (
    <Modal id="coinPackageEditModal" title="千寻币套餐新增/编辑" open={open} onClose={onClose}>
      <div className="form-stack">
        <label className="field">套餐类型<select disabled><option>千寻币套餐</option></select></label>
        <label className="field">套餐名称<input value={form.packageName} onChange={(event) => setForm({ ...form, packageName: event.target.value })} /></label>
        <label className="field">售价<input type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} /></label>
        <label className="field">原价<input type="number" value={form.originAmount ?? ''} onChange={(event) => setForm({ ...form, originAmount: event.target.value ? Number(event.target.value) : undefined })} /></label>
        <label className="field">优惠价<input type="number" value={form.discountAmount ?? ''} onChange={(event) => setForm({ ...form, discountAmount: event.target.value ? Number(event.target.value) : undefined })} /></label>
        <label className="field">到账币数<input type="number" value={form.coinCount} onChange={(event) => setForm({ ...form, coinCount: Number(event.target.value) })} /></label>
        <label className="field">赠送币数<input type="number" value={form.bonusCoinCount ?? 0} onChange={(event) => setForm({ ...form, bonusCoinCount: Number(event.target.value) })} /></label>
        <label className="field">标签<input value={form.packageTag || ''} onChange={(event) => setForm({ ...form, packageTag: event.target.value })} /></label>
        <label className="field">移动端标签<input value={form.mobileTag || ''} onChange={(event) => setForm({ ...form, mobileTag: event.target.value })} /></label>
        <label className="field">是否推荐<select value={form.recommendFlag ? '1' : '0'} onChange={(event) => setForm({ ...form, recommendFlag: Number(event.target.value) })}><option value="1">推荐档</option><option value="0">普通档</option></select></label>
      </div>
      <Notice title="推荐规则">同一时间最多 1 个推荐档，保存后移动端充值页刷新。</Notice>
      <div className="modal-actions"><button className="btn" type="button" onClick={onClose}>取消</button><button className="btn primary" type="button" disabled={!form.packageName.trim() || form.amount <= 0 || form.coinCount <= 0} onClick={() => onSubmit(form)}>确认</button></div>
    </Modal>
  );
}

function CoinSceneModal({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial: CoinSceneConfig | null;
  onClose: () => void;
  onSubmit: (value: CoinSceneConfig) => void;
}) {
  const [form, setForm] = useState<CoinSceneConfig>({ sceneCode: '', mobileName: '', mobileIcon: '', sceneDesc: '', unitPrice: 0, retentionDays: 0, status: 'ENABLED' });
  useEffect(() => {
    if (open) {
      setForm(initial || { sceneCode: '', mobileName: '', mobileIcon: '', sceneDesc: '', unitPrice: 0, retentionDays: 0, status: 'ENABLED' });
    }
  }, [initial, open]);

  return (
    <Modal id="coinSceneEditModal" title="千寻币消费场景编辑" open={open} onClose={onClose}>
      <div className="form-stack">
        <label className="field">场景 code<input value={form.sceneCode} readOnly /></label>
        <label className="field">移动端展示名称<input aria-label="场景移动端展示名称" value={form.mobileName} onChange={(event) => setForm({ ...form, mobileName: event.target.value })} /></label>
        <label className="field">移动端图标配置<IconConfigInput value={form.mobileIcon} onChange={(value) => setForm({ ...form, mobileIcon: value })} /></label>
        <label className="field">场景说明<textarea value={form.sceneDesc || ''} onChange={(event) => setForm({ ...form, sceneDesc: event.target.value })} /></label>
        <label className="field">消费单价<input aria-label="场景消费单价" type="number" min="0" value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: Number(event.target.value) })} /></label>
        <label className="field">保留天数<input type="number" min="0" value={form.retentionDays ?? 0} onChange={(event) => setForm({ ...form, retentionDays: Number(event.target.value) })} /></label>
        <label className="field">状态<select value={form.status || 'ENABLED'} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="ENABLED">启用</option><option value="DISABLED">停用</option></select></label>
      </div>
      <Notice title="生效范围">保存商业化配置后写入数据库，小程序重新进入页面时按名称、图标、价格和状态动态展示。</Notice>
      <div className="modal-actions"><button className="btn" type="button" onClick={onClose}>取消</button><button className="btn primary" type="button" disabled={!form.mobileName.trim() || !form.mobileIcon?.trim() || form.unitPrice < 0} onClick={() => onSubmit(form)}>确认</button></div>
    </Modal>
  );
}

function RefundApplyModal({
  open,
  form,
  selected,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  form: { amount: string; reason: string; reversal: string };
  selected: OrderRow | null;
  onChange: (form: { amount: string; reason: string; reversal: string }) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal id="refundApplyModal" title="发起退款二次确认" open={open} onClose={onClose}>
      <p>提交后将生成退款记录，状态默认已退款，并按资产回退处理写入审计。</p>
      <div className="form-stack">
        <label className="field">订单号<input value={selected?.orderNo || ''} readOnly /></label>
        <label className="field">退款金额<input value={form.amount} onChange={(event) => onChange({ ...form, amount: event.target.value })} /></label>
        <label className="field">资产回退处理<select value={form.reversal} onChange={(event) => onChange({ ...form, reversal: event.target.value })}><option>回收会员权益</option><option>扣回到账千寻币</option><option>无需回退</option><option>线下处理备注</option></select></label>
        <label className="field">退款原因<textarea value={form.reason} onChange={(event) => onChange({ ...form, reason: event.target.value })} /></label>
      </div>
      <div className="modal-actions"><button className="btn" type="button" onClick={onClose}>取消</button><button className="btn danger" type="button" onClick={onSubmit}>确认退款</button></div>
    </Modal>
  );
}

function ExportModal({ type, open, onClose, onConfirm }: { type: string; open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal id="exportModal" title={`${type}确认`} open={open} onClose={onClose}>
      <p>导出当前筛选条件下的数据，手机号、幂等键、退款原因等敏感字段按权限控制，并写入导出审计。</p>
      <div className="modal-actions"><button className="btn" type="button" onClick={onClose}>取消</button><button className="btn primary" type="button" onClick={onConfirm}>确认导出</button></div>
    </Modal>
  );
}

const commerceStyles = `
.commerce-demo-page {
  --bg: #f5f7fb;
  --surface: #ffffff;
  --surface-soft: #f8fafc;
  --line: #d9e2ec;
  --line-strong: #b8c4d4;
  --text: #172033;
  --muted: #667085;
  --brand: #2563eb;
  --brand-soft: #dbeafe;
  --mint: #059669;
  --mint-soft: #d1fae5;
  --amber: #d97706;
  --amber-soft: #fef3c7;
  --rose: #e11d48;
  --rose-soft: #ffe4e6;
  --shadow: 0 18px 42px rgba(23, 32, 51, 0.12);
  --radius: 8px;
  display: grid;
  gap: 24px;
  min-width: 0;
  color: var(--text);
  font-family: "Noto Sans SC", "Microsoft YaHei", "PingFang SC", "Segoe UI", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.55;
  letter-spacing: 0;
}
.commerce-demo-page * { box-sizing: border-box; }
.commerce-demo-page button,
.commerce-demo-page input,
.commerce-demo-page select,
.commerce-demo-page textarea { font: inherit; }
.commerce-demo-page .section-band {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: 0 12px 28px rgba(23, 32, 51, 0.06);
}
.commerce-demo-page .admin-page-inner { display: grid; gap: 16px; padding: 22px; background: #eef3fa; }
.commerce-demo-page .admin-page-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
.commerce-demo-page .admin-page-header h1 { margin: 0; font-size: 24px; line-height: 1.25; font-weight: 800; }
.commerce-demo-page .admin-page-header p { margin: 6px 0 0; color: var(--muted); }
.commerce-demo-page .admin-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.commerce-demo-page .admin-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
.commerce-demo-page .stat-card { padding: 14px; border: 1px solid var(--line); border-radius: var(--radius); background: #fff; }
.commerce-demo-page .stat-card strong { display: block; font-size: 20px; line-height: 1.35; font-weight: 800; }
.commerce-demo-page .stat-card span { color: var(--muted); font-size: 12px; }
.commerce-demo-page .config-workbench,
.commerce-demo-page .admin-panel { padding: 16px; border: 1px solid var(--line); border-radius: var(--radius); background: #fff; }
.commerce-demo-page .commerce-tabs { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.commerce-demo-page .commerce-tab { min-height: 34px; padding: 7px 11px; border: 1px solid var(--line); border-radius: 7px; background: #fff; color: #344054; font-size: 13px; font-weight: 800; }
.commerce-demo-page .commerce-tab.is-active { border-color: var(--brand); background: var(--brand-soft); color: var(--brand); }
.commerce-demo-page .config-panel { display: none; margin-top: 14px; }
.commerce-demo-page .config-panel.is-active { display: block; }
.commerce-demo-page .config-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
.commerce-demo-page .config-item { display: grid; gap: 8px; padding: 12px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface-soft); }
.commerce-demo-page .switch-line { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
.commerce-demo-page .mini-switch { display: inline-flex; align-items: center; justify-content: center; min-width: 48px; height: 24px; padding: 0 10px; border-radius: 99px; background: var(--mint-soft); color: var(--mint); font-size: 12px; font-weight: 800; }
.commerce-demo-page .mini-switch.off { background: #e5e7eb; color: #64748b; }
.commerce-demo-page .toolbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
.commerce-demo-page .table-wrap { overflow: auto; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); }
.commerce-demo-page table { width: 100%; border-collapse: collapse; }
.commerce-demo-page th,
.commerce-demo-page td { padding: 11px 12px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
.commerce-demo-page th { background: var(--surface-soft); color: #344054; font-size: 12px; font-weight: 800; }
.commerce-demo-page tr:last-child td { border-bottom: 0; }
.commerce-demo-page .query-panel { display: grid; gap: 12px; margin-bottom: 0; padding: 14px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface-soft); }
.commerce-demo-page .query-panel h2 { margin: 0; font-size: 15px; font-weight: 800; }
.commerce-demo-page .query-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; }
.commerce-demo-page .settings-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
.commerce-demo-page .control-field,
.commerce-demo-page .field { display: grid; gap: 5px; color: #344054; font-size: 12px; font-weight: 700; }
.commerce-demo-page .control-field input,
.commerce-demo-page .control-field select,
.commerce-demo-page .field input,
.commerce-demo-page .field select,
.commerce-demo-page .field textarea,
.commerce-demo-page table input,
.commerce-demo-page table select,
.commerce-demo-page table textarea { min-height: 34px; padding: 6px 8px; border: 1px solid var(--line-strong); border-radius: 7px; background: #fff; color: var(--text); }
.commerce-demo-page .field textarea { min-height: 84px; resize: vertical; }
.commerce-demo-page .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 38px; padding: 8px 13px; border: 1px solid var(--line-strong); border-radius: 7px; background: #fff; color: #344054; font-weight: 700; white-space: nowrap; }
.commerce-demo-page .btn.primary { border-color: var(--brand); background: var(--brand); color: #fff; }
.commerce-demo-page .btn.danger { border-color: var(--rose); background: var(--rose); color: #fff; }
.commerce-demo-page .btn:disabled { cursor: not-allowed; opacity: .52; }
.commerce-demo-page .tag { display: inline-flex; align-items: center; min-height: 26px; padding: 5px 10px; border: 1px solid var(--line); border-radius: 999px; background: #fff; color: #344054; font-size: 12px; font-weight: 700; }
.commerce-demo-page .tag.success { border-color: #a7f3d0; background: var(--mint-soft); color: var(--mint); }
.commerce-demo-page .tag.warning { border-color: #fde68a; background: var(--amber-soft); color: var(--amber); }
.commerce-demo-page .tag.danger { border-color: #fecdd3; background: var(--rose-soft); color: var(--rose); }
.commerce-demo-page .tag.brand { border-color: #bfdbfe; background: var(--brand-soft); color: var(--brand); }
.commerce-demo-page .empty-cell { padding: 28px 16px; text-align: center; color: var(--muted); background: #fff; }
.commerce-demo-page .empty-state { border: 1px dashed var(--line-strong); border-radius: var(--radius); padding: 28px 16px; text-align: center; color: var(--muted); background: #fff; }
.commerce-demo-page .notice { display: block; margin: 12px 0; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface-soft); color: #344054; }
.commerce-demo-page .notice strong { display: block; margin-bottom: 4px; color: #172033; }
.commerce-demo-page .mobile-icon { display: inline-grid; width: 30px; height: 30px; place-items: center; border: 1px solid #c7ddff; border-radius: 9px; background: #eff6ff; color: var(--brand); font-size: 16px; font-weight: 900; line-height: 1; }
.commerce-demo-page .icon-config-cell { display: inline-flex; gap: 8px; align-items: center; }
.commerce-demo-page .icon-config-input { width: 150px; min-height: 32px; padding: 6px 8px; border: 1px solid var(--line-strong); border-radius: 7px; background: #fff; color: var(--text); font-size: 12px; }
.commerce-demo-page .number-input { width: 88px; }
.commerce-demo-page .helper { color: var(--muted); font-size: 12px; }
.commerce-demo-page .amount-plus { color: var(--mint); font-weight: 800; }
.commerce-demo-page .amount-minus { color: var(--rose); font-weight: 800; }
.commerce-demo-page .pagination { display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 12px; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface-soft); color: var(--muted); font-size: 13px; }
.commerce-demo-page .modal-backdrop,
.commerce-demo-page .drawer-backdrop { position: fixed; inset: 0; z-index: 60; display: none; overflow-y: auto; background: rgba(15, 23, 42, 0.42); }
.commerce-demo-page .modal-backdrop.is-open,
.commerce-demo-page .drawer-backdrop.is-open { display: block; }
.commerce-demo-page .modal { width: min(560px, calc(100% - 28px)); max-height: calc(100vh - 32px); margin: 16px auto; padding: 18px; overflow-y: auto; border-radius: var(--radius); background: #fff; box-shadow: var(--shadow); }
.commerce-demo-page #vipPackageEditModal .form-stack,
.commerce-demo-page #coinPackageEditModal .form-stack { max-height: calc(100vh - 285px); overflow-y: auto; padding-right: 4px; }
.commerce-demo-page #coinSceneEditModal .form-stack { max-height: calc(100vh - 285px); overflow-y: auto; padding-right: 4px; }
.commerce-demo-page .modal h2,
.commerce-demo-page .drawer h2 { margin: 0 0 10px; font-size: 18px; font-weight: 800; }
.commerce-demo-page .drawer { position: absolute; top: 0; right: 0; width: min(680px, 100%); min-height: 100%; padding: 20px; background: #fff; box-shadow: var(--shadow); }
.commerce-demo-page .drawer-body { display: grid; gap: 14px; }
.commerce-demo-page .modal-actions,
.commerce-demo-page .drawer-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.commerce-demo-page .drawer-section { display: grid; gap: 8px; padding: 12px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface-soft); }
.commerce-demo-page .drawer-section h3 { margin: 0; font-weight: 800; }
.commerce-demo-page .drawer-kv { display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 8px; font-size: 13px; }
.commerce-demo-page .drawer-kv span { color: var(--muted); }
.commerce-demo-page .form-stack { display: grid; gap: 12px; }
@media (max-width: 980px) {
  .commerce-demo-page .admin-summary-grid { grid-template-columns: 1fr; }
  .commerce-demo-page .admin-page-header { display: grid; }
}
`;
