import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
    return (
        <div>
            <Navbar />
            <div className="pt-20 px-4 pb-12">
                <div className="max-w-screen-xl mx-auto">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
