import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product }) {
    const { addToCart } = useCart();

    const handleAddToCart = (e) => {
        e.preventDefault(); // Prevent navigation if wrapped in Link
        addToCart(product);
        // Optional: Show toast
    };

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-100 group">
            <div className="relative h-48 overflow-hidden bg-gray-200">
                {product.image_url ? (
                    <img src={product.image_url} alt={product.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        Pas d'image
                    </div>
                )}
                <button
                    onClick={handleAddToCart}
                    className="absolute bottom-2 right-2 p-2 bg-primary text-white rounded-full shadow-lg hover:bg-green-700 transition-colors opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 duration-200"
                    title="Ajouter au panier"
                >
                    <ShoppingCart size={20} />
                </button>
            </div>
            <div className="p-4">
                <div className="text-xs text-secondary font-bold uppercase tracking-wide mb-1">{product.category}</div>
                <h3 className="font-semibold text-lg text-gray-800 mb-1 truncate">{product.product_name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3 h-10">{product.description}</p>
                <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-gray-900">{product.prix_unitaire} MAD <span className="text-sm font-normal text-gray-500">/ {product.unit}</span></span>
                    {product.stock_disponible > 0 ? (
                        <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">En stock</span>
                    ) : (
                        <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">Épuisé</span>
                    )}
                </div>
            </div>
        </div>
    );
}
