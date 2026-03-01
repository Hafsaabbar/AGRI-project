import { Outlet, Navigate, useLocation } from 'react-router-dom';
import AgentNavbar from '../../components/AgentNavbar';

export default function AgentLayout() {
    const token = localStorage.getItem('agentToken');
    const location = useLocation();

    if (!token) {
        return <Navigate to="/agent/login" state={{ from: location }} replace />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <AgentNavbar />
            <div className="pt-20 px-4 pb-12">
                <div className="max-w-screen-xl mx-auto">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
