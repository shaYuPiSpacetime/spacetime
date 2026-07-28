import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoaderCircle, RefreshCcw, Save } from 'lucide-react';
import { getCurrentPromotionRule, publishPromotionRule } from '@/api/promotion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { showToast } from '@/components/ui/toast';
import {
  createEmptyRule,
  normalizeRule,
  RuleEditor,
  validateRule,
} from '@/features/promotion/rules/RuleEditor';
import {
  ConfirmActionDialog,
  formatDateTime,
  getErrorMessage,
  PromotionPageHeader,
} from '@/features/promotion/shared/promotionUi';
import { usePermission } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';
import type { PromotionRuleConfig, PromotionSourceType } from '@/types/promotion';

const SOURCES: { key: PromotionSourceType; label: string }[] = [
  { key: 'normal_user', label: '普通邀请奖励' },
  { key: 'campus_agent', label: '推广员奖励' },
];

type RuleMap = Record<PromotionSourceType, PromotionRuleConfig>;

function initialRuleMap(): RuleMap {
  return {
    normal_user: createEmptyRule('normal_user'),
    campus_agent: createEmptyRule('campus_agent'),
  };
}

export default function PromotionRulesPage() {
  const { hasPermission } = usePermission();
  const [activeSource, setActiveSource] = useState<PromotionSourceType>('normal_user');
  const [rules, setRules] = useState<RuleMap>(initialRuleMap);
  const [savedRules, setSavedRules] = useState<RuleMap>(initialRuleMap);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [normalResponse, agentResponse] = await Promise.all([
        getCurrentPromotionRule('normal_user'),
        getCurrentPromotionRule('campus_agent'),
      ]);
      const next = {
        normal_user: normalizeRule(normalResponse.data),
        campus_agent: normalizeRule(agentResponse.data),
      };
      setRules(next);
      setSavedRules(next);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRules();
  }, [fetchRules]);

  const activeRule = rules[activeSource];
  const dirty = useMemo(
    () => JSON.stringify(rules) !== JSON.stringify(savedRules),
    [rules, savedRules],
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const canPublish = activeSource === 'normal_user'
    ? hasPermission('promotion:rule:normal:publish')
    : hasPermission('promotion:rule:agent:publish');

  const requestPublish = () => {
    const nextError = validateRule(activeRule);
    setValidationError(nextError);
    if (nextError) {
      showToast(nextError, 'error');
      return;
    }
    setConfirmOpen(true);
  };

  const publish = async () => {
    setSaving(true);
    try {
      const response = await publishPromotionRule({
        sourceType: activeRule.sourceType,
        rewardMode: activeRule.rewardMode,
        expectedVersion: activeRule.version,
        events: activeRule.events.map((item) => ({
          ...item,
          enabled: item.eventType === 'register_reward' ? true : item.enabled,
        })),
        tiers: activeRule.rewardMode === 'ladder' ? activeRule.tiers : [],
      });
      const published = normalizeRule(response.data);
      setRules((current) => ({ ...current, [activeSource]: published }));
      setSavedRules((current) => ({ ...current, [activeSource]: published }));
      setValidationError('');
      setConfirmOpen(false);
      showToast('规则发布成功，新版本仅对后续事件生效', 'success');
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setValidationError(message);
    } finally {
      setSaving(false);
    }
  };

  const cancelChanges = () => {
    setRules((current) => ({
      ...current,
      [activeSource]: normalizeRule(savedRules[activeSource]),
    }));
    setValidationError('');
    showToast('已恢复当前已发布配置', 'info');
  };

  return (
    <div className="min-w-0 space-y-4">
      <PromotionPageHeader
        title="推广规则配置"
        description="完成注册成功、关系永久有效；普通邀请与推广员规则独立发布。"
        actions={
          <>
            <span className="text-xs text-muted-foreground">
              当前 V{activeRule.version} · {formatDateTime(activeRule.publishedAt)}
            </span>
            <Button variant="outline" onClick={cancelChanges} disabled={!dirty || loading || saving}>
              取消
            </Button>
            {canPublish && (
              <Button onClick={requestPublish} disabled={!dirty || loading || saving}>
                <Save className="mr-2 h-4 w-4" />
                保存并发布
              </Button>
            )}
          </>
        }
      />

      <div role="tablist" aria-label="奖励规则来源" className="flex w-fit rounded-lg bg-muted p-1">
        {SOURCES.map((source) => (
          <button
            key={source.key}
            type="button"
            role="tab"
            aria-selected={activeSource === source.key}
            onClick={() => {
              setActiveSource(source.key);
              setValidationError('');
            }}
            className={cn(
              'rounded-md px-5 py-2 text-sm font-medium transition-colors',
              activeSource === source.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {source.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          {loading ? (
            <div className="grid h-72 place-items-center text-sm text-muted-foreground">
              <div className="text-center">
                <LoaderCircle className="mx-auto mb-3 h-7 w-7 animate-spin text-primary" />
                正在加载当前规则…
              </div>
            </div>
          ) : error ? (
            <div className="grid h-72 place-items-center text-center">
              <div>
                <p className="font-medium">规则加载失败，请重试</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                <Button className="mt-4" variant="outline" onClick={() => void fetchRules()}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  重新加载
                </Button>
              </div>
            </div>
          ) : (
            <RuleEditor
              value={activeRule}
              disabled={!canPublish}
              onChange={(next) => {
                setRules((current) => ({ ...current, [activeSource]: next }));
                setValidationError('');
              }}
            />
          )}

          {validationError && (
            <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {validationError}
            </p>
          )}
          {!loading && !error && !canPublish && (
            <p className="mt-4 rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
              当前账号为只读权限，可查看规则但不能修改或发布。
            </p>
          )}
        </CardContent>
      </Card>

      <ConfirmActionDialog
        open={confirmOpen}
        title="确认发布奖励规则？"
        description={`将发布${activeSource === 'normal_user' ? '普通邀请' : '推广员'}规则 V${activeRule.version + 1}。新版本只影响发布后发生的事件，历史奖励不会追溯重算。`}
        confirmText="确认发布"
        loading={saving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void publish()}
      />
    </div>
  );
}
