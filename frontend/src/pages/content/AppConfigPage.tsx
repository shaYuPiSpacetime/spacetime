import { useState, useEffect, useCallback } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { getAppConfigList, batchSaveAppConfig, type AppConfigVO } from '@/api/content';
import { cn } from '@/lib/utils';

const CONFIG_TYPE_LABELS: Record<string, string> = {
  TEXT: '文本',
  NUMBER: '数字',
  BOOLEAN: '开关',
  JSON: 'JSON',
};

const BOOL_OPTIONS = [
  { value: 'true', label: '开启' },
  { value: 'false', label: '关闭' },
];

type TabKey = 'AGREEMENT' | 'ABOUT' | 'SEARCH' | 'MY_PAGE' | 'SETTINGS_PAGE' | 'SECURITY_CENTER';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'AGREEMENT', label: '协议' },
  { key: 'ABOUT', label: '关于' },
  { key: 'SEARCH', label: '搜索' },
  { key: 'MY_PAGE', label: '我的页面' },
  { key: 'SETTINGS_PAGE', label: '设置页面' },
  { key: 'SECURITY_CENTER', label: '安全中心' },
];

export default function AppConfigPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('AGREEMENT');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <ConfigGroupPanel group={activeTab} />
    </div>
  );
}

function ConfigGroupPanel({ group }: { group: string }) {
  const [items, setItems] = useState<AppConfigVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAppConfigList(group);
      const data = (res as any).data;
      setItems(Array.isArray(data) ? data : data?.records ?? []);
    } finally {
      setLoading(false);
    }
  }, [group]);

  useEffect(() => { fetchList(); }, [fetchList]);

  function updateItem(index: number, field: keyof AppConfigVO, value: any) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await batchSaveAppConfig(items.map((item) => ({
        id: item.id,
        configKey: item.configKey,
        configValue: item.configValue,
        configGroup: item.configGroup,
        configType: item.configType,
        publicVisible: item.publicVisible,
        status: item.status,
        remark: item.remark,
      })));
      fetchList();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Card><CardContent className="py-8 text-center text-muted-foreground">加载中...</CardContent></Card>;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>配置项</CardTitle>
        <Button onClick={handleSave} disabled={saving}><Save className="mr-1 h-4 w-4" />{saving ? '保存中...' : '保存'}</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">暂无配置项</div>
        ) : items.map((item, index) => (
          <div key={item.id || index} className="flex items-center gap-3 rounded-md border p-3">
            <div className="w-40 shrink-0">
              <div className="text-sm font-medium">{item.configKey}</div>
              <div className="text-xs text-muted-foreground">{item.remark || '-'}</div>
            </div>
            {item.configType === 'BOOLEAN' ? (
              <Select className="flex-1" options={BOOL_OPTIONS} value={item.configValue} onChange={(v) => updateItem(index, 'configValue', v)} />
            ) : (
              <Input className="flex-1" type={item.configType === 'NUMBER' ? 'number' : 'text'} value={item.configValue} onChange={(e) => updateItem(index, 'configValue', e.target.value)} />
            )}
            <Badge variant="secondary">{CONFIG_TYPE_LABELS[item.configType] ?? item.configType}</Badge>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={item.publicVisible === 1} onChange={(e) => updateItem(index, 'publicVisible', e.target.checked ? 1 : 0)} />
              公开
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={item.status === 'ENABLED'} onChange={(e) => updateItem(index, 'status', e.target.checked ? 'ENABLED' : 'DISABLED')} />
              启用
            </label>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
