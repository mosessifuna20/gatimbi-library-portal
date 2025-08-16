import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PrivateRoute({ roles = [] }) {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" />;
    }

    if (roles.length && !roles.includes(user.role)) {
        return <Navigate to="/unauthorized" />;
    }

    return <Outlet />;
}

