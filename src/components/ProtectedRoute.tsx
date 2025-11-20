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

  // Check if user is pending approval
  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Waiting for Approval</h1>
          <p className="text-gray-600 mb-4">
            Your account is pending approval from an administrator.
          </p>
          <p className="text-sm text-gray-500">
            You'll receive an email once your account has been approved.
          </p>
          <p className="text-xs text-gray-400 mt-4">
            Signed in as: {profile?.email}
          </p>
        </div>
      </div>
    );
  }

  // Check if user was rejected
  if (profile?.approval_status === 'rejected') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">
            Your account request has been rejected. Please contact an administrator.
          </p>
        </div>
      </div>
    );
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
