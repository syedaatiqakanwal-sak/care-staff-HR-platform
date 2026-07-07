import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';

export const ProtectedRoute = () => {
    const location = useLocation();

    if (!isAuthenticated()) {
        // Redirect to login while saving the attempted URL
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};
