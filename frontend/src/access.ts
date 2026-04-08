/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState: { currentUser?: API.CurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};
  const permissions = currentUser?.permissions ?? [];
  const hasPermission = (code: string) => permissions.includes(code);
  const isAdmin = hasPermission('system:admin');

  return {
    canAdmin: currentUser && (currentUser.access === 'admin' || isAdmin),
    canViewUsers: isAdmin || hasPermission('user:view'),
    canEditUsers: isAdmin || hasPermission('user:edit'),
    canViewRoles: isAdmin || hasPermission('role:view'),
    canEditRoles: isAdmin || hasPermission('role:edit'),
    canViewAssets: isAdmin || hasPermission('data_asset:view'),
    canEditAssets: isAdmin || hasPermission('data_asset:edit'),
    canViewClassification: isAdmin || hasPermission('classification:view'),
    canEditClassification: isAdmin || hasPermission('classification:edit'),
    canViewAuditLogs: isAdmin || hasPermission('audit_log:view'),
  };
}
