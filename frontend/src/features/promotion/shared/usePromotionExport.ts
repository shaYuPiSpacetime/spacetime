import { useCallback, useEffect, useRef, useState } from 'react';
import {
  downloadPromotionExportFile,
  getPromotionExportTask,
  type ApiResponse,
} from '@/api/promotion';
import { showToast } from '@/components/ui/toast';
import type { PromotionExportTask } from '@/types/promotion';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_COUNT = 120;

export function usePromotionExport() {
  const [exporting, setExporting] = useState(false);
  const timerRef = useRef<number | null>(null);
  const runRef = useRef(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    runRef.current += 1;
    stopTimer();
  }, [stopTimer]);

  const download = useCallback(async (task: PromotionExportTask) => {
    const blob = await downloadPromotionExportFile(task.taskNo);
    if (!blob.size) throw new Error('导出文件为空');
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = task.fileName || `${task.taskNo}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }, []);

  const poll = useCallback(async (taskNo: string, runId: number): Promise<void> => {
    for (let count = 0; count <= MAX_POLL_COUNT; count += 1) {
      if (runId !== runRef.current) return;
      const response = await getPromotionExportTask(taskNo);
      const task = response.data;
      if (task.status === 'success') {
        await download(task);
        if (runId === runRef.current) {
          setExporting(false);
          showToast(`导出完成，共 ${task.rowCount ?? 0} 条`, 'success');
        }
        return;
      }
      if (task.status === 'failed') {
        if (runId === runRef.current) {
          setExporting(false);
          showToast('导出任务失败，请调整筛选条件后重试', 'error');
        }
        return;
      }
      if (count === MAX_POLL_COUNT) {
        if (runId === runRef.current) {
          setExporting(false);
          showToast('导出任务仍在处理中，请稍后重新导出或联系管理员', 'error');
        }
        return;
      }
      await new Promise<void>((resolve) => {
        timerRef.current = window.setTimeout(resolve, POLL_INTERVAL_MS);
      });
    }
  }, [download]);

  const startExport = useCallback(async (
    createTask: () => Promise<ApiResponse<PromotionExportTask>>,
  ) => {
    if (exporting) return;
    stopTimer();
    const runId = runRef.current + 1;
    runRef.current = runId;
    setExporting(true);
    try {
      const response = await createTask();
      showToast(`导出任务 ${response.data.taskNo} 已创建，完成后将自动下载`, 'info');
      await poll(response.data.taskNo, runId);
    } catch (error) {
      if (runId === runRef.current) {
        setExporting(false);
        showToast(error instanceof Error && error.message ? `导出失败：${error.message}` : '导出失败，请稍后重试', 'error');
      }
    }
  }, [exporting, poll, stopTimer]);

  return { exporting, startExport };
}
