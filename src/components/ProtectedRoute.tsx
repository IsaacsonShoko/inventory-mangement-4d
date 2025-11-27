import { Navigate, useLocation } from 'react-router-dom';
import { useRequireAuth, useAuth, UserRole } from '@/hooks/useAuth';

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
  // TEMPORARY: Bypass authentication for testing
  // TODO: Re-enable authentication checks before production
  return <>{children}</>;

  // Original authentication code (commented out for testing)
  /*
  const { isLoading, isAuthenticated, isAuthorized } = useRequireAuth(requiredRoles);
  const { isApproved, isPending, profile } = useAuth();
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
  */
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
