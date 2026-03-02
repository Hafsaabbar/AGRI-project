import { useAuth } from '../context/AuthContext';
import { User, MapPin, Building, Phone, Mail, Calendar } from 'lucide-react';

export default function Profile() {
    const { user } = useAuth();

    if (!user) return <div className="pt-32 text-center">Chargement...</div>;

    const InfoItem = ({ icon: Icon, label, value }) => (
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="bg-white p-3 rounded-lg shadow-sm text-primary">
                <Icon size={24} />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
                <p className="text-lg font-semibold text-gray-900">{value || '-'}</p>
            </div>
        </div>
    );

    return (
        <div className="pt-24 px-4 max-w-4xl mx-auto min-h-screen">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Mon Profil</h1>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-green-400 p-8 text-white">
                    <div className="flex items-center gap-6">
                        <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
                            <User size={48} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold capitalize">{user.prenom} {user.nom}</h2>
                            <p className="opacity-90 flex items-center gap-2 mt-1">
                                <Building size={16} />
                                {user.entreprise || 'Particulier'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 border-b pb-2">Informations Personnelles</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoItem icon={Mail} label="Email" value={user.email} />
                        <InfoItem icon={Phone} label="Téléphone" value={user.tel} />
                        <InfoItem icon={Building} label="Entreprise" value={user.entreprise} />
                        <InfoItem icon={MapPin} label="Adresse" value={user.adresse} />
                        <InfoItem icon={MapPin} label="Ville" value={`${user.code_postal || ''} ${user.ville || ''}`} />
                        <InfoItem icon={Calendar} label="Membre depuis" value={new Date(user.created_at || Date.now()).toLocaleDateString()} />
                    </div>
                </div>
            </div>
        </div>
    );
}
