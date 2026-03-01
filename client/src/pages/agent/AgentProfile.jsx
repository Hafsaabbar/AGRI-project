import { User, Briefcase, Mail, Building2, ShieldCheck } from 'lucide-react';

export default function AgentProfile() {
    const agent = JSON.parse(localStorage.getItem('agent') || '{}');

    const InfoItem = ({ icon: Icon, label, value }) => (
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="bg-white p-3 rounded-lg shadow-sm text-green-700">
                <Icon size={24} />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
                <p className="text-lg font-semibold text-gray-900">{value || '-'}</p>
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Mon Profil Agent</h1>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-gray-100 p-8">
                    <div className="flex items-center gap-6">
                        <div className="bg-green-100 p-4 rounded-full text-green-700">
                            <User size={40} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 capitalize">{agent.prenom} {agent.nom}</h2>
                            <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full mt-2 inline-block">
                                Agent Commercial
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoItem icon={Mail} label="Email Professionnel" value={agent.email} />
                        <InfoItem icon={Briefcase} label="Rôle" value="Gestionnaire de Clients" />
                        <InfoItem icon={Building2} label="Agence Rattachée" value={agent.agenceNom} />
                        <InfoItem icon={ShieldCheck} label="Statut" value="Actif" />
                    </div>

                    <div className="mt-8 p-4 bg-blue-50 text-blue-700 rounded-xl text-sm">
                        <p className="font-semibold mb-1">Note d'information :</p>
                        <p>Pour modifier vos informations personnelles ou changer d'affectation d'agence, veuillez contacter l'administrateur système.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
