# AGRI Comptabilité

Application de comptabilité pour la gestion des factures, journal des ventes et clients pour le système AGRI.

## 🌐 Pages de l'interface

### 🔐 Page de connexion (`login.html`)
- Authentification des utilisateurs (agents comptables)
- Accès sécurisé au tableau de bord

### 📊 Tableau de bord
- **Chiffre d'affaires du mois** (TTC)
- **Statistiques factures** : total, en attente, impayés
- **Dernières factures** : aperçu des factures récentes
- **TVA collectée** et encaissements

### 📄 Factures mensuelles
- Liste paginée de toutes les factures
- **Filtrage** par statut (En attente, Payées, En retard)
- **Génération automatique** des factures mensuelles
- **Marquer comme payée** → ajoute automatiquement une écriture au journal
- **Détails facture** : client, période, montants HT/TVA/TTC, bons de livraison associés

### 📖 Journal des ventes
- **Écritures comptables** avec comptes débit/crédit
- **Filtrage par date** (période personnalisée)
- **Totaux automatiques** : HT, TVA, TTC
- **Ajout d'écriture manuelle** liée à une facture
- **Export CSV** pour intégration comptable externe
- **Suppression** d'écritures

### 🚚 Bons de livraison
- Consultation des BL depuis les agences
- **Informations** : numéro BL, date, client, commande, statut
- **Détails BL** : liste des produits livrés avec quantités et prix

### 👥 Clients
- Liste des clients avec leurs factures
- **Filtrage** par type (Particulier / Professionnel)
- **Statistiques client** : nombre de factures, total payé, impayés
- **Fiche client** détaillée

### 📈 Rapports
- **Chiffre d'affaires** : rapport mensuel/annuel (PDF ou CSV)
- **Impayés** : liste des factures en retard (PDF ou CSV)
- **Export journal** : export complet pour comptabilité

## 🛠️ Technologies

| Composant | Technologie |
|-----------|-------------|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| Base de données | Oracle Cloud |
| Authentification | JWT + localStorage |

## 🚀 Lancement

```bash
# Backend
cd backend
npm install
npm start   # Port 3003

# Frontend
# Accessible via http://localhost:3003/index.html
```

## 📁 Structure

```
agri-comptabilite/
├── backend/
│   ├── server.js          # Serveur Express
│   ├── routes/            # API REST
│   │   ├── dashboard.js   # Stats tableau de bord
│   │   ├── factures.js    # Gestion factures
│   │   ├── journal.js     # Journal des ventes
│   │   ├── livraisons.js  # Bons de livraison
│   │   ├── clients.js     # Gestion clients
│   │   └── reports.js     # Génération rapports
│   └── config/            # Configuration DB
└── frontend/
    ├── index.html         # Dashboard principal
    ├── login.html         # Page de connexion
    ├── css/style.css      # Styles
    └── js/app.js          # Logique JavaScript
```
