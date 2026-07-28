import { useCallback, useEffect, useState } from 'react';
import { Clipboard, Download, LoaderCircle, RefreshCcw } from 'lucide-react';
import { downloadPromotionAgentQrImage, getPromotionAgentQrCode } from '@/api/promotion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { showToast } from '@/components/ui/toast';
import { getErrorMessage } from '@/features/promotion/shared/promotionUi';
import type { PromotionAgentListItem, PromotionAgentQrCode } from '@/types/promotion';

export function AgentQrDialog({
  agent,
  onClose,
}: {
  agent: PromotionAgentListItem | null;
  onClose: () => void;
}) {
  const [qrCode, setQrCode] = useState<PromotionAgentQrCode | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const clearObjectUrl = useCallback(() => {
    setObjectUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return '';
    });
  }, []);

  const loadQrCode = useCallback(async () => {
    if (!agent) return;
    setLoading(true);
    setError('');
    clearObjectUrl();
    setImageBlob(null);
    try {
      const metadataResponse = await getPromotionAgentQrCode(agent.agentNo);
      const metadata = metadataResponse.data;
      const blob = await downloadPromotionAgentQrImage(metadata.imageUrl);
      if (!blob.size || !blob.type.startsWith('image/')) {
        throw new Error('二维码图片响应无效');
      }
      const nextObjectUrl = URL.createObjectURL(blob);
      setQrCode(metadata);
      setImageBlob(blob);
      setObjectUrl(nextObjectUrl);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [agent, clearObjectUrl]);

  useEffect(() => {
    setQrCode(null);
    setImageBlob(null);
    setError('');
    clearObjectUrl();
    if (agent) void loadQrCode();
    return clearObjectUrl;
  }, [agent, clearObjectUrl, loadQrCode]);

  const saveImage = () => {
    if (!objectUrl || !agent) return;
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${agent.agentNo}-qrcode.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('二维码图片已开始下载', 'success');
  };

  const copyImage = async () => {
    if (!imageBlob) return;
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      showToast('当前浏览器不支持复制图片，请使用“保存成图片”', 'error');
      return;
    }
    try {
      const pngBlob = imageBlob.type === 'image/png'
        ? imageBlob
        : await createImageBitmap(imageBlob).then(async (bitmap) => {
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
          bitmap.close();
          return new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('图片转换失败')), 'image/png');
          });
        });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
      showToast('二维码图片已复制', 'success');
    } catch {
      showToast('浏览器拒绝复制图片，请使用“保存成图片”', 'error');
    }
  };

  return (
    <Dialog open={Boolean(agent)} onClose={onClose} className="max-w-md">
      <div role="dialog" aria-modal="true" aria-label="代理专属二维码">
        <DialogHeader className="pr-8 text-center sm:text-center">
          <DialogTitle>代理专属二维码</DialogTitle>
          <DialogDescription>
            {agent ? `${agent.agentName} · ${agent.agentNo}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5">
          {loading ? (
            <div className="grid h-72 place-items-center rounded-xl border bg-muted/30 text-sm text-muted-foreground">
              <div className="text-center"><LoaderCircle className="mx-auto mb-3 h-7 w-7 animate-spin text-primary" />正在加载永久二维码…</div>
            </div>
          ) : error ? (
            <div className="grid h-72 place-items-center rounded-xl border bg-muted/30 text-center">
              <div>
                <p className="font-medium">二维码加载失败</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                <Button className="mt-4" variant="outline" onClick={() => void loadQrCode()}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  重试生成
                </Button>
              </div>
            </div>
          ) : objectUrl ? (
            <div className="mx-auto grid h-72 w-72 place-items-center rounded-xl border bg-white p-5 shadow-sm">
              <img src={objectUrl} alt={`${agent?.agentName || ''}专属二维码`} className="h-full w-full object-contain" />
            </div>
          ) : null}
        </div>

        {qrCode && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            二维码永久复用 · 小程序路径 {qrCode.miniappPath}
          </p>
        )}
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="outline" onClick={saveImage} disabled={!imageBlob}>
            <Download className="mr-2 h-4 w-4" />
            保存成图片
          </Button>
          <Button onClick={() => void copyImage()} disabled={!imageBlob}>
            <Clipboard className="mr-2 h-4 w-4" />
            复制图片
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
