import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <div className="pt-16">
            {/* Hero Section */}
            <section className="bg-white dark:bg-gray-900 bg-[url('https://images.unsplash.com/photo-1625246333195-098e98e2f8fc?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat bg-blend-overlay bg-gray-900/60 h-[500px] flex items-center justify-center text-center">
                <div className="px-4 mx-auto max-w-screen-xl py-24 lg:py-56">
                    <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-white md:text-5xl lg:text-6xl animate-fade-in-up">
                        Le Meilleur de l'Agriculture, <span className="text-secondary">Directement chez Vous</span>
                    </h1>
                    <p className="mb-8 text-lg font-normal text-gray-300 lg:text-xl sm:px-16 lg:px-48 animate-fade-in-up delay-100">
                        AgriMart connecte les producteurs et les consommateurs. Qualité, fraîcheur et transparence garanties.
                    </p>
                    <div className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4 animate-fade-in-up delay-200">
                        <Link to="/products" className="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-center text-white rounded-lg bg-primary hover:bg-green-800 focus:ring-4 focus:ring-green-300 transition-all shadow-lg hover:shadow-green-500/50">
                            Voir les Produits
                            <svg className="w-3.5 h-3.5 ms-2 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 5h12m0 0L9 1m4 4L9 9" />
                            </svg>
                        </Link>
                        <Link to="/register" className="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-center text-white rounded-lg border border-white hover:bg-white hover:text-gray-900 focus:ring-4 focus:ring-gray-400 transition-all backdrop-blur-sm bg-white/10">
                            Créer un Compte
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-16 bg-white">
                <div className="max-w-screen-xl mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-gray-900 mb-12">Pourquoi choisir AgriMart ?</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-6 bg-green-50 rounded-xl hover:shadow-xl transition-shadow">
                            <div className="w-12 h-12 bg-green-100 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Sécurité Garantie</h3>
                            <p className="text-gray-600">Paiements sécurisés et données protégées par les standards Oracle Cloud.</p>
                        </div>
                        <div className="p-6 bg-yellow-50 rounded-xl hover:shadow-xl transition-shadow">
                            <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Livraison Rapide</h3>
                            <p className="text-gray-600">Logistique optimisée pour vous livrer des produits frais en temps record.</p>
                        </div>
                        <div className="p-6 bg-blue-50 rounded-xl hover:shadow-xl transition-shadow">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Service Client</h3>
                            <p className="text-gray-600">Une équipe dédiée pour répondre à toutes vos questions.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
