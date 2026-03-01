import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
    const { user, loading } = useAuth();

    if (loading) return <div className="flex justify-center items-center h-screen">Chargement...</div>;

    return user ? <Outlet /> : <Navigate to="/login" replace />;
}
