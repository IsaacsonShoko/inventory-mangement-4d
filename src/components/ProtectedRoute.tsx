import { Navigate, useLocation } from 'react-router-dom';
import { useRequireAuth, useAuth, UserRole } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  redirectTo?: string;
  allowGuest?: boolean;
}

export function ProtectedRoute({
  children,
  requiredRoles,
  redirectTo = '/login',
  allowGuest = false,
}: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, isAuthorized } = useRequireAuth(requiredRoles);
  const { isApproved, isPending, profile, signOut, isGuest } = useAuth();
  const location = useLocation();

  console.log('[ProtectedRoute]', {
    isLoading,
    isAuthenticated,
    isAuthorized,
    isApproved,
    isPending,
    hasProfile: !!profile,
    profileStatus: profile?.approval_status,
    location: location.pathname
  });

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Handle guest users
  if (isGuest) {
    if (allowGuest) {
      // Guest is allowed on this route - render the content
      return <>{children}</>;
    } else {
      // Guest trying to access restricted area
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="max-w-md p-8 bg-card rounded-lg shadow-lg text-center">
            <div className="mb-4 text-4xl">🔒</div>
            <h2 className="text-2xl font-bold mb-2">Guest Access Restricted</h2>
            <p className="text-muted-foreground mb-4">
              This feature is not available in guest mode. Guest access is read-only for demonstration purposes.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              To access all features, please sign up for a full account.
            </p>
            <button
              type="button"
              onClick={() => {
                signOut();
                window.location.href = '/login';
              }}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Sign Up / Login
            </button>
          </div>
        </div>
      );
    }
  }

  // Check if user account is approved
  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md p-8 bg-card rounded-lg shadow-lg text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <h2 className="text-2xl font-bold mb-2">Account Pending Approval</h2>
          <p className="text-muted-foreground mb-4">
            Your account is awaiting approval from an administrator. You'll be able to access the system once approved.
          </p>
          <p className="text-sm text-muted-foreground">
            Email: <span className="font-mono">{profile?.email}</span>
          </p>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              window.location.href = '/login';
            }}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Check if user is not approved (rejected)
  if (!isApproved) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md p-8 bg-card rounded-lg shadow-lg text-center">
          <div className="mb-4 text-4xl">🚫</div>
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            Your account has been rejected or revoked. Please contact your administrator for more information.
          </p>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              window.location.href = '/login';
            }}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Check role-based authorization if roles are specified
  if (requiredRoles && !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md p-8 bg-card rounded-lg shadow-lg text-center">
          <div className="mb-4 text-4xl">🔒</div>
          <h2 className="text-2xl font-bold mb-2">Insufficient Permissions</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page. This area is restricted to {requiredRoles.join(' and ')} users.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Your role: <span className="font-semibold capitalize">{profile?.role}</span>
          </p>
          <button
            type="button"
            onClick={() => window.location.href = '/'}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // All checks passed - render the protected content
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
