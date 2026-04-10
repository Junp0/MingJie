import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history } from '@umijs/max';
import { Modal } from 'antd';
import React from 'react';
import { currentUser as queryCurrentUser, outLogin } from '@/services/ant-design-pro/api';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
import '@ant-design/v5-patch-for-react-19';
const loginPath = '/user/login';

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
}> {
  const fetchUserInfo = async () => {
    try {
      const msg = await queryCurrentUser({
        skipErrorHandler: true,
      });
      return msg.data;
    } catch (_error) {
      history.push(loginPath);
    }
    return undefined;
  };
  // 如果不是登录页面，执行
  const { location } = history;
  if (![loginPath].includes(location.pathname)) {
    const currentUser = await fetchUserInfo();
    return {
      fetchUserInfo,
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
    };
  }
  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({
  initialState,
}) => {
  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出登录',
      content: '退出后将返回登录页。',
      okText: '退出登录',
      cancelText: '取消',
      onOk: async () => {
        try {
          await outLogin();
        } catch (_error) {
          // Ignore logout request failures and continue clearing local state.
        }
        localStorage.removeItem('token');
        history.replace(loginPath);
      },
    });
  };

  return {
    menuFooterRender: (props) => {
      if (!initialState?.currentUser) {
        return null;
      }

      if (props?.collapsed) {
        return (
          <div
            style={{
              margin: '12px',
              padding: '10px 0',
              borderTop: '1px solid var(--nd-border)',
              color: 'var(--nd-text-display)',
              fontFamily: '"Space Mono", "JetBrains Mono", monospace',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textAlign: 'center',
              cursor: 'pointer',
            }}
            onClick={handleLogout}
          >
            A
          </div>
        );
      }

      return (
        <div
          style={{
            margin: '12px',
            padding: '14px 16px',
            borderTop: '1px solid var(--nd-border)',
            color: 'var(--nd-text-primary)',
            cursor: 'pointer',
          }}
          onClick={handleLogout}
        >
          <div
            style={{
              color: 'var(--nd-text-display)',
              fontFamily: '"Space Mono", "JetBrains Mono", monospace',
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.4,
            }}
          >
            Admin User
          </div>
          <div
            style={{
              marginTop: 4,
              color: 'var(--nd-text-secondary)',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            超级管理员
          </div>
        </div>
      );
    },
    onPageChange: () => {
      const { location } = history;
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && location.pathname !== loginPath) {
        history.push(loginPath);
      }
    },
    bgLayoutImgList: [],
    links: [],
    menuHeaderRender: undefined,
    childrenRender: (children) => (
      <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Doto:wght@400;500;600;700&family=Space+Grotesk:wght@300;400;500;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        {children}
      </>
    ),
    ...initialState?.settings,
  };
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  baseURL: process.env.NODE_ENV === 'production' ? 'https://api.secops.top' : undefined,
  ...errorConfig,
};
