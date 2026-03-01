# AGRI Fournisseur

Portail de gestion dédié aux fournisseurs agricoles. Cette application permet aux fournisseurs de gérer leur catalogue de produits, suivre leurs livraisons et administrer leur profil.

## 📋 Pages de l'application

### 🔐 Authentification

| Page | Description |
|------|-------------|
| **Connexion** (`index.html`) | Page de connexion avec email et mot de passe |
| **Inscription** (`register.html`) | Formulaire de création de compte fournisseur (nom, email, type, téléphone, ville, adresse) |

### 📊 Dashboard (`dashboard.html`)

Interface principale avec navigation latérale donnant accès aux modules suivants :

| Module | Description |
|--------|-------------|
| **Vue d'ensemble** | Tableau de bord avec statistiques générales de l'activité |
| **Catalogue** | Gestion des produits (ajout, modification, suppression) avec catégories, prix, stock |
| **Livraisons** | Suivi des livraisons et historique |
| **Mon Profil** | Paramètres du compte fournisseur |

## ✨ Fonctionnalités principales

- **Authentification sécurisée** - Connexion / Inscription avec validation
- **Gestion du catalogue** - CRUD complet des produits (code, catégorie, nom, description, unité, prix, stock)
- **Catégories supportées** - Céréales, Légumes, Fruits, Engrais, Semences, Équipements
- **Suivi des livraisons** - Consultation des détails de livraison
- **Interface moderne** - Design responsive avec thème vert premium

## 🛠️ Stack technique

- **Frontend** : HTML, CSS, JavaScript vanilla
- **Backend** : Node.js avec Express
- **Base de données** : Oracle Cloud

## 🚀 Démarrage

```bash
# Installation des dépendances
cd backend
npm install

# Lancement du serveur
npm start
```

Le frontend est accessible via le serveur Express qui sert les fichiers statiques.
