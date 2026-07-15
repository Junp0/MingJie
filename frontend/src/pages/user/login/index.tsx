import {
  ArrowRightOutlined,
  LockOutlined,
  MobileOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { FormattedMessage, Helmet, SelectLang, useIntl, useModel } from '@umijs/max';
import { App } from 'antd';
import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import { login } from '@/services/ant-design-pro/api';
import { getFakeCaptcha } from '@/services/ant-design-pro/login';
import Settings from '../../../../config/defaultSettings';
import './index.less';

type LoginMode = 'account' | 'mobile';

const Login: React.FC = () => {
  const [mode, setMode] = useState<LoginMode>('account');
  const [values, setValues] = useState({ username: '', password: '', mobile: '', captcha: '' });
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const { initialState, setInitialState } = useModel('@@initialState');
  const { message } = App.useApp();
  const intl = useIntl();

  const update = (key: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (userInfo) {
      flushSync(() => setInitialState((state) => ({ ...state, currentUser: userInfo })));
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const missing = mode === 'account'
      ? !values.username.trim() || !values.password
      : !/^1\d{10}$/.test(values.mobile) || !values.captcha.trim();
    if (missing) {
      setError(mode === 'account' ? '请输入用户名和密码' : '请输入正确的手机号和验证码');
      return;
    }
    setLoading(true);
    try {
      const payload = mode === 'account'
        ? { username: values.username, password: values.password }
        : { mobile: values.mobile, captcha: values.captcha };
      const result = await login({ ...payload, type: mode } as API.LoginParams);
      if (result.status === 'ok') {
        if (result.token) localStorage.setItem('token', result.token);
        message.success(intl.formatMessage({ id: 'pages.login.success', defaultMessage: '登录成功！' }));
        await fetchUserInfo();
        const redirect = new URL(window.location.href).searchParams.get('redirect');
        window.location.href = redirect || '/';
      } else {
        setError(intl.formatMessage({ id: 'pages.login.accountLogin.errorMessage', defaultMessage: '账户或密码错误' }));
      }
    } catch (_error) {
      message.error(intl.formatMessage({ id: 'pages.login.failure', defaultMessage: '登录失败，请重试！' }));
    } finally {
      setLoading(false);
    }
  };

  const sendCaptcha = async () => {
    if (!/^1\d{10}$/.test(values.mobile)) {
      setError('请输入正确的手机号');
      return;
    }
    setCaptchaLoading(true);
    try {
      const result = await getFakeCaptcha({ phone: values.mobile });
      if (result) message.success('验证码已发送，演示验证码：1234');
    } finally {
      setCaptchaLoading(false);
    }
  };

  return (
    <main className="login-page">
      <Helmet><title>{intl.formatMessage({ id: 'menu.login', defaultMessage: '登录' })}{Settings.title && ` - ${Settings.title}`}</title></Helmet>
      <div className="login-language"><SelectLang /></div>
      <section className="login-showcase">
        <div className="showcase-mark"><img src={Settings.logo} alt="MingJie DCG" /></div>
        <p className="showcase-kicker">DATA · CLASSIFICATION · GOVERNANCE</p>
        <h1>让数据，<br /><em>更有秩序。</em></h1>
        <p className="showcase-copy">MingJie DCG 为企业提供可信、可控、可持续的数据治理能力。</p>
        <div className="showcase-line" />
        <span className="showcase-meta">MINGJIE / DCG <b>01</b></span>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="brand-mobile"><img className="brand-symbol" src={Settings.logo} alt="" /><span>MINGJIE <small>DCG</small></span></div>
          <div className="login-heading"><span>欢迎回来</span><h2>登录工作台</h2><p>使用您的账号继续访问数据治理平台</p></div>
          <div className="login-tabs" role="tablist">
            <button type="button" className={mode === 'account' ? 'active' : ''} onClick={() => { setMode('account'); setError(''); }}><FormattedMessage id="pages.login.accountLogin.tab" defaultMessage="账号登录" /></button>
            <button type="button" className={mode === 'mobile' ? 'active' : ''} onClick={() => { setMode('mobile'); setError(''); }}><FormattedMessage id="pages.login.phoneLogin.tab" defaultMessage="手机号登录" /></button>
          </div>
          <form onSubmit={submit} noValidate>
            {mode === 'account' ? <>
              <label className="field"><span>用户名</span><div className="input-wrap"><UserOutlined /><input value={values.username} onChange={(e) => update('username', e.target.value)} placeholder="请输入用户名" autoComplete="username" /></div></label>
              <label className="field"><span>密码</span><div className="input-wrap"><LockOutlined /><input type="password" value={values.password} onChange={(e) => update('password', e.target.value)} placeholder="请输入密码" autoComplete="current-password" /></div></label>
            </> : <>
              <label className="field"><span>手机号</span><div className="input-wrap"><MobileOutlined /><input value={values.mobile} onChange={(e) => update('mobile', e.target.value)} placeholder="请输入手机号" inputMode="tel" /></div></label>
              <label className="field"><span>验证码</span><div className="input-wrap"><LockOutlined /><input value={values.captcha} onChange={(e) => update('captcha', e.target.value)} placeholder="请输入验证码" /><button type="button" className="captcha-button" onClick={sendCaptcha} disabled={captchaLoading}>{captchaLoading ? '发送中' : '获取验证码'}</button></div></label>
            </>}
            {error && <p className="login-error" role="alert">{error}</p>}
            <div className="login-options"><label><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span>保持登录状态</span></label><button type="button" className="link-button">忘记密码？</button></div>
            <button className="submit-button" type="submit" disabled={loading}>{loading ? '登录中…' : '进入工作台'} <ArrowRightOutlined /></button>
          </form>
          <p className="login-footer">首次使用？<button type="button" className="link-button">联系管理员开通账号</button></p>
        </div>
        <span className="panel-copyright">© 2025 MingJie DCG · 数据治理平台</span>
      </section>
    </main>
  );
};

export default Login;
