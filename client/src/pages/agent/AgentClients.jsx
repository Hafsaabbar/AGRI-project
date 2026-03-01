import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Search, Trash2, Mail, Phone, MapPin, Building } from 'lucide-react';

export default function AgentClients() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const res = await api.get('/agent/clients');
            setClients(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.')) return;
        try {
            await api.delete(`/agent/clients/${id}`);
            setClients(clients.filter(c => c.ID !== id));
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la suppression');
        }
    };

    const filteredClients = clients.filter(c =>
        (c.NOM_CLIENT && c.NOM_CLIENT.toLowerCase().includes(search.toLowerCase())) ||
        (c.ENTREPRISE && c.ENTREPRISE.toLowerCase().includes(search.toLowerCase())) ||
        (c.EMAIL && c.EMAIL.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Mes Clients ({clients.length})</h1>

                <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full pl-10 p-2.5"
                        placeholder="Rechercher (Nom, Entreprise, Email...)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">Chargement...</div>
            ) : filteredClients.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow">
                    <p className="text-gray-500">Aucun client trouvé.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map(client => (
                        <div key={client.ID} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-xl">
                                        {client.NOM_CLIENT.charAt(0)}
                                    </div>
                                    <button
                                        onClick={() => handleDelete(client.ID)}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                        title="Supprimer"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <h3 className="font-bold text-lg text-gray-900 mb-1">{client.NOM_CLIENT} {client.PRENOM}</h3>
                                {client.ENTREPRISE && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                                        <Building size={14} />
                                        <span>{client.ENTREPRISE}</span>
                                    </div>
                                )}

                                <div className="space-y-2 text-sm text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <Mail size={14} />
                                        <span>{client.EMAIL}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone size={14} />
                                        <span>{client.TEL || 'Non renseigné'}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <MapPin size={14} className="mt-0.5" />
                                        <span>{client.ADRESSE ? `${client.ADRESSE}, ${client.VILLE}` : client.VILLE}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
                                <span>Inscrit le {new Date(client.CREATED_AT).toLocaleDateString()}</span>
                                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">{client.TYPE_CLIENT}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
