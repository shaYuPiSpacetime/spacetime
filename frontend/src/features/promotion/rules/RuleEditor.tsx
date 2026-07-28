import { HelpCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type {
  PromotionRuleConfig,
  PromotionRuleEvent,
  PromotionRuleTier,
  PromotionSourceType,
} from '@/types/promotion';

const EVENT_LABELS: Record<PromotionRuleEvent['eventType'], string> = {
  register_reward: '完成注册',
  profile_complete_reward: '完善资料',
  verify_complete_reward: '认证完成',
  first_vip_reward: '首次会员',
  first_coin_recharge_reward: '首次充值',
};

export const REQUIRED_RULE_EVENTS = Object.entries(EVENT_LABELS).map(([eventType, eventLabel]) => ({
  eventType: eventType as PromotionRuleEvent['eventType'],
  eventLabel,
  enabled: eventType === 'register_reward',
  amount: 0,
}));

export function createEmptyRule(sourceType: PromotionSourceType): PromotionRuleConfig {
  return {
    sourceType,
    rewardMode: 'fixed',
    version: 0,
    events: REQUIRED_RULE_EVENTS.map((item) => ({ ...item })),
    tiers: [],
  };
}

export function normalizeRule(rule: PromotionRuleConfig): PromotionRuleConfig {
  const eventMap = new Map(rule.events.map((item) => [item.eventType, item]));
  return {
    ...rule,
    events: REQUIRED_RULE_EVENTS.map((fallback) => {
      const current = eventMap.get(fallback.eventType);
      return {
        ...fallback,
        ...current,
        eventLabel: current?.eventLabel || fallback.eventLabel,
        enabled: fallback.eventType === 'register_reward' ? true : Boolean(current?.enabled),
        amount: Number(current?.amount || 0),
      };
    }),
    tiers: (rule.tiers || []).map((item) => ({
      threshold: Number(item.threshold || 0),
      amount: Number(item.amount || 0),
      enabled: Boolean(item.enabled),
    })),
  };
}

export function validateRule(rule: PromotionRuleConfig) {
  const unit = rule.sourceType === 'normal_user' ? '千寻币' : '元';
  const amountValid = (amount: number, positive = false) => {
    if (!Number.isFinite(amount) || amount < (positive ? Number.EPSILON : 0)) return false;
    if (rule.sourceType === 'normal_user') return Number.isInteger(amount);
    return Number(amount.toFixed(2)) === amount;
  };

  const register = rule.events.find((item) => item.eventType === 'register_reward');
  if (!register?.enabled) return '完成注册奖励为固定业务口径，不可关闭';
  for (const event of rule.events) {
    if (!amountValid(event.amount)) return `${EVENT_LABELS[event.eventType]}金额必须是合法的非负${unit}金额`;
  }

  if (rule.rewardMode === 'ladder') {
    if (!rule.tiers.length || !rule.tiers.some((item) => item.enabled)) return '阶梯奖励至少需要一个启用档位';
    let previous = 0;
    for (const tier of rule.tiers) {
      if (!Number.isInteger(tier.threshold) || tier.threshold <= previous) {
        return '累计成功人数必须为严格递增且不重复的正整数';
      }
      if (!amountValid(tier.amount, true)) return `阶梯额外奖励必须是大于0的合法${unit}金额`;
      previous = tier.threshold;
    }
  }
  return '';
}

export function RuleEditor({
  value,
  disabled,
  onChange,
}: {
  value: PromotionRuleConfig;
  disabled: boolean;
  onChange: (next: PromotionRuleConfig) => void;
}) {
  const isNormal = value.sourceType === 'normal_user';
  const unit = isNormal ? '千寻币' : '元';
  const amountStep = isNormal ? '1' : '0.01';

  const updateEvent = (index: number, patch: Partial<PromotionRuleEvent>) => {
    onChange({
      ...value,
      events: value.events.map((item, currentIndex) => currentIndex === index ? { ...item, ...patch } : item),
    });
  };

  const updateTier = (index: number, patch: Partial<PromotionRuleTier>) => {
    onChange({
      ...value,
      tiers: value.tiers.map((item, currentIndex) => currentIndex === index ? { ...item, ...patch } : item),
    });
  };

  const addTier = () => {
    const lastThreshold = value.tiers[value.tiers.length - 1]?.threshold || 0;
    onChange({
      ...value,
      tiers: [...value.tiers, { threshold: lastThreshold + 5, amount: 1, enabled: true }],
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">固定业务口径</span>
        <strong>好友完成注册即邀请成功 · 关系永久有效</strong>
      </div>

      <fieldset disabled={disabled} className="space-y-5 disabled:opacity-70">
        <div>
          <p className="mb-2 text-sm font-medium">奖励模式</p>
          <div className="flex flex-wrap items-center gap-5 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name={`${value.sourceType}-reward-mode`}
                value="fixed"
                aria-label="固定奖励"
                checked={value.rewardMode === 'fixed'}
                onChange={() => onChange({ ...value, rewardMode: 'fixed' })}
              />
              固定奖励
            </label>
            <label className="relative flex cursor-pointer items-center gap-2 group">
              <input
                type="radio"
                name={`${value.sourceType}-reward-mode`}
                value="ladder"
                aria-label="阶梯奖励"
                checked={value.rewardMode === 'ladder'}
                onChange={() => onChange({ ...value, rewardMode: 'ladder' })}
              />
              阶梯奖励
              <button
                type="button"
                aria-label="查看阶梯奖励计算规则"
                className="rounded-full text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
              <span
                role="tooltip"
                className="invisible absolute left-0 top-7 z-20 w-[min(520px,calc(100vw-64px))] rounded-lg bg-slate-900 p-4 text-xs font-normal leading-6 text-white opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
              >
                阶梯奖励为命中档位时的一次性额外奖励。每位被邀请人完成注册时，先发放完成注册奖励；
                仅当累计成功人数恰好达到某个档位时，再额外生成一条该档位奖励流水。第1人只发基础奖励，
                第5人命中5人档时发两条流水，第8人不重复获得5人档奖励。
              </span>
            </label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">切换模式只影响发布后的新事件，历史奖励仍按原规则快照展示。</p>
        </div>

        <div>
          <h2 className="mb-3 text-base font-semibold">奖励事件</h2>
          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-[minmax(160px,1fr)_180px_120px] bg-muted/70 px-4 py-3 text-xs font-semibold text-muted-foreground">
              <span>奖励事件</span>
              <span>奖励金额（{unit}）</span>
              <span>状态</span>
            </div>
            {value.events.map((event, index) => {
              const fixed = event.eventType === 'register_reward';
              return (
                <div
                  key={event.eventType}
                  className="grid grid-cols-[minmax(160px,1fr)_180px_120px] items-center border-t px-4 py-3 text-sm"
                >
                  <span className="font-medium">{EVENT_LABELS[event.eventType]}</span>
                  <Input
                    className="w-36"
                    type="number"
                    min={0}
                    step={amountStep}
                    aria-label={`${EVENT_LABELS[event.eventType]}奖励金额`}
                    value={event.amount}
                    onChange={(eventInput) => updateEvent(index, { amount: Number(eventInput.target.value) })}
                  />
                  {fixed ? (
                    <label className="flex items-center gap-2 font-medium text-primary">
                      <input
                        type="checkbox"
                        aria-label="完成注册固定开启"
                        checked
                        disabled
                        readOnly
                      />
                      固定开启
                    </label>
                  ) : (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        aria-label={`${EVENT_LABELS[event.eventType]}启用状态`}
                        checked={event.enabled}
                        onChange={(eventInput) => updateEvent(index, { enabled: eventInput.target.checked })}
                      />
                      {event.enabled ? '启用' : '停用'}
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {value.rewardMode === 'ladder' && (
          <section className="rounded-lg border bg-slate-50/70 p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">阶梯奖励配置</h2>
                <p className="mt-1 text-xs text-muted-foreground">累计人数恰好命中档位时，与完成注册奖励分成两条流水。</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addTier}>
                <Plus className="mr-2 h-4 w-4" />
                增加档位
              </Button>
            </div>

            <div className="space-y-2">
              {value.tiers.map((tier, index) => (
                <div
                  key={`${index}-${tier.threshold}`}
                  data-testid="promotion-tier-row"
                  className="grid grid-cols-[minmax(120px,1fr)_minmax(140px,1fr)_100px_36px] items-end gap-3 rounded-md border bg-card p-3"
                >
                  <label className="grid gap-1.5 text-xs text-muted-foreground">
                    累计成功人数
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      aria-label={`第${index + 1}档累计成功人数`}
                      value={tier.threshold}
                      onChange={(event) => updateTier(index, { threshold: Number(event.target.value) })}
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs text-muted-foreground">
                    额外奖励（{unit}）
                    <Input
                      type="number"
                      min={isNormal ? 1 : 0.01}
                      step={amountStep}
                      aria-label={`第${index + 1}档额外奖励`}
                      value={tier.amount}
                      onChange={(event) => updateTier(index, { amount: Number(event.target.value) })}
                    />
                  </label>
                  <label className="flex h-9 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={tier.enabled}
                      onChange={(event) => updateTier(index, { enabled: event.target.checked })}
                    />
                    {tier.enabled ? '启用' : '停用'}
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`删除第${index + 1}档`}
                    disabled={value.tiers.length === 1}
                    onClick={() => onChange({ ...value, tiers: value.tiers.filter((_, currentIndex) => currentIndex !== index) })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {!value.tiers.length && (
                <button
                  type="button"
                  onClick={addTier}
                  className={cn(
                    'w-full rounded-md border border-dashed px-4 py-8 text-sm text-muted-foreground',
                    'transition-colors hover:border-primary hover:text-primary',
                  )}
                >
                  暂无档位，点击新增第一个档位
                </button>
              )}
            </div>
          </section>
        )}
      </fieldset>
    </div>
  );
}
