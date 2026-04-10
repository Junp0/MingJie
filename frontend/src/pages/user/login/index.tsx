import {
  LockOutlined,
  MobileOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProFormCaptcha,
  ProFormCheckbox,
  ProFormText,
} from '@ant-design/pro-components';
import {
  FormattedMessage,
  Helmet,
  SelectLang,
  useIntl,
  useModel,
} from '@umijs/max';
import { Alert, App, Tabs, Typography } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import { Footer } from '@/components';
import { login } from '@/services/ant-design-pro/api';
import { getFakeCaptcha } from '@/services/ant-design-pro/login';
import Settings from '../../../../config/defaultSettings';

const { Text } = Typography;

const useStyles = createStyles(({ token }) => {
  return {
    lang: {
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 10,
      width: 42,
      height: 42,
      display: 'grid',
      placeItems: 'center',
      border: '1px solid var(--nd-border-visible)',
      borderRadius: '999px',
      background: 'rgba(255,255,255,0.86)',
      ':hover': {
        backgroundColor: token.colorBgTextHover,
      },
    },
    container: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background:
        'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(245,245,245,0.82) 100%)',
    },
    main: {
      flex: 1,
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1.15fr) minmax(380px, 460px)',
      gap: 24,
      alignItems: 'stretch',
      padding: '88px 24px 32px',
      maxWidth: 1380,
      width: '100%',
      margin: '0 auto',
      '@media (max-width: 960px)': {
        gridTemplateColumns: '1fr',
        paddingTop: 84,
      },
    },
    hero: {
      minHeight: 680,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '32px',
      border: '1px solid var(--nd-border-visible)',
      borderRadius: 24,
      background: 'rgba(255,255,255,0.72)',
      position: 'relative',
      overflow: 'hidden',
      '@media (max-width: 960px)': {
        minHeight: 'auto',
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'radial-gradient(circle, rgba(0,0,0,0.08) 0.9px, transparent 0.9px)',
        backgroundSize: '16px 16px',
        opacity: 0.3,
        pointerEvents: 'none',
      },
    },
    heroTop: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
    },
    label: {
      color: 'var(--nd-text-secondary)',
      fontFamily: '"Space Mono", "JetBrains Mono", monospace',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
    },
    heroTitle: {
      margin: 0,
      color: 'var(--nd-text-display)',
      fontFamily: '"Doto", "Space Mono", monospace',
      fontSize: 'clamp(56px, 10vw, 116px)',
      lineHeight: 0.94,
      letterSpacing: '-0.05em',
    },
    heroDesc: {
      maxWidth: 520,
      color: 'var(--nd-text-primary)',
      fontSize: 18,
      lineHeight: 1.6,
    },
    signalRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 12,
      '@media (max-width: 640px)': {
        gridTemplateColumns: '1fr',
      },
    },
    signalCard: {
      padding: '14px 16px',
      border: '1px solid var(--nd-border)',
      borderRadius: 16,
      background: 'rgba(245,245,245,0.72)',
    },
    signalValue: {
      marginTop: 6,
      color: 'var(--nd-text-display)',
      fontFamily: '"Space Mono", "JetBrains Mono", monospace',
      fontSize: 26,
      lineHeight: 1.1,
      letterSpacing: '-0.03em',
    },
    heroBottom: {
      position: 'relative',
      zIndex: 1,
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) auto',
      gap: 16,
      alignItems: 'end',
      '@media (max-width: 640px)': {
        gridTemplateColumns: '1fr',
      },
    },
    strip: {
      display: 'grid',
      gridTemplateColumns: 'repeat(16, minmax(0, 1fr))',
      gap: 4,
    },
    stripSeg: {
      height: 12,
      borderRadius: 3,
      background: 'var(--nd-border)',
      '&[data-active="true"]': {
        background: 'var(--nd-text-display)',
      },
      '&[data-alert="true"]': {
        background: 'var(--nd-accent)',
      },
    },
    panel: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: 16,
      padding: '24px 24px 20px',
      border: '1px solid var(--nd-border-visible)',
      borderRadius: 24,
      background: 'rgba(255,255,255,0.88)',
    },
    panelHead: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      paddingBottom: 16,
      borderBottom: '1px solid var(--nd-border)',
    },
    panelTitle: {
      margin: 0,
      color: 'var(--nd-text-display)',
      fontFamily: '"Space Grotesk", "DM Sans", sans-serif',
      fontSize: 30,
      lineHeight: 1.08,
      letterSpacing: '-0.03em',
    },
    panelMeta: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: 12,
    },
    panelMetaCard: {
      padding: '12px 14px',
      border: '1px solid var(--nd-border)',
      borderRadius: 14,
      background: 'var(--nd-surface-raised)',
    },
    panelMetaValue: {
      marginTop: 4,
      color: 'var(--nd-text-display)',
      fontFamily: '"Space Mono", "JetBrains Mono", monospace',
      fontSize: 15,
      fontWeight: 700,
    },
    loginForm: {
      '& .ant-pro-form-login-main': {
        maxWidth: '100%',
        minWidth: 0,
      },
      '& .ant-pro-form-login-header': {
        marginBottom: 20,
      },
      '& .ant-pro-form-login-logo': {
        display: 'none',
      },
      '& .ant-pro-form-login-title': {
        color: 'var(--nd-text-display)',
        fontFamily: '"Space Mono", "JetBrains Mono", monospace',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      },
      '& .ant-pro-form-login-subtitle': {
        color: 'var(--nd-text-secondary)',
        fontSize: 14,
        lineHeight: 1.5,
      },
      '& .ant-tabs-nav': {
        marginBottom: 20,
      },
      '& .ant-tabs-nav::before': {
        borderBottomColor: 'var(--nd-border)',
      },
      '& .ant-tabs-tab': {
        paddingInline: 0,
      },
      '& .ant-tabs-tab-btn': {
        fontFamily: '"Space Mono", "JetBrains Mono", monospace',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      },
      '& .ant-form-item': {
        marginBottom: 18,
      },
      '& .ant-input-affix-wrapper, & .ant-input, & .ant-btn, & .ant-checkbox-wrapper': {
        boxShadow: 'none',
      },
      '& .ant-input-prefix': {
        color: 'var(--nd-text-secondary)',
      },
      '& .ant-alert': {
        borderRadius: 12,
        border: '1px solid var(--nd-accent)',
      },
      '& .ant-btn-primary': {
        marginTop: 6,
      },
    },
    inlineMeta: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      marginBottom: 24,
      color: 'var(--nd-text-secondary)',
      fontFamily: '"Space Mono", "JetBrains Mono", monospace',
      fontSize: 11,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
    footerWrap: {
      paddingTop: 8,
      borderTop: '1px solid var(--nd-border)',
    },
  };
});

const Lang = () => {
  const { styles } = useStyles();

  return (
    <div className={styles.lang} data-lang>
      {SelectLang && <SelectLang />}
    </div>
  );
};

const LoginMessage: React.FC<{ content: string }> = ({ content }) => (
  <Alert
    style={{ marginBottom: 20 }}
    message={content}
    type="error"
    showIcon
  />
);

const Login: React.FC = () => {
  const [userLoginState, setUserLoginState] = useState<API.LoginResult>({});
  const [type, setType] = useState<string>('account');
  const { initialState, setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();
  const { message } = App.useApp();
  const intl = useIntl();

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (userInfo) {
      flushSync(() => {
        setInitialState((s) => ({
          ...s,
          currentUser: userInfo,
        }));
      });
    }
  };

  const handleSubmit = async (values: API.LoginParams) => {
    try {
      const { autoLogin: _autoLogin, ...loginValues } = values;
      const msg = await login({ ...loginValues, type });
      if (msg.status === 'ok') {
        if (msg.token) {
          localStorage.setItem('token', msg.token);
        }
        message.success(
          intl.formatMessage({
            id: 'pages.login.success',
            defaultMessage: '登录成功！',
          }),
        );
        await fetchUserInfo();
        const urlParams = new URL(window.location.href).searchParams;
        window.location.href = urlParams.get('redirect') || '/';
        return;
      }
      setUserLoginState(msg);
    } catch (error) {
      console.log(error);
      message.error(
        intl.formatMessage({
          id: 'pages.login.failure',
          defaultMessage: '登录失败，请重试！',
        }),
      );
    }
  };

  const { status, type: loginType } = userLoginState;
  const stripSegments = Array.from({ length: 16 }, (_, index) => ({
    active: index < 13,
    alert: index === 13,
  }));

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {intl.formatMessage({
            id: 'menu.login',
            defaultMessage: '登录页',
          })}
          {Settings.title && ` - ${Settings.title}`}
        </title>
      </Helmet>
      <Lang />
      <div className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroTop}>
            <span className={styles.label}>Light Mode / Nothing-Inspired Shell</span>
            <h1 className={styles.heroTitle}>MINGJIE{'\n'}SECURE DATA</h1>
            <div className={styles.heroDesc}>
              以单色、结构化和高密度信息为核心，统一资产发现、分类分级、
              导入治理与审计追踪的控制台体验。
            </div>
            <div className={styles.signalRow}>
              <div className={styles.signalCard}>
                <span className={styles.label}>Asset Domains</span>
                <div className={styles.signalValue}>04</div>
              </div>
              <div className={styles.signalCard}>
                <span className={styles.label}>Default Access</span>
                <div className={styles.signalValue}>RBAC</div>
              </div>
              <div className={styles.signalCard}>
                <span className={styles.label}>Status</span>
                <div className={styles.signalValue}>READY</div>
              </div>
            </div>
          </div>

          <div className={styles.heroBottom}>
            <div>
              <div className={styles.label} style={{ marginBottom: 10 }}>
                Governance Throughput
              </div>
              <div className={styles.strip}>
                {stripSegments.map((segment, index) => (
                  <span
                    key={index}
                    className={styles.stripSeg}
                    data-active={segment.active}
                    data-alert={segment.alert}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className={styles.label}>Panel</div>
              <div className={styles.signalValue}>L-01</div>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.label}>Authentication Console</span>
            <h2 className={styles.panelTitle}>
              登录到数据分类分级治理平台
            </h2>
            <div className={styles.panelMeta}>
              <div className={styles.panelMetaCard}>
                <div className={styles.label}>Default Account</div>
                <div className={styles.panelMetaValue}>ADMIN / ANT.DESIGN</div>
              </div>
              <div className={styles.panelMetaCard}>
                <div className={styles.label}>Recommended Path</div>
                <div className={styles.panelMetaValue}>ACCOUNT LOGIN</div>
              </div>
            </div>
          </div>

          <div className={styles.loginForm}>
            <LoginForm
              submitter={{
                searchConfig: {
                  submitText: '进入系统',
                },
              }}
              contentStyle={{
                minWidth: 0,
                maxWidth: '100%',
              }}
              title="MingJie Access Layer"
              subTitle="使用最小输入完成登录，进入统一的数据治理控制台。"
              initialValues={{
                autoLogin: true,
              }}
              onFinish={async (values) => {
                await handleSubmit(values as API.LoginParams);
              }}
            >
              <Tabs
                activeKey={type}
                onChange={setType}
                items={[
                  {
                    key: 'account',
                    label: intl.formatMessage({
                      id: 'pages.login.accountLogin.tab',
                      defaultMessage: '账户密码登录',
                    }),
                  },
                  {
                    key: 'mobile',
                    label: intl.formatMessage({
                      id: 'pages.login.phoneLogin.tab',
                      defaultMessage: '手机号登录',
                    }),
                  },
                ]}
              />

              {status === 'error' && loginType === 'account' && (
                <LoginMessage
                  content={intl.formatMessage({
                    id: 'pages.login.accountLogin.errorMessage',
                    defaultMessage: '账户或密码错误(admin/ant.design)',
                  })}
                />
              )}

              {type === 'account' && (
                <>
                  <ProFormText
                    name="username"
                    fieldProps={{
                      size: 'large',
                      prefix: <UserOutlined />,
                    }}
                    placeholder={intl.formatMessage({
                      id: 'pages.login.username.placeholder',
                      defaultMessage: '用户名: admin or user',
                    })}
                    rules={[
                      {
                        required: true,
                        message: (
                          <FormattedMessage
                            id="pages.login.username.required"
                            defaultMessage="请输入用户名!"
                          />
                        ),
                      },
                    ]}
                  />
                  <ProFormText.Password
                    name="password"
                    fieldProps={{
                      size: 'large',
                      prefix: <LockOutlined />,
                    }}
                    placeholder={intl.formatMessage({
                      id: 'pages.login.password.placeholder',
                      defaultMessage: '密码: ant.design',
                    })}
                    rules={[
                      {
                        required: true,
                        message: (
                          <FormattedMessage
                            id="pages.login.password.required"
                            defaultMessage="请输入密码！"
                          />
                        ),
                      },
                    ]}
                  />
                </>
              )}

              {status === 'error' && loginType === 'mobile' && (
                <LoginMessage content="验证码错误" />
              )}

              {type === 'mobile' && (
                <>
                  <ProFormText
                    fieldProps={{
                      size: 'large',
                      prefix: <MobileOutlined />,
                    }}
                    name="mobile"
                    placeholder={intl.formatMessage({
                      id: 'pages.login.phoneNumber.placeholder',
                      defaultMessage: '手机号',
                    })}
                    rules={[
                      {
                        required: true,
                        message: (
                          <FormattedMessage
                            id="pages.login.phoneNumber.required"
                            defaultMessage="请输入手机号！"
                          />
                        ),
                      },
                      {
                        pattern: /^1\d{10}$/,
                        message: (
                          <FormattedMessage
                            id="pages.login.phoneNumber.invalid"
                            defaultMessage="手机号格式错误！"
                          />
                        ),
                      },
                    ]}
                  />
                  <ProFormCaptcha
                    fieldProps={{
                      size: 'large',
                      prefix: <LockOutlined />,
                    }}
                    captchaProps={{
                      size: 'large',
                    }}
                    placeholder={intl.formatMessage({
                      id: 'pages.login.captcha.placeholder',
                      defaultMessage: '请输入验证码',
                    })}
                    captchaTextRender={(timing, count) => {
                      if (timing) {
                        return `${count} ${intl.formatMessage({
                          id: 'pages.getCaptchaSecondText',
                          defaultMessage: '获取验证码',
                        })}`;
                      }
                      return intl.formatMessage({
                        id: 'pages.login.phoneLogin.getVerificationCode',
                        defaultMessage: '获取验证码',
                      });
                    }}
                    name="captcha"
                    rules={[
                      {
                        required: true,
                        message: (
                          <FormattedMessage
                            id="pages.login.captcha.required"
                            defaultMessage="请输入验证码！"
                          />
                        ),
                      },
                    ]}
                    onGetCaptcha={async (phone) => {
                      const result = await getFakeCaptcha({
                        phone,
                      });
                      if (!result) {
                        return;
                      }
                      message.success('获取验证码成功！验证码为：1234');
                    }}
                  />
                </>
              )}

              <div className={styles.inlineMeta}>
                <ProFormCheckbox noStyle name="autoLogin">
                  <FormattedMessage
                    id="pages.login.rememberMe"
                    defaultMessage="自动登录"
                  />
                </ProFormCheckbox>
                <a>
                  <FormattedMessage
                    id="pages.login.forgotPassword"
                    defaultMessage="忘记密码"
                  />
                </a>
              </div>
            </LoginForm>
          </div>

          <div className={styles.footerWrap}>
            <Text
              style={{
                color: 'var(--nd-text-secondary)',
                fontFamily: '"Space Mono", "JetBrains Mono", monospace',
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Access Channel / Layer 01
            </Text>
            <Footer />
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
