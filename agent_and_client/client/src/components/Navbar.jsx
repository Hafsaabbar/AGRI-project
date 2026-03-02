import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, User, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="fixed w-full z-50 top-0 start-0 border-b border-white/20 bg-white/10 backdrop-blur-md shadow-sm">
            <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
                <Link to="/" className="flex items-center space-x-3 rtl:space-x-reverse">
                    <img src="/logo.png" className="h-12" alt="AgriMart Logo" />
                </Link>
                <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse items-center gap-4">
                    {user ? (
                        <>
                            <Link to="/cart" className="relative group text-gray-700 hover:text-primary transition-colors">
                                <ShoppingCart size={24} />
                            </Link>
                            <div className="relative group">
                                <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors">
                                    <User size={20} />
                                    <span className="hidden md:inline">{user.nom}</span>
                                </button>
                                <div className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-md border border-gray-100 rounded-lg shadow-lg py-2 hidden group-hover:block animate-fade-in-down">
                                    <Link to="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Tableau de bord</Link>
                                    <Link to="/documents" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Mes Documents</Link>
                                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2">
                                        <LogOut size={16} /> Déconnexion
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex gap-2">
                            <Link to="/login" className="text-gray-800 hover:text-primary font-medium px-3 py-2 transition-colors">
                                Connexion
                            </Link>
                            <Link to="/register" className="text-white bg-primary hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-4 py-2 text-center transition-all shadow-md hover:shadow-lg">
                                Inscription
                            </Link>
                        </div>
                    )}
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200">
                        <Menu size={24} />
                    </button>
                </div>
                <div className={`items-center justify-between w-full md:flex md:w-auto md:order-1 ${isMenuOpen ? 'block' : 'hidden'}`}>
                    <ul className="flex flex-col p-4 md:p-0 mt-4 font-medium border border-gray-100 rounded-lg bg-gray-50 md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0 md:border-0 md:bg-transparent">
                        <li>
                            <Link to="/" className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-primary md:p-0 transition-colors">Accueil</Link>
                        </li>
                        <li>
                            <Link to="/products" className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-primary md:p-0 transition-colors">Produits</Link>
                        </li>
                        {user && (
                            <>
                                <li>
                                    <Link to="/profile" className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-primary md:p-0 transition-colors">Mon Profil</Link>
                                </li>
                                <li>
                                    <Link to="/dashboard" className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-primary md:p-0 transition-colors">Tableau de bord</Link>
                                </li>
                                <li>
                                    <Link to="/documents" className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-primary md:p-0 transition-colors">Mes Documents</Link>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
}
