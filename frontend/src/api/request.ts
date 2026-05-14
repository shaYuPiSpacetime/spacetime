import axios from 'axios';
import { showToast } from '@/components/ui/toast';

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截器：自动带上 token
request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['X-Auth-Token'] = token;
  }
  return config;
});

// 响应拦截器：统一处理错误码
request.interceptors.response.use(
  (res) => {
    if (res.data.code !== 200) {
      const msg = res.data.msg || '请求失败';
      showToast(msg, 'error');
      throw new Error(msg);
    }
    return res.data;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
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
    // 网络错误或超时
    if (!err.response) {
      showToast('网络连接失败，请检查网络', 'error');
      return Promise.reject(err);
    }
    return Promise.reject(err);
  }
);

export default request;
