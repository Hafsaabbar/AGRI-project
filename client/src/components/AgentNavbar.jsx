import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Users, Package, FileText, LayoutDashboard, Truck } from 'lucide-react';
import { useState } from 'react';

export default function AgentNavbar() {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    // Get agent info from local storage (we'll implement this part)
    const agent = JSON.parse(localStorage.getItem('agent') || '{}');

    const handleLogout = () => {
        localStorage.removeItem('agentToken');
        localStorage.removeItem('agent');
        navigate('/agent/login');
    };

    return (
        <nav className="fixed w-full z-50 top-0 start-0 border-b border-gray-200 bg-white">
            <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
                <Link to="/agent/dashboard" className="flex items-center space-x-3 rtl:space-x-reverse">
                    <img src="/logo.png" className="h-10" alt="AgriMart Logo" />
                    <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded border border-green-400">AGENT</span>
                </Link>

                <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse items-center gap-4">
                    <div className="hidden md:block text-right">
                        <p className="text-sm font-medium text-gray-900">{agent.nom} {agent.prenom}</p>
                        <p className="text-xs text-gray-500">{agent.agenceNom || 'Admin'}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-gray-500 hover:text-red-600 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-4 py-2 text-center"
                    >
                        <LogOut size={20} />
                    </button>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        type="button"
                        className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    >
                        <span className="sr-only">Open main menu</span>
                        {isOpen ? <X /> : <Menu />}
                    </button>
                </div>

                <div className={`items-center justify-between w-full md:flex md:w-auto md:order-1 ${isOpen ? 'block' : 'hidden'}`} id="navbar-sticky">
                    <ul className="flex flex-col p-4 md:p-0 mt-4 font-medium border border-gray-100 rounded-lg bg-gray-50 md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0 md:border-0 md:bg-white">
                        <li>
                            <Link to="/agent/dashboard" className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-green-700 md:p-0 flex items-center gap-2">
                                <LayoutDashboard size={18} /> Dashboard
                            </Link>
                        </li>
                        <li>
                            <Link to="/agent/profile" className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-green-700 md:p-0 flex items-center gap-2">
                                <Users size={18} /> Mon Profil
                            </Link>
                        </li>
                        <li>
                            <Link to="/agent/clients" className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-green-700 md:p-0 flex items-center gap-2">
                                <Users size={18} /> Clients
                            </Link>
                        </li>
                        <li>
                            <Link to="/agent/orders" className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-green-700 md:p-0 flex items-center gap-2">
                                <Package size={18} /> Commandes
                            </Link>
                        </li>
                        <li>
                            <Link to="/agent/documents" className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-green-700 md:p-0 flex items-center gap-2">
                                <FileText size={18} /> Documents
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
}
