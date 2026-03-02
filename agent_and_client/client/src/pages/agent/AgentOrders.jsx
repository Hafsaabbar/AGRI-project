import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Package, Search, Filter, Check, X, Truck, FileText, FilePlus, Download, Printer } from 'lucide-react';

export default function AgentOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchOrders();
    }, [statusFilter]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/agent/orders${statusFilter ? `?status=${statusFilter}` : ''}`);
            setOrders(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        if (!confirm(`Confirmer le changement de statut vers: ${status} ?`)) return;
        try {
            if (status === 'CONFIRMED') await api.put(`/agent/orders/${id}/approve`);
            else if (status === 'REJECTED') await api.put(`/agent/orders/${id}/reject`);
            fetchOrders();
        } catch (err) {
            alert('Erreur lors du changement de statut');
        }
    };

    const handleCreateInvoice = async (orderId) => {
        if (!confirm('Générer la facture pour cette commande ?')) return;
        try {
            await api.post('/agent/invoices', { orderId });
            alert('Facture créée avec succès !');
            fetchOrders();
        } catch (err) {
            alert(err.response?.data?.message || 'Erreur lors de la création de la facture');
        }
    };

    const handleDownloadPdf = async (url, filename) => {
        try {
            const res = await api.get(url, { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = filename;
            link.click();
        } catch (err) {
            console.error('Download error:', err);
            alert('Erreur lors du téléchargement du PDF');
        }
    };

    const filteredOrders = orders.filter(o =>
        o.ORDER_NUMBER.toLowerCase().includes(search.toLowerCase()) ||
        o.NOM_CLIENT.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Package className="text-green-600" />
                    Gestion des Commandes
                </h1>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center justify-between">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher par N° ou Client..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-4">
                    <Filter size={20} className="text-gray-400" />
                    <select
                        className="border border-gray-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-green-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">Tous les statuts</option>
                        <option value="PENDING">En attente</option>
                        <option value="CONFIRMED">Confirmée</option>
                        <option value="DELIVERED">Livrée</option>
                        <option value="REJECTED">Rejetée</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Commande</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Client</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Total TTC</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">Chargement...</td></tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">Aucune commande trouvée.</td></tr>
                        ) : (
                            filteredOrders.map(order => (
                                <tr key={order.ID} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-gray-900">{order.ORDER_NUMBER}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{order.NOM_CLIENT}</div>
                                        <div className="text-xs text-gray-500">{order.ENTREPRISE || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {new Date(order.CREATED_AT).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-900">
                                        {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(order.TOTAL_TTC)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.STATUS === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                            order.STATUS === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                                                order.STATUS === 'PARTIAL' ? 'bg-orange-100 text-orange-700' :
                                                    order.STATUS === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                                        'bg-red-100 text-red-700'
                                            }`}>
                                            {order.STATUS === 'PARTIAL' ? 'Livraison Partielle' : order.STATUS}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            {order.STATUS === 'PENDING' && (
                                                <>
                                                    <button
                                                        onClick={() => handleStatusUpdate(order.ID, 'CONFIRMED')}
                                                        className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                                        title="Confirmer"
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(order.ID, 'REJECTED')}
                                                        className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                                        title="Rejeter"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </>
                                            )}

                                            {(order.STATUS === 'CONFIRMED' || order.STATUS === 'PARTIAL') && (
                                                <Link
                                                    to={`/agent/orders/${order.ID}/delivery`}
                                                    className="p-1.5 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 flex items-center gap-1"
                                                    title="Créer Bon de Livraison"
                                                >
                                                    <Truck size={18} />
                                                </Link>
                                            )}

                                            {order.STATUS === 'DELIVERED' && (
                                                order.INVOICE_ID ? (
                                                    <button
                                                        onClick={() => handleDownloadPdf(`/documents/agent/invoice/${order.INVOICE_ID}/pdf`, `FAC-${order.INVOICE_ID}.pdf`)}
                                                        className="p-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                                                        title="Télécharger Facture"
                                                    >
                                                        <FileText size={18} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleCreateInvoice(order.ID)}
                                                        className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                                        title="Générer Facture"
                                                    >
                                                        <FilePlus size={18} />
                                                    </button>
                                                )
                                            )}

                                            <button
                                                onClick={() => handleDownloadPdf(`/documents/agent/order/${order.ID}/pdf`, `BC-${order.ORDER_NUMBER}.pdf`)}
                                                className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                                                title="Bon de Commande"
                                            >
                                                <Printer size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
