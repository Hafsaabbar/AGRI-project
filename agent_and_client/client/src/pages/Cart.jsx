import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import api from '../api/axios';

export default function Cart() {
    const { cart, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const tva = cartTotal * 0.20;
    const totalTTC = cartTotal + tva;

    const handleCheckout = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            setLoading(true);
            const items = cart.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity
            }));

            await api.post('/orders', { items, notes: 'Commande via Web' });

            clearCart();
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError('Erreur lors de la commande. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    if (cart.length === 0) {
        return (
            <div className="pt-32 px-4 max-w-screen-xl mx-auto text-center min-h-[60vh]">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Votre panier est vide</h1>
                <p className="text-gray-500 mb-8">Découvrez nos produits frais et locaux.</p>
                <Link to="/products" className="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-center text-white rounded-lg bg-primary hover:bg-green-800 transition-colors">
                    Voir le catalogue
                </Link>
            </div>
        );
    }

    return (
        <div className="pt-24 px-4 max-w-screen-xl mx-auto min-h-screen">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Mon Panier</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Items List */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="p-6 space-y-6">
                        {cart.map(item => (
                            <div key={item.product_id} className="flex flex-col sm:flex-row items-center gap-4 border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                                <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full text-gray-400">IMG</div>
                                    )}
                                </div>
                                <div className="flex-grow text-center sm:text-left">
                                    <h3 className="font-semibold text-lg text-gray-800">{item.product_name}</h3>
                                    <p className="text-sm text-gray-500">{item.prix_unitaire} MAD / {item.unit}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="p-1 rounded-full hover:bg-gray-100 text-gray-600">
                                        <Minus size={16} />
                                    </button>
                                    <span className="font-medium w-8 text-center">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="p-1 rounded-full hover:bg-gray-100 text-gray-600">
                                        <Plus size={16} />
                                    </button>
                                </div>
                                <div className="font-bold text-lg text-gray-900 w-24 text-right">
                                    {(item.prix_unitaire * item.quantity).toFixed(2)} MAD
                                </div>
                                <button onClick={() => removeFromCart(item.product_id)} className="text-red-500 hover:text-red-700 p-2">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Récapitulatif</h2>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-gray-600">
                                <span>Total HT</span>
                                <span>{cartTotal.toFixed(2)} MAD</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>TVA (20%)</span>
                                <span>{tva.toFixed(2)} MAD</span>
                            </div>
                            <div className="h-px bg-gray-200 my-4"></div>
                            <div className="flex justify-between text-xl font-bold text-gray-900">
                                <span>Total TTC</span>
                                <span>{totalTTC.toFixed(2)} MAD</span>
                            </div>
                        </div>

                        {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm text-center mb-4">{error}</div>}

                        <button
                            onClick={handleCheckout}
                            disabled={loading}
                            className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-green-700 hover:shadow-green-500/30'}`}
                        >
                            {loading ? 'Traitement...' : (
                                <>
                                    Commander <ArrowRight size={20} />
                                </>
                            )}
                        </button>

                        <p className="text-xs text-gray-400 text-center mt-4">
                            En passant commande, vous acceptez nos conditions générales de vente.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
