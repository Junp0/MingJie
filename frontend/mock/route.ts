export default {
  '/api/auth_routes': {
    '/dashboard/analysis': { authority: ['admin', 'user'] },
    '/dashboard/monitor': { authority: ['admin', 'user'] },
    '/dashboard/big-screen': { authority: ['admin', 'user'] },
    '/data-overview/full-data-list': { authority: ['admin', 'user'] },
    '/data-assets/data-import': { authority: ['admin', 'user'] },
    '/data-assets/auto-scan': { authority: ['admin', 'user'] },
    '/data-classification/tasks': { authority: ['admin', 'user'] },
  },
};
