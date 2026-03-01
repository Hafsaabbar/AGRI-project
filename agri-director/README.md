# AGRI Director - Tableau de Bord

Interface de gestion pour le directeur de la société **AGRI Maroc** - Une application web complète pour la supervision des opérations, clients, catalogue et comptabilité.

## 🚀 Fonctionnalités

### Authentification
- Page de connexion sécurisée
- Gestion des sessions utilisateurs
- Déconnexion

### Pages de l'Interface

| Page | Description |
|------|-------------|
| **Tableau de Bord** | Vue d'ensemble avec statistiques (clients, produits, commandes, agences), graphiques d'évolution des ventes, top produits et dernières commandes |
| **Catalogue** | Gestion des produits : ajout, modification, suppression, recherche, filtrage par catégorie, mise à jour groupée des prix |
| **Agences** | Gestion des agences : création, édition, visualisation des informations (ville, région, téléphone, responsable, statut) |
| **Clients** | Supervision des clients avec filtrage par type (Particulier, Professionnel, Agriculteur) et statut (Approuvé, En attente, Suspendu), export possible |
| **Factures** | Gestion des factures mensuelles : génération automatique, filtrage par mois/année/statut, marquage comme payée |
| **Journal des Ventes** | Suivi comptable des écritures avec filtrage par date, totaux HT/TVA/TTC, export CSV |
| **Statistiques** | Rapports visuels : répartition des clients, anniversaires à venir, répartition géographique |

## 🛠️ Stack Technique

- **Frontend** : HTML5, CSS3, JavaScript (Vanilla)
- **Librairies** : Chart.js (graphiques), Font Awesome (icônes), Inter (police)
- **Backend** : Node.js, Express.js
- **Base de données** : Oracle Cloud

## 📁 Structure du Projet

```
agri-director/
├── frontend/
│   ├── index.html      # Interface principale
│   ├── login.html      # Page de connexion
│   ├── css/styles.css  # Styles CSS
│   └── js/app.js       # Logique JavaScript
├── backend/
│   ├── server.js       # Serveur Express
│   ├── config/         # Configuration (base de données)
│   └── routes/         # Routes API REST
└── package.json
```

## 🚀 Démarrage

```bash
# Installation des dépendances
npm install

# Lancement du serveur
npm start
```

L'application sera accessible sur `http://localhost:3003`

## 📊 Catégories de Produits

- Huiles, Céréales, Fruits, Légumes, Épices
- Dattes, Miel, Argan, Olives, Autres

## 👥 Types de Clients

- **Particulier** : Clients individuels
- **Professionnel** : Détaillants
- **Agriculteur** : Producteurs agricoles
