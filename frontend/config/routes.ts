/**
 * @name umi 的路由配置
 * @description 只支持 path,component,routes,redirect,wrappers,name,icon 的配置
 * @param path  path 只支持两种占位符配置，第一种是动态参数 :id 的形式，第二种是 * 通配符，通配符只能出现路由字符串的最后。
 * @param component 配置 location 和 path 匹配后用于渲染的 React 组件路径。可以是绝对路径，也可以是相对路径，如果是相对路径，会从 src/pages 开始找起。
 * @param routes 配置子路由，通常在需要为多个路径增加 layout 组件时使用。
 * @param redirect 配置路由跳转
 * @param wrappers 配置路由组件的包装组件，通过包装组件可以为当前的路由组件组合进更多的功能。 比如，可以用于路由级别的权限校验
 * @param name 配置路由的标题，默认读取国际化文件 menu.ts 中 menu.xxxx 的值，如配置 name 为 login，则读取 menu.ts 中 menu.login 的取值作为标题
 * @param icon 配置路由的图标，取值参考 https://ant.design/components/icon-cn， 注意去除风格后缀和大小写，如想要配置图标为 <StepBackwardOutlined /> 则取值应为 stepBackward 或 StepBackward，如想要配置图标为 <UserOutlined /> 则取值应为 user 或者 User
 * @doc https://umijs.org/docs/guides/routes
 */
export default [
  
  {
    path: '/user',
    layout: false,
    routes: [
      {
        path: '/user/login',
        layout: false,
        name: 'login',
        component: './user/login',
      },
      {
        path: '/user',
        redirect: '/user/login',
      },
      {
        component: '404',
        path: '/user/*',
      },
    ],
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    icon: 'dashboard',
    routes: [
      {
        path: '/dashboard',
        redirect: '/dashboard/analysis',
      },
      {
        name: 'analysis',
        icon: 'smile',
        path: '/dashboard/analysis',
        component: './dashboard/analysis',
      },
      {
        name: 'monitor',
        icon: 'smile',
        path: '/dashboard/monitor',
        component: './dashboard/monitor',
      },
      {
        name: 'big-screen',
        icon: 'fundProjectionScreen',
        path: '/dashboard/big-screen',
        component: './dashboard/big-screen',
      },
    ],
  },
  {
    path: '/data-overview',
    icon: 'database',
    name: 'data-overview',
    routes: [
      {
        path: '/data-overview',
        redirect: '/data-overview/full-data-list',
      },
      {
        name: 'full-data-list',
        icon: 'table',
        path: '/data-overview/full-data-list',
        component: './data-overview/full-data-list',
      },
      {
        name: 'table-data-list',
        icon: 'database',
        path: '/data-overview/table-data-list',
        component: './data-overview/table-data-list',
      },
      {
        name: 'missed-data-list',
        icon: 'warning',
        path: '/data-overview/missed-data-list',
        component: './data-overview/missed-data-list',
      },
    ],
  },
  {
    path: '/data-assets',
    icon: 'folder',
    name: 'data-assets',
    routes: [
      {
        path: '/data-assets',
        redirect: '/data-assets/data-import',
      },
      {
        name: 'data-asset-list',
        icon: 'database',
        path: '/data-assets/data-asset-list',
        component: './data-assets/database-list',
      },
      {
        name: 'data-import',
        icon: 'import',
        path: '/data-assets/data-import',
        component: './data-assets/database-instances',
      },
      {
        name: 'auto-scan',
        icon: 'radarChart',
        path: '/data-assets/auto-scan',
        component: './data-assets/auto-scan',
      },
      {
        name: 'data-import-form',
        path: '/data-assets/data-import-form',
        component: './data-assets/data-import-form',
        hideInMenu: true,
      },
      {
        name: 'import-detail',
        path: '/data-assets/import-detail/:id',
        component: './data-assets/import-detail',
        hideInMenu: true,
      },
      {
        path: '/data-assets/asset-groups',
        redirect: '/data-assets/data-asset-list',
        hideInMenu: true,
      },
    ],
  },
  {
    path: '/data-classification',
    icon: 'tags',
    name: 'data-classification',
    routes: [
      {
        path: '/data-classification',
        redirect: '/data-classification/tasks',
      },
      {
        name: 'classification-tasks',
        icon: 'schedule',
        path: '/data-classification/tasks',
        component: './data-classification/tasks',
      },
      {
        name: 'classification-templates',
        icon: 'file-text',
        path: '/data-classification/templates',
        component: './data-classification/templates',
      },
      {
        name: 'template-detail',
        path: '/data-classification/template-detail/:id',
        component: './data-classification/template-detail',
        hideInMenu: true,
      },
      {
        name: 'template-add',
        path: '/data-classification/template-add',
        component: './data-classification/template-add',
        hideInMenu: true,
      },
      {
        name: 'masking-features',
        icon: 'safety-certificate',
        path: '/data-classification/masking-features',
        component: './data-classification/masking-features',
      },
      {
        name: 'encryption-features',
        icon: 'lock',
        path: '/data-classification/encryption-features',
        component: './data-classification/encryption-features',
      },
    ],
  },
  {
    path: '/audit-logs',
    icon: 'fileSearch',
    name: 'audit-logs',
    component: './audit-logs',
  },
  {
    path: '/',
    redirect: '/dashboard/analysis',
  },
  {
    component: '404',
    path: '/*',
  },
];
