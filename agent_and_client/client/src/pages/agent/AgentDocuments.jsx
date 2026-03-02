import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { FileText, Download, Package } from 'lucide-react';

export default function AgentDocuments() {
    const [documents, setDocuments] = useState({ deliveryNotes: [], invoices: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const [blRes, invRes] = await Promise.all([
                api.get('/agent/delivery-notes'),
                api.get('/agent/invoices')
            ]);
            setDocuments({
                deliveryNotes: blRes.data || [],
                invoices: invRes.data || []
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

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestion des Documents</h1>

            {loading ? (
                <div className="text-center py-12">Chargement...</div>
            ) : (
                <div className="space-y-8">
                    {/* Invoices Section */}
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700">Factures Clients</div>
                        {documents.invoices.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">Aucune facture générée.</div>
                        ) : (
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3">N° Facture</th>
                                        <th className="px-6 py-3">Client</th>
                                        <th className="px-6 py-3">Type</th>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Montant TTC</th>
                                        <th className="px-6 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.invoices.map(inv => (
                                        <tr key={`${inv.TYPE}-${inv.ID}`} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4 font-bold text-gray-900">{inv.INVOICE_NUMBER}</td>
                                            <td className="px-6 py-4">{inv.NOM_CLIENT}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${inv.TYPE === 'MONTHLY' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                                    {inv.TYPE === 'MONTHLY' ? 'Mensuelle' : 'Standard'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{new Date(inv.EMISSION_DATE).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-bold text-green-600">
                                                {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(inv.TOTAL_TTC || 0)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDownloadPdf(`/documents/agent/invoice/${inv.ID}/pdf?type=${(inv.TYPE || 'REGULAR').toLowerCase()}`, `${inv.INVOICE_NUMBER}.pdf`)}
                                                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                                                >
                                                    <Download size={16} className="mr-1" /> PDF
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* BL Section */}
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700">Bons de Livraison</div>
                        {documents.deliveryNotes.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">Aucun bon de livraison.</div>
                        ) : (
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3">N° BL</th>
                                        <th className="px-6 py-3">Client</th>
                                        <th className="px-6 py-3">Commande</th>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.deliveryNotes.map(bl => (
                                        <tr key={bl.ID} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4 font-bold text-gray-900">{bl.BL_NUMBER}</td>
                                            <td className="px-6 py-4">{bl.NOM_CLIENT}</td>
                                            <td className="px-6 py-4">{bl.ORDER_NUMBER}</td>
                                            <td className="px-6 py-4">{new Date(bl.DELIVERY_DATE).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDownloadPdf(`/documents/agent/delivery-note/${bl.ID}/pdf`, `${bl.BL_NUMBER}.pdf`)}
                                                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                                                >
                                                    <Download size={16} className="mr-1" /> PDF
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
