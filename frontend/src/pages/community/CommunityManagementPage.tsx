import { Navigate } from 'react-router-dom';

/** 旧入口兼容组件；正式路由已拆分为六个独立业务页面。 */
export default function CommunityManagementPage() {
  return <Navigate to="/community/content" replace />;
}
