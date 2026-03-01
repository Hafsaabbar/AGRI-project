// =====================================================
// AGRI FOURNISSEUR - Application JavaScript
// Style identique à Director Dashboard
// =====================================================

const API_URL = '';
let currentUser = null;
let currentPage = 'dashboard';

// =====================================================
// INITIALISATION
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
    document.getElementById('logoutBtn').addEventListener('click', logout);
});

function checkAuth() {
    const userData = localStorage.getItem('fournisseur');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = JSON.parse(userData);
    updateUserInfo();
    loadDashboard();
}

function updateUserInfo() {
    if (currentUser) {
        const initials = (currentUser.nom?.charAt(0) || 'F').toUpperCase();
        document.getElementById('userAvatar').textContent = initials;
        document.getElementById('userName').textContent =
            currentUser.raison_sociale || `${currentUser.nom} ${currentUser.prenom || ''}`.trim();
        document.getElementById('userRole').textContent =
            capitalizeFirst(currentUser.type_fournisseur) || 'Fournisseur';
    }
}

function capitalizeFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-Fournisseur-Id': localStorage.getItem('fournisseurId') || ''
    };
}

function logout() {
    localStorage.removeItem('fournisseur');
    localStorage.removeItem('fournisseurId');
    window.location.href = 'index.html';
}

function refreshPage() {
    switch (currentPage) {
        case 'dashboard': loadDashboard(); break;
        case 'produits': loadProduits(); break;
        case 'livraisons': loadLivraisons(); break;
        case 'profil': loadProfil(); break;
    }
}

// =====================================================
// NAVIGATION
// =====================================================

function setupNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });
}

function navigateTo(page) {
    currentPage = page;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) item.classList.add('active');
    });

    const titles = {
        'dashboard': { title: 'Tableau de Bord', sub: 'Vue d\'ensemble de l\'activité' },
        'produits': { title: 'Catalogue', sub: 'Gestion de vos produits' },
        'livraisons': { title: 'Livraisons', sub: 'Suivi des expéditions' },
        'profil': { title: 'Mon Profil', sub: 'Informations personnelles' }
    };

    document.getElementById('pageTitle').textContent = titles[page]?.title || 'Dashboard';
    document.getElementById('pageSubtitle').textContent = titles[page]?.sub || '';

    switch (page) {
        case 'dashboard': loadDashboard(); break;
        case 'produits': loadProduits(); break;
        case 'livraisons': loadLivraisons(); break;
        case 'profil': loadProfil(); break;
    }
}

// =====================================================
// DASHBOARD
// =====================================================

async function loadDashboard() {
    const content = document.getElementById('pageContent');
    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        const response = await fetch(`${API_URL}/api/dashboard/stats`, { headers: getAuthHeaders() });
        const data = await response.json();

        if (data.success) {
            const s = data.data;
            content.innerHTML = `
                <!-- Stats Grid -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon green"><i class="fas fa-boxes-stacked"></i></div>
                        <div class="stat-info">
                            <h3>${s.produits_actifs || 0}</h3>
                            <p>Produits au catalogue</p>
                            <div class="stat-change positive"><i class="fas fa-check"></i> Actifs</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon blue"><i class="fas fa-truck"></i></div>
                        <div class="stat-info">
                            <h3>${s.livraisons_mois || 0}</h3>
                            <p>Livraisons ce mois</p>
                            <div class="stat-change positive"><i class="fas fa-arrow-up"></i> En cours</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon orange"><i class="fas fa-coins"></i></div>
                        <div class="stat-info">
                            <h3>${formatCurrency(s.ca_mois || 0)}</h3>
                            <p>Chiffre d'affaires</p>
                            <div class="stat-change positive"><i class="fas fa-chart-line"></i> Ce mois</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon red"><i class="fas fa-triangle-exclamation"></i></div>
                        <div class="stat-info">
                            <h3>${s.produits_rupture || 0}</h3>
                            <p>En rupture de stock</p>
                            <div class="stat-change negative"><i class="fas fa-exclamation"></i> À réapprovisionner</div>
                        </div>
                    </div>
                </div>
                
                <!-- Content Grid -->
                <div class="grid grid-cols-2">
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-boxes-stacked"></i> Produits récents</h3>
                            <button class="btn btn-sm btn-secondary" onclick="navigateTo('produits')">Voir tout</button>
                        </div>
                        <div class="card-body" id="recentProducts" style="padding: 0;">
                            <div class="loading"><div class="spinner"></div></div>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-truck"></i> Dernières livraisons</h3>
                            <button class="btn btn-sm btn-secondary" onclick="navigateTo('livraisons')">Voir tout</button>
                        </div>
                        <div class="card-body" id="recentDeliveries" style="padding: 0;">
                            <div class="loading"><div class="spinner"></div></div>
                        </div>
                    </div>
                </div>
            `;
            loadRecentProducts();
            loadRecentDeliveries();
        } else {
            showDashboardError(content);
        }
    } catch (err) {
        showDashboardError(content);
    }
}

function showDashboardError(content) {
    content.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-icon green"><i class="fas fa-boxes-stacked"></i></div><div class="stat-info"><h3>--</h3><p>Produits</p></div></div>
            <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-truck"></i></div><div class="stat-info"><h3>--</h3><p>Livraisons</p></div></div>
            <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-coins"></i></div><div class="stat-info"><h3>--</h3><p>CA du mois</p></div></div>
            <div class="stat-card"><div class="stat-icon red"><i class="fas fa-triangle-exclamation"></i></div><div class="stat-info"><h3>--</h3><p>Rupture</p></div></div>
        </div>
        <div class="alert alert-error">Erreur de connexion au serveur. Vérifiez que le backend est démarré.</div>
    `;
}

async function loadRecentProducts() {
    const container = document.getElementById('recentProducts');
    try {
        const response = await fetch(`${API_URL}/api/dashboard/recent-products`, { headers: getAuthHeaders() });
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            container.innerHTML = `
                <table class="data-table">
                    <thead><tr><th>Produit</th><th>Catégorie</th><th>Prix</th><th>Stock</th></tr></thead>
                    <tbody>
                        ${data.data.map(p => `
                            <tr>
                                <td><strong>${p.PRODUCT_NAME}</strong></td>
                                <td><span class="badge badge-primary">${p.CATEGORY || '-'}</span></td>
                                <td>${formatCurrency(p.PRIX_UNITAIRE)}</td>
                                <td><span class="badge ${p.STOCK_DISPONIBLE > 10 ? 'badge-success' : p.STOCK_DISPONIBLE > 0 ? 'badge-warning' : 'badge-danger'}">${p.STOCK_DISPONIBLE}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-boxes-stacked"></i><h3>Aucun produit</h3><p>Ajoutez vos premiers produits</p></div>';
        }
    } catch (e) { container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Erreur</h3></div>'; }
}

async function loadRecentDeliveries() {
    const container = document.getElementById('recentDeliveries');
    try {
        const response = await fetch(`${API_URL}/api/dashboard/recent-deliveries`, { headers: getAuthHeaders() });
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            container.innerHTML = `
                <table class="data-table">
                    <thead><tr><th>N° BL</th><th>Client</th><th>Date</th><th>Statut</th></tr></thead>
                    <tbody>
                        ${data.data.map(d => `
                            <tr>
                                <td><strong>${d.BL_NUMBER}</strong></td>
                                <td>${d.NOM_CLIENT || '-'}</td>
                                <td>${formatDate(d.DELIVERY_DATE)}</td>
                                <td><span class="badge ${d.DELIVERY_STATUS === 'COMPLETE' ? 'badge-success' : 'badge-warning'}">${d.DELIVERY_STATUS}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-truck"></i><h3>Aucune livraison</h3><p>Les livraisons apparaîtront ici</p></div>';
        }
    } catch (e) { container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Erreur</h3></div>'; }
}

// =====================================================
// PRODUITS
// =====================================================

let productsData = [];
let productsPagination = { page: 1, limit: 10 };

async function loadProduits() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="search-bar">
            <div class="search-input">
                <i class="fas fa-search"></i>
                <input type="text" id="productsSearch" class="form-control" placeholder="Rechercher un produit...">
            </div>
            <select id="productsFilter" class="form-control form-select" style="width: 200px;">
                <option value="">Toutes catégories</option>
                <option value="CEREALES">Céréales</option>
                <option value="LEGUMES">Légumes</option>
                <option value="FRUITS">Fruits</option>
                <option value="ENGRAIS">Engrais</option>
                <option value="SEMENCES">Semences</option>
                <option value="EQUIPEMENTS">Équipements</option>
            </select>
            <button class="btn btn-primary" onclick="openProductModal()"><i class="fas fa-plus"></i> Ajouter</button>
        </div>
        <div class="card">
            <div class="table-container">
                <table class="data-table">
                    <thead><tr><th>Code</th><th>Produit</th><th>Catégorie</th><th>Prix unitaire</th><th>Stock</th><th>Actions</th></tr></thead>
                    <tbody id="productsBody"><tr><td colspan="6"><div class="loading"><div class="spinner"></div></div></td></tr></tbody>
                </table>
            </div>
            <div class="pagination" id="productsPagination"></div>
        </div>
    `;

    document.getElementById('productsSearch').addEventListener('input', debounce(() => { productsPagination.page = 1; fetchProducts(); }, 300));
    document.getElementById('productsFilter').addEventListener('change', () => { productsPagination.page = 1; fetchProducts(); });
    fetchProducts();
}

async function fetchProducts() {
    const tbody = document.getElementById('productsBody');
    tbody.innerHTML = '<tr><td colspan="6"><div class="loading"><div class="spinner"></div></div></td></tr>';

    try {
        const params = new URLSearchParams({ page: productsPagination.page, limit: productsPagination.limit });
        const search = document.getElementById('productsSearch')?.value;
        const category = document.getElementById('productsFilter')?.value;
        if (search) params.append('search', search);
        if (category) params.append('category', category);

        const response = await fetch(`${API_URL}/api/produits?${params}`, { headers: getAuthHeaders() });
        const data = await response.json();

        if (data.success) {
            productsData = data.data;
            productsPagination = { ...productsPagination, ...data.pagination };
            renderProducts();
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center">${data.error}</td></tr>`;
        }
    } catch { tbody.innerHTML = '<tr><td colspan="6" class="text-center">Erreur de connexion</td></tr>'; }
}

function renderProducts() {
    const tbody = document.getElementById('productsBody');
    if (productsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-boxes-stacked"></i><h3>Aucun produit trouvé</h3><p>Ajoutez votre premier produit</p></div></td></tr>';
        return;
    }

    tbody.innerHTML = productsData.map(p => `
        <tr>
            <td><code>${p.PRODUCT_CODE || '-'}</code></td>
            <td><strong>${p.PRODUCT_NAME}</strong>${p.DESCRIPTION ? `<br><small style="color: var(--text-muted)">${truncate(p.DESCRIPTION, 40)}</small>` : ''}</td>
            <td><span class="badge badge-info">${p.CATEGORY || '-'}</span></td>
            <td><strong>${formatCurrency(p.PRIX_UNITAIRE)}</strong> / ${p.UNIT || 'KG'}</td>
            <td><span class="badge ${getStockBadgeClass(p.STOCK_DISPONIBLE, p.STOCK_MINIMUM)}">${p.STOCK_DISPONIBLE}</span></td>
            <td>
                <button class="btn btn-icon" onclick="editProduct(${p.PRODUCT_ID})" title="Modifier"><i class="fas fa-edit"></i></button>
                <button class="btn btn-icon" onclick="deleteProduct(${p.PRODUCT_ID})" title="Supprimer" style="color: var(--danger);"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function openProductModal(id = null) {
    document.getElementById('productModal').classList.add('active');
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productModalTitle').textContent = 'Ajouter un produit';

    if (id) {
        const p = productsData.find(x => x.PRODUCT_ID === id);
        if (p) {
            document.getElementById('productModalTitle').textContent = 'Modifier le produit';
            document.getElementById('productId').value = p.PRODUCT_ID;
            document.getElementById('productCode').value = p.PRODUCT_CODE || '';
            document.getElementById('productName').value = p.PRODUCT_NAME || '';
            document.getElementById('productDescription').value = p.DESCRIPTION || '';
            document.getElementById('productCategory').value = p.CATEGORY || '';
            document.getElementById('productUnit').value = p.UNIT || 'KG';
            document.getElementById('productPrice').value = p.PRIX_UNITAIRE || '';
            document.getElementById('productStock').value = p.STOCK_DISPONIBLE || 0;
            document.getElementById('productStockMin').value = p.STOCK_MINIMUM || 10;
        }
    }
}

function closeProductModal() { document.getElementById('productModal').classList.remove('active'); }
function editProduct(id) { openProductModal(id); }

async function saveProduct() {
    const id = document.getElementById('productId').value;
    const formData = {
        product_code: document.getElementById('productCode').value,
        product_name: document.getElementById('productName').value,
        description: document.getElementById('productDescription').value,
        category: document.getElementById('productCategory').value,
        unit: document.getElementById('productUnit').value,
        prix_unitaire: parseFloat(document.getElementById('productPrice').value),
        stock_disponible: parseInt(document.getElementById('productStock').value) || 0,
        stock_minimum: parseInt(document.getElementById('productStockMin').value) || 10
    };

    if (!formData.product_name || !formData.category || !formData.prix_unitaire) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }

    try {
        const response = await fetch(id ? `${API_URL}/api/produits/${id}` : `${API_URL}/api/produits`, {
            method: id ? 'PUT' : 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        const data = await response.json();
        if (data.success) { closeProductModal(); fetchProducts(); }
        else { alert(data.error); }
    } catch { alert('Erreur serveur'); }
}

async function deleteProduct(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
    try {
        const response = await fetch(`${API_URL}/api/produits/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) fetchProducts();
        else alert(data.error);
    } catch { alert('Erreur serveur'); }
}

// =====================================================
// LIVRAISONS
// =====================================================

let livraisonsData = [];

async function loadLivraisons() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="search-bar">
            <select id="livraisonsFilter" class="form-control form-select" style="width: 200px;">
                <option value="">Tous les statuts</option>
                <option value="PARTIELLE">Partielle</option>
                <option value="COMPLETE">Complète</option>
            </select>
        </div>
        <div class="card">
            <div class="table-container">
                <table class="data-table">
                    <thead><tr><th>N° BL</th><th>Client</th><th>Date</th><th>Statut</th><th>Commande</th><th>Actions</th></tr></thead>
                    <tbody id="livraisonsBody"><tr><td colspan="6"><div class="loading"><div class="spinner"></div></div></td></tr></tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('livraisonsFilter').addEventListener('change', (e) => fetchLivraisons(e.target.value));
    fetchLivraisons();
}

async function fetchLivraisons(status = '') {
    const tbody = document.getElementById('livraisonsBody');
    tbody.innerHTML = '<tr><td colspan="6"><div class="loading"><div class="spinner"></div></div></td></tr>';

    try {
        const params = new URLSearchParams({ page: 1, limit: 20 });
        if (status) params.append('status', status);

        const response = await fetch(`${API_URL}/api/livraisons?${params}`, { headers: getAuthHeaders() });
        const data = await response.json();

        if (data.success) {
            livraisonsData = data.data;
            if (livraisonsData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-truck"></i><h3>Aucune livraison</h3></div></td></tr>';
            } else {
                tbody.innerHTML = livraisonsData.map(l => `
                    <tr>
                        <td><strong>${l.BL_NUMBER}</strong></td>
                        <td>${l.NOM_CLIENT || '-'}${l.VILLE ? `<br><small style="color: var(--text-muted)">${l.VILLE}</small>` : ''}</td>
                        <td>${formatDate(l.DELIVERY_DATE)}</td>
                        <td><span class="badge ${l.DELIVERY_STATUS === 'COMPLETE' ? 'badge-success' : 'badge-warning'}">${l.DELIVERY_STATUS}</span></td>
                        <td><code>${l.ORDER_NUMBER || '-'}</code></td>
                        <td><button class="btn btn-icon" onclick="viewDelivery(${l.ID})"><i class="fas fa-eye"></i></button></td>
                    </tr>
                `).join('');
            }
        }
    } catch { tbody.innerHTML = '<tr><td colspan="6" class="text-center">Erreur</td></tr>'; }
}

async function viewDelivery(id) {
    document.getElementById('deliveryModal').classList.add('active');
    document.getElementById('deliveryDetails').innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        const response = await fetch(`${API_URL}/api/livraisons/${id}`, { headers: getAuthHeaders() });
        const data = await response.json();

        if (data.success) {
            const d = data.data;
            document.getElementById('deliveryDetails').innerHTML = `
                <h4 style="margin-bottom: 8px;">Bon de livraison: ${d.BL_NUMBER}</h4>
                <p style="color: var(--text-muted); margin-bottom: 20px;">Commande: ${d.ORDER_NUMBER || '-'}</p>
                <div class="grid grid-cols-2" style="margin-bottom: 24px;">
                    <div><strong>Client</strong><br>${d.NOM_CLIENT} ${d.PRENOM || ''}<br>${d.ADRESSE || ''}<br>${d.VILLE || ''}</div>
                    <div><strong>Date</strong><br>${formatDate(d.DELIVERY_DATE)}<br><br><strong>Statut</strong><br><span class="badge ${d.DELIVERY_STATUS === 'COMPLETE' ? 'badge-success' : 'badge-warning'}">${d.DELIVERY_STATUS}</span></div>
                </div>
                <h4 style="margin-bottom: 12px;">Produits livrés</h4>
                ${d.items?.length ? `
                    <table class="data-table">
                        <thead><tr><th>Produit</th><th>Qté</th><th>Prix</th><th>Total</th></tr></thead>
                        <tbody>${d.items.map(i => `<tr><td>${i.PRODUCT_NAME}</td><td>${i.QUANTITY_DELIVERED}</td><td>${formatCurrency(i.PRIX_UNITAIRE)}</td><td><strong>${formatCurrency(i.QUANTITY_DELIVERED * i.PRIX_UNITAIRE)}</strong></td></tr>`).join('')}</tbody>
                    </table>
                ` : '<p style="color: var(--text-muted)">Aucun produit</p>'}
            `;
        }
    } catch { document.getElementById('deliveryDetails').innerHTML = '<div class="alert alert-error">Erreur</div>'; }
}

function closeDeliveryModal() { document.getElementById('deliveryModal').classList.remove('active'); }

// =====================================================
// PROFIL
// =====================================================

async function loadProfil() {
    const content = document.getElementById('pageContent');
    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        const response = await fetch(`${API_URL}/api/profil`, { headers: getAuthHeaders() });
        const data = await response.json();

        if (data.success) {
            const p = data.data;
            content.innerHTML = `
                <div class="grid grid-cols-2">
                    <div class="card">
                        <div class="card-header"><h3><i class="fas fa-user"></i> Informations personnelles</h3></div>
                        <div class="card-body">
                            <form id="profilForm">
                                <div class="form-row">
                                    <div class="form-group"><label class="form-label">Nom *</label><input type="text" id="profilNom" class="form-control" value="${p.NOM || ''}" required></div>
                                    <div class="form-group"><label class="form-label">Prénom</label><input type="text" id="profilPrenom" class="form-control" value="${p.PRENOM || ''}"></div>
                                </div>
                                <div class="form-group"><label class="form-label">Raison sociale</label><input type="text" id="profilRaisonSociale" class="form-control" value="${p.RAISON_SOCIALE || ''}"></div>
                                <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-control" value="${p.EMAIL || ''}" disabled></div>
                                <div class="form-row">
                                    <div class="form-group"><label class="form-label">Téléphone</label><input type="tel" id="profilTelephone" class="form-control" value="${p.TELEPHONE || ''}"></div>
                                    <div class="form-group"><label class="form-label">Ville</label><input type="text" id="profilVille" class="form-control" value="${p.VILLE || ''}"></div>
                                </div>
                                <div class="form-group"><label class="form-label">Adresse</label><input type="text" id="profilAdresse" class="form-control" value="${p.ADRESSE || ''}"></div>
                                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer</button>
                            </form>
                        </div>
                    </div>
                    <div>
                        <div class="card" style="margin-bottom: 24px;">
                            <div class="card-header"><h3><i class="fas fa-building"></i> Informations commerciales</h3></div>
                            <div class="card-body">
                                <form id="commercialForm">
                                    <div class="form-row">
                                        <div class="form-group"><label class="form-label">ICE</label><input type="text" id="profilIce" class="form-control" value="${p.ICE || ''}"></div>
                                        <div class="form-group"><label class="form-label">RC</label><input type="text" id="profilRc" class="form-control" value="${p.RC || ''}"></div>
                                    </div>
                                    <div class="form-group"><label class="form-label">Délai livraison (jours)</label><input type="number" id="profilDelai" class="form-control" value="${p.DELAI_LIVRAISON || 7}" min="1"></div>
                                    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Enregistrer</button>
                                </form>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-header"><h3><i class="fas fa-lock"></i> Mot de passe</h3></div>
                            <div class="card-body">
                                <form id="passwordForm">
                                    <div class="form-group"><label class="form-label">Mot de passe actuel</label><input type="password" id="currentPassword" class="form-control" required></div>
                                    <div class="form-group"><label class="form-label">Nouveau mot de passe</label><input type="password" id="newPassword" class="form-control" required minlength="6"></div>
                                    <div class="form-group"><label class="form-label">Confirmer</label><input type="password" id="confirmPassword" class="form-control" required></div>
                                    <button type="submit" class="btn btn-secondary"><i class="fas fa-key"></i> Changer</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('profilForm').addEventListener('submit', saveProfile);
            document.getElementById('commercialForm').addEventListener('submit', saveCommercial);
            document.getElementById('passwordForm').addEventListener('submit', changePassword);
        }
    } catch { content.innerHTML = '<div class="alert alert-error">Erreur serveur</div>'; }
}

async function saveProfile(e) {
    e.preventDefault();
    const formData = {
        nom: document.getElementById('profilNom').value,
        prenom: document.getElementById('profilPrenom').value,
        raison_sociale: document.getElementById('profilRaisonSociale').value,
        telephone: document.getElementById('profilTelephone').value,
        adresse: document.getElementById('profilAdresse').value,
        ville: document.getElementById('profilVille').value
    };

    try {
        const response = await fetch(`${API_URL}/api/profil`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(formData) });
        const data = await response.json();
        if (data.success) {
            alert('Profil mis à jour avec succès');
            currentUser = { ...currentUser, ...formData };
            localStorage.setItem('fournisseur', JSON.stringify(currentUser));
            updateUserInfo();
        } else { alert(data.error); }
    } catch { alert('Erreur serveur'); }
}

async function saveCommercial(e) {
    e.preventDefault();
    const formData = {
        ice: document.getElementById('profilIce').value,
        rc: document.getElementById('profilRc').value,
        delai_livraison: parseInt(document.getElementById('profilDelai').value) || 7
    };

    try {
        const response = await fetch(`${API_URL}/api/profil`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(formData) });
        const data = await response.json();
        alert(data.success ? 'Informations mises à jour' : data.error);
    } catch { alert('Erreur serveur'); }
}

async function changePassword(e) {
    e.preventDefault();
    const newPass = document.getElementById('newPassword').value;
    if (newPass !== document.getElementById('confirmPassword').value) {
        alert('Les mots de passe ne correspondent pas');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/profil/password`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ current_password: document.getElementById('currentPassword').value, new_password: newPass })
        });
        const data = await response.json();
        if (data.success) {
            alert('Mot de passe changé avec succès');
            document.getElementById('passwordForm').reset();
        } else { alert(data.error); }
    } catch { alert('Erreur serveur'); }
}

// =====================================================
// UTILITAIRES
// =====================================================

function formatCurrency(value) {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 }).format(value);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try { return new Date(dateStr).toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch { return dateStr; }
}

function truncate(str, len) { return str?.length > len ? str.substring(0, len) + '...' : str || ''; }
function getStockBadgeClass(stock, min) { return stock <= 0 ? 'badge-danger' : stock <= (min || 10) ? 'badge-warning' : 'badge-success'; }
function debounce(fn, wait) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; }
