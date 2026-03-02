import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { CreditCard, ShieldCheck, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function Payment() {
    const { invoiceId } = useParams();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    const [form, setForm] = useState({
        cardNumber: '',
        cardName: '',
        expiry: '',
        cvv: ''
    });

    useEffect(() => {
        fetchInvoiceDetail();
    }, [invoiceId]);

    const fetchInvoiceDetail = async () => {
        try {
            // We use the general documents list to find our invoice since we don't have a specific "getInvoiceById" for clients yet
            const res = await api.get('/documents/my-documents');
            const inv = res.data.invoices.find(i => i.ID.toString() === invoiceId);
            if (!inv) throw new Error('Facture non trouvée');
            setInvoice(inv);
        } catch (err) {
            console.error(err);
            setError('Impossible de charger les détails de la facture.');
        } finally {
            setLoading(false);
        }
    };

    const handleInput = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setProcessing(true);
        setError(null);

        try {
            await new Promise(resolve => setTimeout(resolve, 800)); // Réduit à 0.8s pour le test
            await api.post(`/documents/invoice/${invoiceId}/pay`);
            alert('Paiement avec succès');
            setSuccess(true);
            setTimeout(() => navigate('/documents'), 2000);
        } catch (err) {
            console.error(err);
            setError('Le paiement a échoué. Veuillez vérifier vos coordonnées.');
            setProcessing(false);
        }
    };

    if (loading) return <div className="pt-32 text-center">Chargement...</div>;

    if (success) {
        return (
            <div className="pt-32 px-4 max-w-md mx-auto text-center">
                <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                        <CheckCircle2 size={48} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement Réussi !</h1>
                    <p className="text-gray-500 mb-6">Votre facture a été réglée avec succès. Vous allez être redirigé vers vos documents.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pt-24 pb-12 px-4 max-w-4xl mx-auto">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-primary mb-6 transition-colors">
                <ArrowLeft size={20} /> Retour aux documents
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Order Summary */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Détails de la Facture</h2>
                        {invoice && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">N° Facture</span>
                                    <span className="font-bold text-gray-900">{invoice.INVOICE_NUMBER}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Date d'émission</span>
                                    <span>{new Date(invoice.EMISSION_DATE).toLocaleDateString()}</span>
                                </div>
                                <div className="h-px bg-gray-100 my-2"></div>
                                <div className="flex justify-between items-center text-lg font-bold">
                                    <span className="text-gray-900">Total à payer</span>
                                    <span className="text-primary">{new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(invoice.TOTAL_TTC)}</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 italic">* Inclut 50.00 MAD de frais de livraison fixes.</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-700">
                        <ShieldCheck size={24} className="flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold">Paiement Sécurisé</p>
                            <p className="text-xs">Vos données bancaires sont cryptées et ne sont jamais stockées sur nos serveurs.</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex items-center gap-3 mb-4 text-gray-800">
                            <CreditCard className="text-primary" />
                            <span className="text-lg font-bold">Coordonnées Bancaires</span>
                        </div>

                        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du titulaire</label>
                                <input
                                    type="text"
                                    required
                                    name="cardName"
                                    value={form.cardName}
                                    onChange={handleInput}
                                    placeholder="M. AHMED ALAMI"
                                    className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-primary focus:border-primary transition-all uppercase"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de carte</label>
                                <input
                                    type="text"
                                    required
                                    name="cardNumber"
                                    value={form.cardNumber}
                                    onChange={handleInput}
                                    placeholder="XXXX XXXX XXXX XXXX"
                                    className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-primary focus:border-primary transition-all font-mono"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiration</label>
                                    <input
                                        type="text"
                                        required
                                        name="expiry"
                                        value={form.expiry}
                                        onChange={handleInput}
                                        placeholder="MM / YY"
                                        className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-primary focus:border-primary transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                                    <input
                                        type="password"
                                        required
                                        name="cvv"
                                        value={form.cvv}
                                        onChange={handleInput}
                                        placeholder="XXX"
                                        className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-primary focus:border-primary transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${processing ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-green-700 hover:shadow-green-500/30'}`}
                        >
                            {processing ? 'Traitement sécurisé...' : `Payer ${invoice ? new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(invoice.TOTAL_TTC) : ''}`}
                        </button>

                        <div className="flex justify-center gap-4 text-gray-300">
                            <img src="https://img.icons8.com/color/48/visa.png" alt="Visa" className="h-6 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer" />
                            <img src="https://img.icons8.com/color/48/mastercard.png" alt="Mastercard" className="h-6 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer" />
                            <img src="https://img.icons8.com/color/48/cmi.png" alt="CMI" className="h-6 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer" />
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
