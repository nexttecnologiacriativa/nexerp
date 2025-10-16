import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHasRole } from '@/hooks/use-has-role';

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

const SuperAdminRoute = ({ children }: SuperAdminRouteProps) => {
  const { hasRole, loading } = useHasRole('super_admin');
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !hasRole) {
      navigate('/');
    }
  }, [hasRole, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasRole) {
    return null;
  }

  return <>{children}</>;
};

export default SuperAdminRoute;
