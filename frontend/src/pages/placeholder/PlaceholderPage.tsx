import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PlaceholderPageProps {
  title: string;
  icon?: React.ReactNode;
}

export function PlaceholderPage({ title, icon }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {icon}
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">页面建设中</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{title}模块正在开发中，敬请期待。</p>
        </CardContent>
      </Card>
    </div>
  );
}
