import { useEffect, useState } from 'react';
import api from '../api/axios';
import ProductCard from '../components/ProductCard';
import { Search, Filter } from 'lucide-react';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProducts();
    }, [search, category]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const params = {};
            if (search) params.search = search;
            if (category) params.category = category;

            const res = await api.get('/products', { params });
            setProducts(res.data);
            setError(null);
        } catch (err) {
            setError('Impossible de charger les produits. Veuillez réessayer plus tard.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Debounce search could be added here, but for now direct dependency is fine for small scale

    return (
        <div className="pt-24 px-4 max-w-screen-xl mx-auto min-h-screen">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Nos Produits</h1>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full pl-10 p-2.5"
                        placeholder="Rechercher un produit (ex: Pommes, Blé...)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Filter className="w-4 h-4 text-gray-400" />
                        </div>
                        <select
                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full pl-10 p-2.5"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            <option value="">Toutes catégories</option>
                            <option value="FRUITS">Fruits</option>
                            <option value="LEGUMES">Légumes</option>
                            <option value="CEREALES">Céréales</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-80 bg-gray-200 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-12 bg-red-50 rounded-lg text-red-600">
                    {error}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {products.length > 0 ? (
                        products.map(product => (
                            <ProductCard key={product.PRODUCT_ID} product={{
                                product_id: product.PRODUCT_ID,
                                product_name: product.PRODUCT_NAME,
                                description: product.DESCRIPTION,
                                category: product.CATEGORY,
                                prix_unitaire: product.PRIX_UNITAIRE,
                                unit: product.UNIT,
                                stock_disponible: product.STOCK_DISPONIBLE,
                                image_url: product.IMAGE_URL
                            }} />
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            Aucun produit trouvé.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
