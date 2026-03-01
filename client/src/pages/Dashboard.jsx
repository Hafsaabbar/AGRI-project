import { useAuth } from '../context/AuthContext';
import { Package, FileText, User, ShoppingBag, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function Dashboard() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await api.get('/orders');
            setOrders(res.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching orders:', err);
            setError('Impossible de charger les commandes.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'PENDING': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'En attente' },
            'CONFIRMED': { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Confirmée' },
            'SHIPPED': { color: 'bg-purple-100 text-purple-800', icon: Truck, label: 'Expédiée' },
            'DELIVERED': { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Livrée' },
            'CANCELLED': { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Annulée' }
        };
        const config = statusConfig[status] || statusConfig['PENDING'];
        const Icon = config.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
                <Icon size={12} />
                {config.label}
            </span>
        );
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="pt-24 px-4 max-w-screen-xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Tableau de bord</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-primary">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Bienvenue,</p>
                            <p className="text-xl font-bold text-gray-800">{user.nom}</p>
                        </div>
                        <User className="text-primary opacity-20" size={40} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-secondary">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Type de compte</p>
                            <p className="text-xl font-bold text-gray-800">{user.role}</p>
                        </div>
                        <ShoppingBag className="text-secondary opacity-20" size={40} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total commandes</p>
                            <p className="text-xl font-bold text-gray-800">{orders.length}</p>
                        </div>
                        <Package className="text-blue-500 opacity-20" size={40} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Package /> Dernières Commandes
                    </h2>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-500">
                            <p>{error}</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>Aucune commande pour le moment.</p>
                            <Link to="/products" className="text-primary hover:underline mt-2 inline-block">
                                Passer une nouvelle commande
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {orders.map(order => (
                                <div key={order.ID} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-semibold text-gray-800">
                                                Commande #{order.ORDER_NUMBER || order.ID}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {formatDate(order.CREATED_AT)}
                                            </p>
                                        </div>
                                        {getStatusBadge(order.STATUS)}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">
                                            Total TTC: <span className="font-bold text-gray-900">{parseFloat(order.TOTAL_TTC || 0).toFixed(2)} MAD</span>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <FileText /> Mes Documents
                    </h2>
                    <div className="space-y-4">
                        <Link to="/documents" className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <h3 className="font-semibold text-gray-800">Factures & Bons de Livraison</h3>
                            <p className="text-sm text-gray-500">Consulter et télécharger vos documents comptables</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
