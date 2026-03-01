import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FileText, Download, Package } from 'lucide-react';

export default function Documents() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('orders'); // orders, delivery-notes, invoices
    const [documents, setDocuments] = useState({ orders: [], deliveryNotes: [], invoices: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const res = await api.get('/documents/my-documents');
            setDocuments({
                orders: res.data.orders || [],
                deliveryNotes: res.data.deliveryNotes || [],
                invoices: res.data.invoices || []
            });
        } catch (err) {
            console.error('Error fetching documents:', err);
        } finally {
            setLoading(false);
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
            alert('Erreur lors du téléchargement du document');
        }
    };

    const getEmptyMessage = () => {
        switch (activeTab) {
            case 'orders': return 'Aucun bon de commande trouvé.';
            case 'delivery-notes': return 'Aucun bon de livraison trouvé.';
            case 'invoices': return 'Aucune facture trouvée.';
            default: return '';
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Mes Documents</h1>

            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'orders' ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        Bons de Commande
                    </button>
                    <button
                        onClick={() => setActiveTab('delivery-notes')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'delivery-notes' ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        Bons de Livraison
                    </button>
                    <button
                        onClick={() => setActiveTab('invoices')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'invoices' ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        Factures
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Chargement des documents...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            {activeTab === 'orders' && (
                                <table className="w-full text-sm text-left text-gray-500">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3">N° Commande</th>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3">Statut</th>
                                            <th className="px-6 py-3">Total TTC</th>
                                            <th className="px-6 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {documents.orders.length === 0 ? (
                                            <tr><td colSpan="5" className="px-6 py-8 text-center">{getEmptyMessage()}</td></tr>
                                        ) : documents.orders.map(doc => (
                                            <tr key={doc.ID} className="bg-white border-b hover:bg-gray-50">
                                                <td className="px-6 py-4 font-bold text-gray-900">{doc.ORDER_NUMBER}</td>
                                                <td className="px-6 py-4">{new Date(doc.CREATED_AT).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${doc.STATUS === 'CONFIRMED' || doc.STATUS === 'DELIVERED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{doc.STATUS}</span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-gray-900">{new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(doc.TOTAL_TTC || 0)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleDownloadPdf(`/documents/order/${doc.ID}/pdf`, `BC-${doc.ORDER_NUMBER}.pdf`)} className="text-blue-600 hover:underline inline-flex items-center">
                                                        <Download size={16} className="mr-1" /> PDF
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'delivery-notes' && (
                                <table className="w-full text-sm text-left text-gray-500">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3">N° Bon Livraison</th>
                                            <th className="px-6 py-3">Commande Relat.</th>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {documents.deliveryNotes.length === 0 ? (
                                            <tr><td colSpan="4" className="px-6 py-8 text-center">{getEmptyMessage()}</td></tr>
                                        ) : documents.deliveryNotes.map(doc => (
                                            <tr key={doc.ID} className="bg-white border-b hover:bg-gray-50">
                                                <td className="px-6 py-4 font-bold text-gray-900">{doc.BL_NUMBER}</td>
                                                <td className="px-6 py-4">#{doc.ORDER_NUMBER}</td>
                                                <td className="px-6 py-4">{new Date(doc.DELIVERY_DATE).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleDownloadPdf(`/documents/delivery-note/${doc.ID}/pdf`, `${doc.BL_NUMBER}.pdf`)} className="text-blue-600 hover:underline inline-flex items-center">
                                                        <Download size={16} className="mr-1" /> PDF
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'invoices' && (
                                <table className="w-full text-sm text-left text-gray-500">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3">N° Facture</th>
                                            <th className="px-6 py-3">Date d'émission</th>
                                            <th className="px-6 py-3">Statut</th>
                                            <th className="px-6 py-3">Montant TTC</th>
                                            <th className="px-6 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {documents.invoices.length === 0 ? (
                                            <tr><td colSpan="5" className="px-6 py-8 text-center">{getEmptyMessage()}</td></tr>
                                        ) : documents.invoices.map(doc => (
                                            <tr key={`${doc.TYPE}-${doc.ID}`} className="bg-white border-b hover:bg-gray-50">
                                                <td className="px-6 py-4 font-bold text-gray-900">{doc.INVOICE_NUMBER}</td>
                                                <td className="px-6 py-4">{new Date(doc.EMISSION_DATE).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${doc.STATUS === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {doc.STATUS === 'PAID' ? 'Payée' : 'Non payée'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-gray-900">{new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(doc.TOTAL_TTC || 0)}</td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    {doc.STATUS !== 'PAID' && (
                                                        <button
                                                            onClick={() => navigate(`/checkout/${doc.ID}`)}
                                                            className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs font-bold transition-colors"
                                                        >
                                                            Payer
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDownloadPdf(`/documents/invoice/${doc.ID}/pdf?type=${(doc.TYPE || 'REGULAR').toLowerCase()}`, `${doc.INVOICE_NUMBER}.pdf`)} className="text-blue-600 hover:underline inline-flex items-center text-xs">
                                                        <Download size={14} className="mr-1" /> PDF
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
