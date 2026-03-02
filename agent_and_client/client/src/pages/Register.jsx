import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
    const [formData, setFormData] = useState({
        email: '', password: '', nom: '', prenom: '',
        entreprise: '', type_client: 'PARTICULIER',
        tel: '', adresse: '', ville: '', code_postal: ''
    });
    const { register } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(formData);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Échec de l\'inscription');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pt-24">
            <div className="w-full max-w-2xl space-y-8 bg-white p-8 rounded-xl shadow-lg">
                <div className="text-center">
                    <img src="/logo.png" alt="AgriMart" className="mx-auto h-20 w-auto mb-4" />
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Créer un compte</h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Déjà membre? <Link to="/login" className="font-medium text-primary hover:text-green-700">Connectez-vous</Link>
                    </p>
                </div>
                {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm text-center">{error}</div>}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="nom" required placeholder="Nom" onChange={handleChange} className="input-field p-2 border rounded" />
                        <input name="prenom" placeholder="Prénom" onChange={handleChange} className="input-field p-2 border rounded" />
                        <input name="email" type="email" required placeholder="Email" onChange={handleChange} className="input-field p-2 border rounded" />
                        <input name="password" type="password" required placeholder="Mot de passe" onChange={handleChange} className="input-field p-2 border rounded" />

                        <select name="type_client" onChange={handleChange} className="input-field p-2 border rounded">
                            <option value="PARTICULIER">Particulier</option>
                            <option value="PROFESSIONNEL">Professionnel</option>
                            <option value="AGRICULTEUR">Agriculteur</option>
                        </select>
                        <input name="entreprise" placeholder="Entreprise (si applicable)" onChange={handleChange} className="input-field p-2 border rounded" />

                        <input name="tel" placeholder="Téléphone" onChange={handleChange} className="input-field p-2 border rounded" />
                        <input name="adresse" placeholder="Adresse" onChange={handleChange} className="input-field p-2 border rounded" />
                        <input name="ville" placeholder="Ville" onChange={handleChange} className="input-field p-2 border rounded" />
                        <input name="code_postal" placeholder="Code Postal" onChange={handleChange} className="input-field p-2 border rounded" />
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="group relative flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                        >
                            S'inscrire et commencer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
