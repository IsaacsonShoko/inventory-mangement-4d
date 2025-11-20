import { Navigate, useLocation } from 'react-router-dom';
import { useRequireAuth, UserRole } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, isAuthorized } = useRequireAuth(requiredRoles);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login, but save the attempted location
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (!isAuthorized) {
    // User is logged in but doesn't have the required role
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-gray-600 text-center">
          You don't have permission to access this page.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Required role: {requiredRoles?.join(' or ')}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

// Convenience components for common role requirements
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      {children}
    </ProtectedRoute>
  );
}

export function BackOfficeRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'back_office']}>
      {children}
    </ProtectedRoute>
  );
}

// Component to conditionally render based on role
export function RoleGate({
  children,
  allowedRoles,
  fallback = null,
}: {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}) {
  const { isAuthorized } = useRequireAuth(allowedRoles);

  if (!isAuthorized) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
