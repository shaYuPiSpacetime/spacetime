import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { changeSensitiveWordStatus, createSensitiveWord, deleteSensitiveWord, getSensitiveWord, getSensitiveWordCategories, getSensitiveWords, updateSensitiveWord } from '@/api/sensitiveWord';
import { showToast } from '@/components/ui/toast';
import type { SensitiveWordCategoryVO, SensitiveWordQuery, SensitiveWordSaveRequest, SensitiveWordStatus, SensitiveWordVO } from '@/types/sensitiveWord';

const emptyFilters = { keyword: '', categoryCode: '', status: '' };
const newForm = (): SensitiveWordSaveRequest => ({ word: '', categoryCode: '', status: 'ENABLED', remark: '' });
const trimWord = (value: string) => value.replace(/^[\u0009-\u000D\u001C-\u0020\u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+|[\u0009-\u000D\u001C-\u0020\u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+$/g, '');
const message = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;

/** 敏感词列表、表单及维护流程；写成功与列表重载失败分开处理。 */
export function useSensitiveWords(canList: boolean) {
  const [records, setRecords] = useState<SensitiveWordVO[]>([]);
  const [categories, setCategories] = useState<SensitiveWordCategoryVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(newForm);
  const [deleting, setDeleting] = useState<SensitiveWordVO | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const listRequestId = useRef(0);
  const categoryRequestId = useRef(0);
  const query = useMemo<SensitiveWordQuery>(() => ({
    page, size, keyword: trimWord(filters.keyword) || undefined,
    categoryCode: filters.categoryCode || undefined,
    status: filters.status ? filters.status as SensitiveWordStatus : undefined,
  }), [filters, page, size]);

  const loadCategories = useCallback(async () => {
    if (!canList) return;
    const requestId = ++categoryRequestId.current;
    setCategoryError(null);
    try {
      const response = await getSensitiveWordCategories();
      if (requestId === categoryRequestId.current) setCategories(response.data ?? []);
    } catch (cause) {
      if (requestId === categoryRequestId.current) setCategoryError(message(cause, '分类加载失败'));
    }
  }, [canList]);

  const refresh = useCallback(async () => {
    if (!canList) return false;
    const requestId = ++listRequestId.current;
    setLoading(true);
    setError(null);
    try {
      const response = await getSensitiveWords(query);
      if (requestId !== listRequestId.current) return false;
      const data = response.data;
      const lastPage = Math.max(1, Math.ceil(data.total / query.size));
      setTotal(data.total);
      if (query.page > lastPage) {
        setPage(lastPage);
      } else {
        setRecords(data.records ?? []);
      }
      return true;
    } catch (cause) {
      if (requestId === listRequestId.current) {
        setError(message(cause, '敏感词加载失败'));
        setRecords([]);
        setTotal(0);
      }
      return false;
    } finally {
      if (requestId === listRequestId.current) setLoading(false);
    }
  }, [canList, query]);

  // An in-flight write may finish after the user changes filters or pages.
  const latestRefresh = useRef(refresh);
  latestRefresh.current = refresh;

  useEffect(() => {
    if (canList) void loadCategories();
    else {
      setRecords([]); setCategories([]); setTotal(0); setLoading(false);
      setDialogOpen(false); setDeleting(null);
    }
    return () => { categoryRequestId.current += 1; };
  }, [canList, loadCategories]);
  useEffect(() => {
    void refresh();
    return () => { listRequestId.current += 1; };
  }, [refresh]);

  const startAction = () => {
    if (busyRef.current) return false;
    busyRef.current = true; setBusy(true); return true;
  };
  const finishAction = () => { busyRef.current = false; setBusy(false); };
  const openCreate = () => {
    if (busyRef.current) return;
    setEditingId(null); setForm(newForm()); setFormError(null); setDialogOpen(true);
  };
  const openEdit = async (record: SensitiveWordVO) => {
    if (!startAction()) return;
    try {
      const item = (await getSensitiveWord(record.id)).data;
      setEditingId(item.id);
      setForm({ word: item.word, categoryCode: item.categoryCode, status: item.status, remark: item.remark ?? '' });
      setFormError(null); setDialogOpen(true);
    } catch (cause) { setError(message(cause, '敏感词详情加载失败')); }
    finally { finishAction(); }
  };
  const closeDialog = () => { if (!busyRef.current) setDialogOpen(false); };
  const save = async () => {
    const word = trimWord(form.word);
    const problem = !word ? '请填写敏感词' : word.length > 256 ? '敏感词不能超过256个字符'
      : !categories.some(item => item.code === form.categoryCode) ? '请选择有效分类'
      : (form.remark?.length ?? 0) > 500 ? '备注不能超过500个字符' : null;
    if (problem) { setFormError(problem); return; }
    if (!startAction()) return;
    setFormError(null);
    try {
      const data = { ...form, word, remark: form.remark ?? '' };
      if (editingId !== null) await updateSensitiveWord(editingId, data);
      else await createSensitiveWord(data);
    } catch (cause) {
      setFormError(message(cause, '保存失败'));
      finishAction(); return;
    }
    setDialogOpen(false);
    showToast('敏感词保存成功', 'success');
    await latestRefresh.current();
    finishAction();
  };
  const toggleStatus = async (record: SensitiveWordVO) => {
    if (!startAction()) return;
    try {
      await changeSensitiveWordStatus(record.id, record.status === 'ENABLED' ? 'DISABLED' : 'ENABLED');
    } catch (cause) {
      setError(message(cause, '状态更新失败'));
      finishAction(); return;
    }
    showToast('状态更新成功', 'success');
    await latestRefresh.current();
    finishAction();
  };
  const remove = async () => {
    if (!deleting || !startAction()) return;
    try { await deleteSensitiveWord(deleting.id); }
    catch (cause) {
      setError(message(cause, '删除失败'));
      finishAction(); return;
    }
    setDeleting(null);
    showToast('敏感词已删除', 'success');
    await latestRefresh.current();
    finishAction();
  };
  // Match admission pages: every filter change queries immediately and starts at page one.
  const changeFilters = (next: typeof emptyFilters) => { setFilters(next); setPage(1); };
  const search = () => { if (page === 1) void refresh(); else setPage(1); };
  const reset = () => { setFilters({ ...emptyFilters }); setPage(1); };
  const changeSize = (next: number) => { setSize(next); setPage(1); };
  return { records, categories, total, page, size, filters, setFilters: changeFilters, loading, busy, error, categoryError,
    formError, dialogOpen, editingId, form, setForm, deleting, setDeleting, setPage, changeSize,
    refresh, loadCategories, search, reset, openCreate, openEdit, closeDialog, save, toggleStatus, remove };
}
