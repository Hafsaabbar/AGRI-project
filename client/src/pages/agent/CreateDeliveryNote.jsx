import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { ArrowLeft, Save, AlertTriangle, CheckCircle, Download } from 'lucide-react';

export default function CreateDeliveryNote() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchOrderDetails();
    }, [id]);

    const fetchOrderDetails = async () => {
        try {
            const res = await api.get(`/agent/orders/${id}`);
            setOrder(res.data);

            // Initialize items with remaining quantity
            const initialItems = res.data.items.map(item => ({
                id: item.PRODUCT_ID, // Use PRODUCT_ID !!!
                name: item.PRODUCT_NAME,
                ordered: item.QUANTITY,
                delivered: item.QUANTITY_DELIVERED_SO_FAR,
                toDeliver: Math.max(0, item.QUANTITY - item.QUANTITY_DELIVERED_SO_FAR)
            }));
            setItems(initialItems);
        } catch (err) {
            console.error(err);
            alert('Erreur lors du chargement de la commande');
        } finally {
            setLoading(false);
        }
    };

    const handleQuantityChange = (productId, value) => {
        const qty = parseInt(value) || 0;
        setItems(prev => prev.map(item => {
            if (item.id === productId) {
                const max = item.ordered - item.delivered;
                return { ...item, toDeliver: Math.min(Math.max(0, qty), max) };
            }
            return item;
        }));
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
            alert('Erreur lors du téléchargement du document');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const itemsToDeliver = items.filter(i => i.toDeliver > 0);

        if (itemsToDeliver.length === 0) {
            alert('Veuillez sélectionner au moins un article à livrer.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                orderId: id,
                items: itemsToDeliver.map(i => ({
                    productId: i.id,
                    quantityDelivered: i.toDeliver
                })),
                notes
            };

            const res = await api.post('/agent/delivery-notes', payload);

            if (res.data.isFullyDelivered) {
                alert('Bon de livraison créé ! La commande est maintenant TOTALEMENT livrée.');
            } else {
                alert('Bon de livraison PARTIEL créé avec succès.');
            }

            navigate('/agent/orders');
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la création du bon de livraison');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-center py-12">Chargement...</div>;
    if (!order) return <div className="text-center py-12">Commande introuvable</div>;

    const isOrderComplete = items.every(i => i.delivered >= i.ordered);

    return (
        <div className="max-w-4xl mx-auto">
            <button
                onClick={() => navigate('/agent/orders')}
                className="flex items-center text-gray-500 hover:text-gray-700 mb-6"
            >
                <ArrowLeft size={20} className="mr-2" /> Retour aux commandes
            </button>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Nouveau Bon de Livraison</h1>
                        <p className="text-gray-500">Commande {order.ORDER_NUMBER} • {order.NOM_CLIENT}</p>
                    </div>
                    {isOrderComplete && (
                        <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold">
                            <CheckCircle size={20} /> Commande entièrement livrée
                        </div>
                    )}
                </div>

                {!isOrderComplete ? (
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8">
                            <div className="flex">
                                <AlertTriangle className="h-5 w-5 text-blue-500 mr-2" />
                                <p className="text-sm text-blue-700">
                                    Veuillez indiquer les quantités à livrer maintenant. Vous pouvez effectuer une livraison partielle.
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto mb-8">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                    <tr>
                                        <th className="px-6 py-3">Produit</th>
                                        <th className="px-6 py-3 text-center">Commandé</th>
                                        <th className="px-6 py-3 text-center">Déjà Livré</th>
                                        <th className="px-6 py-3 text-center">Reste</th>
                                        <th className="px-6 py-3 w-40">À Livrer</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(item => {
                                        const ordered = Number(item.ordered) || 0;
                                        const delivered = Number(item.delivered) || 0;
                                        const remaining = Math.max(0, ordered - delivered);
                                        const isComplete = remaining <= 0;

                                        return (
                                            <tr key={item.id} className={`border-b ${isComplete ? 'bg-gray-50 opacity-60' : 'bg-white'}`}>
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    {item.name}
                                                </td>
                                                <td className="px-6 py-4 text-center">{item.ordered}</td>
                                                <td className="px-6 py-4 text-center">{item.delivered}</td>
                                                <td className="px-6 py-4 text-center font-bold text-gray-900">
                                                    {remaining}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={remaining}
                                                        disabled={isComplete}
                                                        value={item.toDeliver}
                                                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 text-center disabled:bg-gray-100"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="mb-8">
                            <label className="block mb-2 text-sm font-medium text-gray-900">Notes (Optionnel)</label>
                            <textarea
                                rows="3"
                                className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-green-500 focus:border-green-500"
                                placeholder="Instructions de livraison, commentaires..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            ></textarea>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting || items.every(i => i.toDeliver === 0)}
                                className="flex items-center gap-2 text-white bg-green-700 hover:bg-green-800 font-medium rounded-lg text-lg px-8 py-3 focus:ring-4 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={20} />
                                {submitting ? 'Création...' : 'Valider le Bon de Livraison'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="p-12 text-center">
                        <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Livraison Terminée</h3>
                        <p className="text-gray-500">Tous les articles de cette commande ont été livrés.</p>
                        <div className="mt-8">
                            <button
                                onClick={() => navigate('/agent/orders')}
                                className="text-white bg-green-700 hover:bg-green-800 font-medium rounded-lg px-5 py-2.5"
                            >
                                Retour aux commandes
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* History of BLs */}
            {order.deliveryNotes && order.deliveryNotes.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Historique des Livraisons</h3>
                    <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">N° BL</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Notes</th>
                                    <th className="px-6 py-3 text-right">Document</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.deliveryNotes.map(bl => (
                                    <tr key={bl.ID} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold text-gray-900">{bl.BL_NUMBER}</td>
                                        <td className="px-6 py-4">{new Date(bl.CREATED_AT).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 italic">{bl.NOTES || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDownloadPdf(`/documents/agent/delivery-note/${bl.ID}/pdf`, `${bl.BL_NUMBER}.pdf`)}
                                                className="text-blue-600 hover:underline flex items-center justify-end gap-1 w-full"
                                            >
                                                <Download size={16} /> Télécharger PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
