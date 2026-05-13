import { Users, UserCheck, Heart, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const stats = [
  { label: '注册用户', value: '12,846', change: '+12%', icon: Users, color: 'text-primary' },
  { label: '认证用户', value: '8,234', change: '+8%', icon: UserCheck, color: 'text-success' },
  { label: '成功牵线', value: '1,423', change: '+24%', icon: Heart, color: 'text-destructive' },
  { label: '本月新增', value: '386', change: '+18%', icon: TrendingUp, color: 'text-warning' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">首页概览</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                    <p className="text-xs text-success mt-1">{stat.change} 较上月</p>
                  </div>
                  <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近活动</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">活动数据加载中…</p>
        </CardContent>
      </Card>
    </div>
  );
}
