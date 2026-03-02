import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Users, UserPlus, Package, Truck, ArrowRight, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AgentDashboard() {
    const [stats, setStats] = useState({
        pendingClients: 0,
        myClients: 0,
        pendingOrders: 0,
        ordersToDeliver: 0
    });
    const [pendingClientsList, setPendingClientsList] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [agent] = useState(JSON.parse(localStorage.getItem('agent') || '{}'));

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, pendingRes, productsRes] = await Promise.all([
                api.get('/agent/dashboard'),
                api.get('/agent/pending-clients'),
                api.get('/products')
            ]);
            setStats(statsRes.data);
            setPendingClientsList(pendingRes.data);
            setProducts(productsRes.data);
        } catch (err) {
            console.error('Error loading dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveClient = async (id) => {
        try {
            await api.put(`/agent/clients/${id}/approve`);
            // Refresh data
            fetchData();
            alert('Client approuvé ! Il est maintenant assigné à votre agence.');
        } catch (err) {
            console.error(err);
            alert('Erreur lors de l\'approbation');
        }
    };

    const handleRejectClient = async (id) => {
        if (!confirm('Êtes-vous sûr de vouloir rejeter ce client ?')) return;
        try {
            await api.put(`/agent/clients/${id}/reject`, { reason: 'Rejeté par l\'agent' });
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Erreur lors du rejet');
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    };

    if (loading) return <div className="text-center py-12">Chargement...</div>;

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
                <p className="text-gray-500">Bienvenue, {agent.nom} (Agence: {agent.agenceNom || 'Admin'})</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow p-6 border-l-4 border-yellow-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-500">Clients en attente</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.pendingClients}</p>
                        </div>
                        <UserPlus className="text-yellow-500 opacity-20" size={40} />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-500">Mes Clients</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.myClients}</p>
                        </div>
                        <Users className="text-green-500 opacity-20" size={40} />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-500">Commandes en attente</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
                        </div>
                        <Package className="text-blue-500 opacity-20" size={40} />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow p-6 border-l-4 border-purple-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-500">À Livrer</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.ordersToDeliver}</p>
                        </div>
                        <Truck className="text-purple-500 opacity-20" size={40} />
                    </div>
                </div>
            </div>

            {/* Pending Clients Approval Section */}
            <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <UserPlus size={20} className="text-yellow-500" />
                        Demandes d'inscription en attente
                    </h2>
                </div>

                {pendingClientsList.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        Aucune demande en attente pour le moment.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Client / Entreprise</th>
                                    <th className="px-6 py-3">Ville</th>
                                    <th className="px-6 py-3">Contact</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingClientsList.map(client => (
                                    <tr key={client.ID} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {formatDate(client.CREATED_AT)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{client.ENTREPRISE}</div>
                                            <div>{client.NOM_CLIENT} {client.PRENOM}</div>
                                        </td>
                                        <td className="px-6 py-4">{client.VILLE}</td>
                                        <td className="px-6 py-4">
                                            <div>{client.EMAIL}</div>
                                            <div>{client.TEL}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleApproveClient(client.ID)}
                                                    className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                                    title="Approuver et assigner à mon agence"
                                                >
                                                    <Check size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleRejectClient(client.ID)}
                                                    className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                                    title="Rejeter"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Inventory Section */}
            <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Package size={20} className="text-indigo-600" />
                        Inventaire des Produits
                    </h2>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">Stock calculé: Réel / 3</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Produit</th>
                                <th className="px-6 py-3">Prix</th>
                                <th className="px-6 py-3 text-center">Stock Disponible</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product.PRODUCT_ID} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{product.PRODUCT_NAME}</div>
                                        <div className="text-[10px] text-gray-400 capitalize">{product.CATEGORY}</div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(product.PRIX_UNITAIRE)} / {product.UNIT}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${Math.floor(product.STOCK_DISPONIBLE / 3) > 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {Math.floor(product.STOCK_DISPONIBLE / 3)} {product.UNIT}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link to="/agent/orders" className="block p-6 bg-white rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Package className="text-blue-500" /> Gérer les commandes
                    </h3>
                    <p className="text-sm text-gray-500">Voir les commandes récentes de vos clients, les approuver et préparer les livraisons.</p>
                </Link>

                <Link to="/agent/clients" className="block p-6 bg-white rounded-xl shadow hover:shadow-lg transition-shadow border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Users className="text-green-500" /> Mes Clients
                    </h3>
                    <p className="text-sm text-gray-500">Accéder à la liste complète de vos clients acceptés et gérer leurs informations.</p>
                </Link>
            </div>
        </div>
    );
}
