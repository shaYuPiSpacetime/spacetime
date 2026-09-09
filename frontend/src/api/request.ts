import axios, { type InternalAxiosRequestConfig } from 'axios';
import { showToast } from '@/components/ui/toast';

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 由认证 store 注册，避免请求层与 store 相互导入。
let sessionExpiredHandler: ((token: string) => void) | undefined;
export function setSessionExpiredHandler(handler: (token: string) => void) {
  sessionExpiredHandler = handler;
}

function isLoginRequest(config?: InternalAxiosRequestConfig) {
  return config?.url?.split('?')[0].replace(/\/$/, '').endsWith('/admin/login');
}

function handleSessionExpired(config?: InternalAxiosRequestConfig) {
  if (isLoginRequest(config)) return;
  const token = config?.headers.get('X-Auth-Token');
  if (typeof token === 'string' && token) sessionExpiredHandler?.(token);
}

// 显式指定的 token（例如退出时的原会话）不能被后来的登录覆盖。
request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && !isLoginRequest(config) && !config.headers.has('X-Auth-Token')) {
    config.headers.set('X-Auth-Token', token);
  }
  return config;
});

request.interceptors.response.use(
  (res) => {
    if (res.data.code !== 200) {
      const msg = res.data.msg || '请求失败';
      if (res.data.code === 401 && !isLoginRequest(res.config)) {
        handleSessionExpired(res.config);
      } else {
        showToast(msg, 'error');
      }
      throw new Error(msg);
    }
    return res.data;
  },
  (err) => {
    if (err.response?.status === 401) {
      handleSessionExpired(err.config);
      return Promise.reject(err);
    }
    if (err.response?.status === 403) {
      showToast('无权限执行此操作', 'error');
      return Promise.reject(err);
    }
    if (err.response?.status && err.response.status >= 500) {
      showToast('服务器异常，请稍后重试', 'error');
      return Promise.reject(err);
    }
    if (!err.response) {
      showToast('网络连接失败，请检查网络', 'error');
      return Promise.reject(err);
    }
    return Promise.reject(err);
  }
);

export default request;
