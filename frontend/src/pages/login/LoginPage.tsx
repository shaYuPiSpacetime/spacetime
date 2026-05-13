import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import styles from './LoginPage.module.css';
import logoImg from './assets/image_2.png';
import indicatorImg from './assets/image_4.png';

export default function LoginPage() {
  const token = useAuthStore((s) => s.token);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!account.trim() || !password.trim()) {
      setError('请输入账号和密码');
      return;
    }

    setLoading(true);
    try {
      await login(account.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? '登录失败，请重试';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.bgLayer} />

      <div className={styles.content}>
        <img src={logoImg} className={styles.logo} alt="logo" />

        <div className={styles.cardWrapper}>
          <div className={styles.brandRow}>
            <div className={styles.welcomeText}>欢迎登录</div>
            <div className={styles.subtitleText}>时空邂逅</div>
          </div>

          <form className={styles.glassCard} onSubmit={handleSubmit}>
            <div className={styles.tabText}>密码登录</div>
            <img src={indicatorImg} className={styles.tabIndicator} alt="" />

            <div className={styles.inputField}>
              <input
                className={styles.realInput}
                type="text"
                placeholder="请输入用户名/手机号"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className={styles.inputFieldCode}>
              <input
                className={styles.realInput}
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && <div className={styles.errorText}>{error}</div>}

            <button
              type="submit"
              className={styles.loginButton}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : (
                <span className={styles.loginBtnText}>登录</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
