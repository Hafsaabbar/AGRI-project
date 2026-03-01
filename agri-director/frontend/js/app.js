/* =====================================================
   AGRI Director Dashboard - Main Application JS
   ===================================================== */

// API Base URL
const API_BASE = '/api';

// State
let currentUser = null;
let currentPage = 'dashboard';
let salesChart = null;
let clientsChart = null;
let citiesChart = null;

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuth();

    // Setup navigation
    setupNavigation();

    // Setup event listeners
    setupEventListeners();

    // Load initial data
    loadDashboardData();
});

// ===== Authentication =====
function checkAuth() {
    const user = localStorage.getItem('agri_user');
    if (!user) {
        window.location.href = '/login.html';
        return;
    }

    currentUser = JSON.parse(user);

    // Update UI with user info
    document.getElementById('userName').textContent = `${currentUser.nom} ${currentUser.prenom || ''}`;
    document.getElementById('userAvatar').textContent = getInitials(currentUser.nom, currentUser.prenom);

    hideLoading();
}

function logout() {
    localStorage.removeItem('agri_user');
    localStorage.removeItem('agri_user_id');
    window.location.href = '/login.html';
}

function getInitials(nom, prenom) {
    let initials = '';
    if (nom) initials += nom.charAt(0).toUpperCase();
    if (prenom) initials += prenom.charAt(0).toUpperCase();
    return initials || 'DG';
}

// ===== Navigation =====
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page) {
                navigateTo(page);
            }
        });
    });
}

function navigateTo(page) {
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Update page visibility
    document.querySelectorAll('.section-page').forEach(section => {
        section.classList.remove('active');
    });

    const pageElement = document.getElementById(`page-${page}`);
    if (pageElement) {
        pageElement.classList.add('active');
    }

    // Update header
    updatePageTitle(page);

    // Load page data
    currentPage = page;
    loadPageData(page);
}

function updatePageTitle(page) {
    const titles = {
        dashboard: { title: 'Tableau de Bord', subtitle: "Vue d'ensemble de l'activité" },
        catalogue: { title: 'Catalogue', subtitle: 'Gestion des produits agricoles' },
        agences: { title: 'Agences', subtitle: 'Gestion des agences AGRI' },
        clients: { title: 'Clients', subtitle: 'Supervision de la clientèle' },
        factures: { title: 'Factures', subtitle: 'Facturation mensuelle centralisée' },
        journal: { title: 'Journal des Ventes', subtitle: 'Écritures comptables' },
        rapports: { title: 'Rapports & Statistiques', subtitle: 'Analyses et indicateurs' }
    };

    const info = titles[page] || { title: 'AGRI', subtitle: '' };
    document.getElementById('pageTitle').textContent = info.title;
    document.getElementById('pageSubtitle').textContent = info.subtitle;
}

function loadPageData(page) {
    switch (page) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'catalogue':
            loadCatalogueData();
            break;
        case 'agences':
            loadAgencesData();
            break;
        case 'clients':
            loadClientsData();
            break;
        case 'factures':
            loadFacturesData();
            break;
        case 'journal':
            loadJournalData();
            break;
        case 'rapports':
            loadRapportsData();
            break;
    }
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Search in catalogue
    document.getElementById('searchProduct')?.addEventListener('input', debounce(() => {
        loadCatalogueData();
    }, 300));

    // Filter category
    document.getElementById('filterCategory')?.addEventListener('change', () => {
        loadCatalogueData();
    });

    // Search clients
    document.getElementById('searchClient')?.addEventListener('input', debounce(() => {
        loadClientsData();
    }, 300));

    // Filter client type
    document.getElementById('filterClientType')?.addEventListener('change', () => {
        loadClientsData();
    });

    // Filter client status
    document.getElementById('filterClientStatus')?.addEventListener('change', () => {
        loadClientsData();
    });

    // Filter factures
    document.getElementById('filterFactureMonth')?.addEventListener('change', () => {
        loadFacturesData();
    });
    document.getElementById('filterFactureYear')?.addEventListener('change', () => {
        loadFacturesData();
    });
    document.getElementById('filterFactureStatus')?.addEventListener('change', () => {
        loadFacturesData();
    });
}

// ===== Dashboard =====
async function loadDashboardData() {
    try {
        showLoading();

        // Load stats
        const statsResponse = await fetch(`${API_BASE}/dashboard/stats`);
        const statsData = await statsResponse.json();

        if (statsData.success) {
            const data = statsData.data;

            // Update stats cards
            document.getElementById('statClients').textContent = formatNumber(data.clients.TOTAL || 0);
            document.getElementById('statProduits').textContent = formatNumber(data.produits || 0);
            document.getElementById('statCommandes').textContent = formatNumber(data.commandes.TOTAL || 0);
            document.getElementById('statCA').textContent = formatMoney(data.commandes.CHIFFRE_AFFAIRES || 0);
            document.getElementById('statAgences').textContent = data.agences || 0;

            // Update badges
            document.getElementById('catalogueBadge').textContent = formatNumber(data.produits || 0);
            document.getElementById('facturesBadge').textContent = data.facturesImpayees.TOTAL || 0;
        }

        // Load sales chart
        const chartResponse = await fetch(`${API_BASE}/dashboard/sales-chart`);
        const chartData = await chartResponse.json();

        if (chartData.success) {
            renderSalesChart(chartData.data);
        }

        // Load top products
        const topResponse = await fetch(`${API_BASE}/dashboard/top-products`);
        const topData = await topResponse.json();

        if (topData.success) {
            renderTopProducts(topData.data);
        }

        // Load recent orders
        const ordersResponse = await fetch(`${API_BASE}/dashboard/recent-orders`);
        const ordersData = await ordersResponse.json();

        if (ordersData.success) {
            renderRecentOrders(ordersData.data);
        }

    } catch (err) {
        console.error('Error loading dashboard:', err);
        showToast('Erreur lors du chargement du tableau de bord', 'error');
    } finally {
        hideLoading();
    }
}

function renderSalesChart(data) {
    const ctx = document.getElementById('salesChart')?.getContext('2d');
    if (!ctx) return;

    if (salesChart) {
        salesChart.destroy();
    }

    const labels = data.map(item => formatMonth(item.MOIS));
    const values = data.map(item => item.TOTAL_VENTES || 0);
    const orders = data.map(item => item.NB_COMMANDES || 0);

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Chiffre d\'affaires (MAD)',
                    data: values,
                    borderColor: '#2d8a6b',
                    backgroundColor: 'rgba(45, 138, 107, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Nombre de commandes',
                    data: orders,
                    borderColor: '#f59e0b',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        callback: value => formatMoney(value)
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

function renderTopProducts(data) {
    const container = document.getElementById('topProductsList');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;">Aucune donnée</p>';
        return;
    }

    container.innerHTML = data.map((product, index) => `
        <div style="display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid var(--border-color);">
            <div style="width:32px; height:32px; background:var(--primary); color:white; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:600;">
                ${index + 1}
            </div>
            <div style="flex:1;">
                <div style="font-weight:500;">${product.PRODUCT_NAME}</div>
                <div style="font-size:0.8rem; color:var(--text-muted);">${product.CATEGORY}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-weight:600; color:var(--primary);">${formatNumber(product.TOTAL_VENDU)} unités</div>
                <div style="font-size:0.8rem; color:var(--text-muted);">${formatMoney(product.TOTAL_CA)}</div>
            </div>
        </div>
    `).join('');
}

function renderRecentOrders(data) {
    const tbody = document.getElementById('recentOrdersTable');
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Aucune commande récente</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(order => `
        <tr>
            <td><strong>${order.ORDER_NUMBER}</strong></td>
            <td>${order.NOM_CLIENT} ${order.PRENOM || ''}</td>
            <td><span class="badge badge-${order.TYPE_CLIENT === 'PROFESSIONNEL' ? 'primary' : 'info'}">${order.TYPE_CLIENT}</span></td>
            <td><strong>${formatMoney(order.TOTAL_TTC)}</strong></td>
            <td>${getStatusBadge(order.STATUS)}</td>
            <td>${formatDate(order.CREATED_AT)}</td>
        </tr>
    `).join('');
}

// ===== Catalogue =====
let cataloguePage = 1;

async function loadCatalogueData(page = 1) {
    try {
        const search = document.getElementById('searchProduct')?.value || '';
        const category = document.getElementById('filterCategory')?.value || '';

        const response = await fetch(`${API_BASE}/catalogue?page=${page}&limit=20&search=${encodeURIComponent(search)}&category=${category}`);
        const data = await response.json();

        if (data.success) {
            renderCatalogueTable(data.data);
            renderPagination('cataloguePagination', data.pagination, loadCatalogueData);
            cataloguePage = page;
        }

        // Load categories for filter
        const catResponse = await fetch(`${API_BASE}/catalogue/categories`);
        const catData = await catResponse.json();

        if (catData.success) {
            const select = document.getElementById('filterCategory');
            if (select && select.options.length <= 1) {
                catData.data.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.CATEGORY;
                    option.textContent = `${cat.CATEGORY} (${cat.COUNT})`;
                    select.appendChild(option);
                });
            }
        }

    } catch (err) {
        console.error('Error loading catalogue:', err);
        showToast('Erreur lors du chargement du catalogue', 'error');
    }
}

function renderCatalogueTable(data) {
    const tbody = document.getElementById('catalogueTable');
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Aucun produit trouvé</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(product => `
        <tr>
            <td><code>${product.PRODUCT_CODE || '-'}</code></td>
            <td><strong>${product.PRODUCT_NAME}</strong></td>
            <td><span class="badge badge-info">${product.CATEGORY}</span></td>
            <td><strong>${formatMoney(product.PRIX_UNITAIRE)}</strong>/${product.UNIT || 'KG'}</td>
            <td>
                <span style="color:${product.STOCK_DISPONIBLE <= product.STOCK_MINIMUM ? 'var(--danger)' : 'var(--success)'}">
                    ${product.STOCK_DISPONIBLE}
                </span>
                ${product.STOCK_DISPONIBLE <= product.STOCK_MINIMUM ? '<i class="fas fa-exclamation-triangle" style="color:var(--warning);margin-left:4px;" title="Stock faible"></i>' : ''}
            </td>
            <td>${product.IS_ACTIVE === 'Y' ? '<span class="badge badge-success">Actif</span>' : '<span class="badge badge-danger">Inactif</span>'}</td>
            <td>
                <button class="btn-icon" onclick="editProduct(${product.PRODUCT_ID})" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="deleteProduct(${product.PRODUCT_ID})" title="Supprimer" style="margin-left:4px;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function openProductModal(product = null) {
    document.getElementById('productModalTitle').textContent = product ? 'Modifier le Produit' : 'Nouveau Produit';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = product?.PRODUCT_ID || '';

    if (product) {
        document.getElementById('productCode').value = product.PRODUCT_CODE || '';
        document.getElementById('productName').value = product.PRODUCT_NAME || '';
        document.getElementById('productDescription').value = product.DESCRIPTION || '';
        document.getElementById('productCategory').value = product.CATEGORY || '';
        document.getElementById('productUnit').value = product.UNIT || 'KG';
        document.getElementById('productPrice').value = product.PRIX_UNITAIRE || 0;
        document.getElementById('productStock').value = product.STOCK_DISPONIBLE || 0;
        document.getElementById('productMinStock').value = product.STOCK_MINIMUM || 10;
    }

    openModal('productModal');
}

async function editProduct(id) {
    try {
        const response = await fetch(`${API_BASE}/catalogue/${id}`);
        const data = await response.json();

        if (data.success) {
            openProductModal(data.data);
        }
    } catch (err) {
        showToast('Erreur lors du chargement du produit', 'error');
    }
}

async function saveProduct() {
    const id = document.getElementById('productId').value;
    const product = {
        product_code: document.getElementById('productCode').value || null,
        product_name: document.getElementById('productName').value,
        description: document.getElementById('productDescription').value,
        category: document.getElementById('productCategory').value,
        unit: document.getElementById('productUnit').value,
        prix_unitaire: parseFloat(document.getElementById('productPrice').value),
        stock_disponible: parseInt(document.getElementById('productStock').value) || 0,
        stock_minimum: parseInt(document.getElementById('productMinStock').value) || 10
    };

    try {
        const url = id ? `${API_BASE}/catalogue/${id}` : `${API_BASE}/catalogue`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });

        const data = await response.json();

        if (data.success) {
            showToast(id ? 'Produit modifié avec succès' : 'Produit ajouté avec succès', 'success');
            closeModal('productModal');
            loadCatalogueData(cataloguePage);
        } else {
            showToast(data.error || 'Erreur lors de l\'enregistrement', 'error');
        }
    } catch (err) {
        showToast('Erreur de connexion', 'error');
    }
}

async function deleteProduct(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

    try {
        const response = await fetch(`${API_BASE}/catalogue/${id}`, { method: 'DELETE' });
        const data = await response.json();

        if (data.success) {
            showToast('Produit supprimé', 'success');
            loadCatalogueData(cataloguePage);
        } else {
            showToast(data.error || 'Erreur lors de la suppression', 'error');
        }
    } catch (err) {
        showToast('Erreur de connexion', 'error');
    }
}

function openPriceUpdateModal() {
    document.getElementById('catalogueVersion').value = 'V' + new Date().toISOString().slice(0, 10).replace(/-/g, '');
    document.getElementById('pricePercentage').value = '';
    document.getElementById('priceUpdateNotes').value = '';
    openModal('priceUpdateModal');
}

async function applyPriceUpdate() {
    const percentage = parseFloat(document.getElementById('pricePercentage').value);
    const version = document.getElementById('catalogueVersion').value;
    const notes = document.getElementById('priceUpdateNotes').value;

    if (isNaN(percentage)) {
        showToast('Veuillez entrer un pourcentage valide', 'error');
        return;
    }

    if (!confirm(`Voulez-vous vraiment appliquer une variation de ${percentage}% sur tous les prix ?`)) return;

    showToast('Cette fonctionnalité sera bientôt disponible', 'warning');
    closeModal('priceUpdateModal');
}

// ===== Agences =====
async function loadAgencesData() {
    try {
        const response = await fetch(`${API_BASE}/agences`);
        const data = await response.json();

        if (data.success) {
            renderAgencesTable(data.data);
            renderAgencesCards(data.data);
        }
    } catch (err) {
        console.error('Error loading agences:', err);
        showToast('Erreur lors du chargement des agences', 'error');
    }
}

function renderAgencesCards(data) {
    const container = document.getElementById('agencesCards');
    if (!container) return;

    container.innerHTML = data.filter(a => a.STATUT === 'ACTIF').map(agence => `
        <div class="stat-card">
            <div class="stat-icon green">
                <i class="fas fa-building"></i>
            </div>
            <div class="stat-info">
                <h3 style="font-size:1.2rem;">${agence.NOM}</h3>
                <p>${agence.VILLE || 'Casablanca'}</p>
                <div class="stat-change positive">
                    <i class="fas fa-phone"></i>
                    <span>${agence.TELEPHONE || 'N/A'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderAgencesTable(data) {
    const tbody = document.getElementById('agencesTable');
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Aucune agence</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(agence => `
        <tr>
            <td><strong>${agence.NOM}</strong></td>
            <td>${agence.VILLE || '-'}</td>
            <td>${agence.REGION || '-'}</td>
            <td>${agence.TELEPHONE || '-'}</td>
            <td>${agence.RESPONSABLE_NOM ? `${agence.RESPONSABLE_NOM} ${agence.RESPONSABLE_PRENOM || ''}` : '-'}</td>
            <td>${agence.STATUT === 'ACTIF' ? '<span class="badge badge-success">Actif</span>' : '<span class="badge badge-danger">Inactif</span>'}</td>
            <td>
                <button class="btn-icon" onclick="editAgence(${agence.ID})" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="deleteAgence(${agence.ID})" title="Désactiver" style="margin-left:4px;">
                    <i class="fas fa-power-off"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function openAgenceModal(agence = null) {
    document.getElementById('agenceModalTitle').textContent = agence ? 'Modifier l\'Agence' : 'Nouvelle Agence';
    document.getElementById('agenceForm').reset();
    document.getElementById('agenceId').value = agence?.ID || '';

    if (agence) {
        document.getElementById('agenceNom').value = agence.NOM || '';
        document.getElementById('agenceVille').value = agence.VILLE || 'Casablanca';
        document.getElementById('agenceRegion').value = agence.REGION || '';
        document.getElementById('agenceAdresse').value = agence.ADRESSE || '';
        document.getElementById('agenceTelephone').value = agence.TELEPHONE || '';
        document.getElementById('agenceEmail').value = agence.EMAIL || '';
        document.getElementById('agenceStatut').value = agence.STATUT || 'ACTIF';
    }

    openModal('agenceModal');
}

async function editAgence(id) {
    try {
        const response = await fetch(`${API_BASE}/agences/${id}`);
        const data = await response.json();

        if (data.success) {
            openAgenceModal(data.data);
        }
    } catch (err) {
        showToast('Erreur lors du chargement de l\'agence', 'error');
    }
}

async function saveAgence() {
    const id = document.getElementById('agenceId').value;
    const agence = {
        nom: document.getElementById('agenceNom').value,
        ville: document.getElementById('agenceVille').value,
        region: document.getElementById('agenceRegion').value,
        adresse: document.getElementById('agenceAdresse').value,
        telephone: document.getElementById('agenceTelephone').value,
        email: document.getElementById('agenceEmail').value,
        statut: document.getElementById('agenceStatut').value
    };

    try {
        const url = id ? `${API_BASE}/agences/${id}` : `${API_BASE}/agences`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agence)
        });

        const data = await response.json();

        if (data.success) {
            showToast(id ? 'Agence modifiée avec succès' : 'Agence ajoutée avec succès', 'success');
            closeModal('agenceModal');
            loadAgencesData();
        } else {
            showToast(data.error || 'Erreur lors de l\'enregistrement', 'error');
        }
    } catch (err) {
        showToast('Erreur de connexion', 'error');
    }
}

async function deleteAgence(id) {
    if (!confirm('Êtes-vous sûr de vouloir désactiver cette agence ?')) return;

    try {
        const response = await fetch(`${API_BASE}/agences/${id}`, { method: 'DELETE' });
        const data = await response.json();

        if (data.success) {
            showToast('Agence désactivée', 'success');
            loadAgencesData();
        } else {
            showToast(data.error || 'Erreur', 'error');
        }
    } catch (err) {
        showToast('Erreur de connexion', 'error');
    }
}

// ===== Clients =====
let clientsPage = 1;

async function loadClientsData(page = 1) {
    try {
        const search = document.getElementById('searchClient')?.value || '';
        const type = document.getElementById('filterClientType')?.value || '';
        const status = document.getElementById('filterClientStatus')?.value || '';

        // Load stats
        const statsResponse = await fetch(`${API_BASE}/clients/stats`);
        const statsData = await statsResponse.json();

        if (statsData.success) {
            renderClientsStats(statsData.data);
        }

        // Load clients list
        const response = await fetch(`${API_BASE}/clients?page=${page}&limit=20&search=${encodeURIComponent(search)}&type=${type}&status=${status}`);
        const data = await response.json();

        if (data.success) {
            renderClientsTable(data.data);
            renderPagination('clientsPagination', data.pagination, loadClientsData);
            clientsPage = page;
        }
    } catch (err) {
        console.error('Error loading clients:', err);
        showToast('Erreur lors du chargement des clients', 'error');
    }
}

function renderClientsStats(data) {
    const container = document.getElementById('clientsStatsGrid');
    if (!container) return;

    const stats = data.stats;
    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-users"></i></div>
            <div class="stat-info">
                <h3>${formatNumber(stats.TOTAL || 0)}</h3>
                <p>Clients totaux</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon blue"><i class="fas fa-building"></i></div>
            <div class="stat-info">
                <h3>${formatNumber(stats.PROFESSIONNELS || 0)}</h3>
                <p>Détaillants (Professionnels)</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon orange"><i class="fas fa-user"></i></div>
            <div class="stat-info">
                <h3>${formatNumber(stats.PARTICULIERS || 0)}</h3>
                <p>Particuliers</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon purple"><i class="fas fa-percent"></i></div>
            <div class="stat-info">
                <h3>${formatNumber(stats.ELIGIBLES_REMISE || 0)}</h3>
                <p>Éligibles à la remise</p>
            </div>
        </div>
    `;
}

function renderClientsTable(data) {
    const tbody = document.getElementById('clientsTable');
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Aucun client trouvé</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(client => `
        <tr>
            <td>
                <strong>${client.NOM_CLIENT}</strong> ${client.PRENOM || ''}
                ${client.ENTREPRISE ? `<br><small style="color:var(--text-muted);">${client.ENTREPRISE}</small>` : ''}
            </td>
            <td>${client.EMAIL}</td>
            <td><span class="badge badge-${getTypeBadgeClass(client.TYPE_CLIENT)}">${client.TYPE_CLIENT}</span></td>
            <td>${client.VILLE || '-'}</td>
            <td>${client.IS_ELIGIBLE === 'Y' ? '<span class="badge badge-success">Oui</span>' : '<span class="badge badge-secondary">Non</span>'}</td>
            <td>${getStatusBadge(client.STATUS)}</td>
            <td>
                <button class="btn-icon" onclick="viewClient(${client.ID})" title="Voir détails">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function viewClient(id) {
    try {
        const response = await fetch(`${API_BASE}/clients/${id}`);
        const data = await response.json();

        if (data.success) {
            const client = data.data.client;
            const commandes = data.data.commandes;
            const factures = data.data.factures;

            document.getElementById('clientModalContent').innerHTML = `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
                    <div>
                        <h4 style="margin-bottom:16px;"><i class="fas fa-user"></i> Informations</h4>
                        <p><strong>Nom:</strong> ${client.NOM_CLIENT} ${client.PRENOM || ''}</p>
                        <p><strong>Email:</strong> ${client.EMAIL}</p>
                        <p><strong>Téléphone:</strong> ${client.TEL || '-'}</p>
                        <p><strong>Type:</strong> <span class="badge badge-${getTypeBadgeClass(client.TYPE_CLIENT)}">${client.TYPE_CLIENT}</span></p>
                        <p><strong>Statut:</strong> ${getStatusBadge(client.STATUS)}</p>
                        ${client.DATE_NAISSANCE ? `<p><strong>Date de naissance:</strong> ${formatDate(client.DATE_NAISSANCE)}</p>` : ''}
                    </div>
                    <div>
                        <h4 style="margin-bottom:16px;"><i class="fas fa-map-marker-alt"></i> Adresse</h4>
                        <p>${client.ADRESSE || '-'}</p>
                        <p>${client.VILLE || ''} ${client.CODE_POSTAL || ''}</p>
                        <p><strong>Remise:</strong> ${client.IS_ELIGIBLE === 'Y' ? '<span class="badge badge-success">Éligible</span>' : '<span class="badge badge-secondary">Non éligible</span>'}</p>
                    </div>
                </div>
                
                <h4 style="margin:20px 0 16px;"><i class="fas fa-shopping-cart"></i> Dernières commandes</h4>
                ${commandes && commandes.length > 0 ? `
                    <table class="data-table" style="font-size:0.85rem;">
                        <thead>
                            <tr><th>N° Commande</th><th>Montant</th><th>Statut</th><th>Date</th></tr>
                        </thead>
                        <tbody>
                            ${commandes.map(c => `<tr>
                                <td>${c.ORDER_NUMBER}</td>
                                <td>${formatMoney(c.TOTAL_TTC)}</td>
                                <td>${getStatusBadge(c.STATUS)}</td>
                                <td>${formatDate(c.CREATED_AT)}</td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                ` : '<p style="color:var(--text-muted);">Aucune commande</p>'}
            `;

            openModal('clientModal');
        }
    } catch (err) {
        showToast('Erreur lors du chargement du client', 'error');
    }
}

function exportClients() {
    showToast('Export en cours...', 'info');
    // Implementation for export
}

// ===== Factures =====
let facturesPage = 1;
let currentFactureId = null;

async function loadFacturesData(page = 1) {
    try {
        const month = document.getElementById('filterFactureMonth')?.value || '';
        const year = document.getElementById('filterFactureYear')?.value || '';
        const status = document.getElementById('filterFactureStatus')?.value || '';

        // Load stats
        const statsResponse = await fetch(`${API_BASE}/factures/stats`);
        const statsData = await statsResponse.json();

        if (statsData.success) {
            renderFacturesStats(statsData.data);
        }

        // Load factures list
        const response = await fetch(`${API_BASE}/factures?page=${page}&limit=20&month=${month}&year=${year}&status=${status}`);
        const data = await response.json();

        if (data.success) {
            renderFacturesTable(data.data);
            renderPagination('facturesPagination', data.pagination, loadFacturesData);
            facturesPage = page;
        }
    } catch (err) {
        console.error('Error loading factures:', err);
        showToast('Erreur lors du chargement des factures', 'error');
    }
}

function renderFacturesStats(data) {
    const container = document.getElementById('facturesStatsGrid');
    if (!container) return;

    const global = data.global;
    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-file-invoice"></i></div>
            <div class="stat-info">
                <h3>${formatNumber(global.TOTAL || 0)}</h3>
                <p>Factures totales</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon blue"><i class="fas fa-check-circle"></i></div>
            <div class="stat-info">
                <h3>${formatMoney(global.TOTAL_ENCAISSE || 0)}</h3>
                <p>Montant encaissé</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon orange"><i class="fas fa-clock"></i></div>
            <div class="stat-info">
                <h3>${formatNumber(global.EN_ATTENTE || 0)}</h3>
                <p>En attente de paiement</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon purple"><i class="fas fa-exclamation-circle"></i></div>
            <div class="stat-info">
                <h3>${formatMoney(global.TOTAL_IMPAYE || 0)}</h3>
                <p>Montant impayé</p>
            </div>
        </div>
    `;
}

function renderFacturesTable(data) {
    const tbody = document.getElementById('facturesTable');
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">Aucune facture trouvée</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(facture => `
        <tr>
            <td><strong>${facture.INVOICE_NUMBER}</strong></td>
            <td>${facture.NOM_CLIENT} ${facture.PRENOM || ''}</td>
            <td>${formatDate(facture.CREATED_AT)}</td>
            <td>${formatMoney(facture.TOTAL_HT)}</td>
            <td>${formatMoney(facture.TOTAL_TVA)}</td>
            <td><strong>${formatMoney(facture.TOTAL_TTC)}</strong></td>
            <td>${getStatusBadge(facture.STATUS)}</td>
            <td>
                <button class="btn-icon" onclick="viewFacture(${facture.ID})" title="Voir détails">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function viewFacture(id) {
    try {
        const response = await fetch(`${API_BASE}/factures/${id}`);
        const data = await response.json();

        if (data.success) {
            const facture = data.data.facture;
            currentFactureId = id;

            document.getElementById('factureModalContent').innerHTML = `
                <div style="background:var(--bg-main); padding:20px; border-radius:12px; margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h2 style="color:var(--primary);">${facture.INVOICE_NUMBER}</h2>
                            <p style="color:var(--text-muted);">${formatDate(facture.CREATED_AT)}</p>
                        </div>
                        <div style="text-align:right;">
                            ${getStatusBadge(facture.STATUS)}
                            <h3 style="margin-top:8px; color:var(--primary);">${formatMoney(facture.TOTAL_TTC)}</h3>
                        </div>
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">
                    <div>
                        <h4><i class="fas fa-user"></i> Client</h4>
                        <p><strong>${facture.NOM_CLIENT}</strong> ${facture.PRENOM || ''}</p>
                        <p>${facture.ENTREPRISE || ''}</p>
                        <p>${facture.EMAIL}</p>
                        <p>${facture.TEL || ''}</p>
                    </div>
                    <div>
                        <h4><i class="fas fa-calculator"></i> Montants</h4>
                        <p>Total HT: <strong>${formatMoney(facture.TOTAL_HT)}</strong></p>
                        <p>TVA (20%): <strong>${formatMoney(facture.TOTAL_TVA)}</strong></p>
                        <p>Total TTC: <strong style="color:var(--primary); font-size:1.2rem;">${formatMoney(facture.TOTAL_TTC)}</strong></p>
                    </div>
                </div>
                
                <div>
                    <p><strong>Date d'émission:</strong> ${formatDate(facture.CREATED_AT)}</p>
                    <p><strong>Date d'échéance:</strong> ${formatDate(facture.DUE_DATE)}</p>
                    ${facture.PAID_DATE ? `<p><strong>Date de paiement:</strong> ${formatDate(facture.PAID_DATE)}</p>` : ''}
                </div>
            `;

            // Show/hide pay button
            document.getElementById('btnMarkPaid').style.display = facture.STATUS === 'PENDING' || facture.STATUS === 'OVERDUE' ? 'inline-flex' : 'none';

            openModal('factureModal');
        }
    } catch (err) {
        showToast('Erreur lors du chargement de la facture', 'error');
    }
}

async function markFacturePaid() {
    if (!currentFactureId) return;
    if (!confirm('Marquer cette facture comme payée ?')) return;

    try {
        const response = await fetch(`${API_BASE}/factures/${currentFactureId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PAID', payment_method: 'VIREMENT' })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Facture marquée comme payée', 'success');
            closeModal('factureModal');
            loadFacturesData(facturesPage);
        } else {
            showToast(data.error || 'Erreur', 'error');
        }
    } catch (err) {
        showToast('Erreur de connexion', 'error');
    }
}

async function generateMonthlyInvoices() {
    if (!confirm('Générer les factures pour le mois en cours ?')) return;

    try {
        showLoading();
        const response = await fetch(`${API_BASE}/factures/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            loadFacturesData();
        } else {
            showToast(data.error || 'Erreur', 'error');
        }
    } catch (err) {
        showToast('Erreur de connexion', 'error');
    } finally {
        hideLoading();
    }
}

// ===== Journal =====
async function loadJournalData(page = 1) {
    try {
        // Load stats
        const statsResponse = await fetch(`${API_BASE}/journal/stats`);
        const statsData = await statsResponse.json();

        if (statsData.success) {
            renderJournalStats(statsData.data);
        }

        // Load journal entries
        const startDate = document.getElementById('journalStartDate')?.value || '';
        const endDate = document.getElementById('journalEndDate')?.value || '';

        const response = await fetch(`${API_BASE}/journal?page=${page}&startDate=${startDate}&endDate=${endDate}&limit=50`);
        const data = await response.json();

        if (data.success) {
            renderJournalTable(data.data);

            // Update totals safely
            const totals = data.totals || {};
            document.getElementById('journalTotalHT').textContent = formatMoney(totals.TOTAL_HT || 0);
            document.getElementById('journalTotalTVA').textContent = formatMoney(totals.TOTAL_TVA || 0);
            document.getElementById('journalTotalTTC').textContent = formatMoney(totals.TOTAL_TTC || 0);

            // Render pagination
            renderPagination('journalPagination', data.pagination, loadJournalData);
        }
    } catch (err) {
        console.error('Error loading journal:', err);
        showToast('Erreur lors du chargement du journal', 'error');
    }
}

function renderJournalStats(data) {
    const container = document.getElementById('journalStatsGrid');
    if (!container) return;

    if (!data) return;

    const global = data.global || {};
    const ceMois = data.ceMois || {};

    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-book"></i></div>
            <div class="stat-info">
                <h3>${formatNumber(global.NB_ECRITURES || 0)}</h3>
                <p>Écritures totales</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon blue"><i class="fas fa-coins"></i></div>
            <div class="stat-info">
                <h3>${formatMoney(global.TOTAL_TTC || 0)}</h3>
                <p>Total enregistré</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon orange"><i class="fas fa-calendar-alt"></i></div>
            <div class="stat-info">
                <h3>${formatNumber(ceMois.NB_ECRITURES || 0)}</h3>
                <p>Ce mois</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon purple"><i class="fas fa-chart-line"></i></div>
            <div class="stat-info">
                <h3>${formatMoney(ceMois.TOTAL_TTC || 0)}</h3>
                <p>CA ce mois</p>
            </div>
        </div>
    `;
}

function renderJournalTable(data) {
    const tbody = document.getElementById('journalTable');
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Aucune écriture</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(entry => `
        <tr>
            <td><code>${entry.NUM_PIECE}</code></td>
            <td>${formatDate(entry.DATE_ECRITURE)}</td>
            <td>${entry.LIBELLE}</td>
            <td><code>${entry.COMPTE_DEBIT}</code></td>
            <td><code>${entry.COMPTE_CREDIT}</code></td>
            <td><strong>${formatMoney(entry.MONTANT_TTC)}</strong></td>
        </tr>
    `).join('');
}

function filterJournal() {
    loadJournalData();
}

function exportJournal() {
    const startDate = document.getElementById('journalStartDate')?.value || '';
    const endDate = document.getElementById('journalEndDate')?.value || '';

    window.open(`${API_BASE}/journal/export?startDate=${startDate}&endDate=${endDate}&format=csv`, '_blank');
}

// ===== Rapports =====
async function loadRapportsData() {
    try {
        // Clients chart
        const statsResponse = await fetch(`${API_BASE}/clients/stats`);
        const statsData = await statsResponse.json();

        if (statsData.success) {
            renderClientsChart(statsData.data.stats);
            renderCitiesChart(statsData.data.parVille);
        }

        // Birthdays
        const birthdaysResponse = await fetch(`${API_BASE}/clients/birthdays/upcoming`);
        const birthdaysData = await birthdaysResponse.json();

        if (birthdaysData.success) {
            renderBirthdays(birthdaysData.data);
        }
    } catch (err) {
        console.error('Error loading rapports:', err);
    }
}

function renderClientsChart(stats) {
    const ctx = document.getElementById('clientsChart')?.getContext('2d');
    if (!ctx) return;

    if (clientsChart) {
        clientsChart.destroy();
    }

    clientsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Particuliers', 'Professionnels', 'Agriculteurs'],
            datasets: [{
                data: [stats.PARTICULIERS || 0, stats.PROFESSIONNELS || 0, stats.AGRICULTEURS || 0],
                backgroundColor: ['#3b82f6', '#2d8a6b', '#f59e0b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function renderCitiesChart(data) {
    const ctx = document.getElementById('citiesChart')?.getContext('2d');
    if (!ctx || !data) return;

    if (citiesChart) {
        citiesChart.destroy();
    }

    citiesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(v => v.VILLE || 'Autre'),
            datasets: [{
                label: 'Nombre de clients',
                data: data.map(v => v.COUNT),
                backgroundColor: '#2d8a6b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function renderBirthdays(data) {
    const container = document.getElementById('birthdaysList');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); text-align:center;">Aucun anniversaire dans les 30 prochains jours</p>';
        return;
    }

    container.innerHTML = data.map(client => `
        <div style="display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid var(--border-color);">
            <div style="width:40px; height:40px; background:var(--primary); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                <i class="fas fa-birthday-cake"></i>
            </div>
            <div style="flex:1;">
                <strong>${client.NOM_CLIENT} ${client.PRENOM || ''}</strong>
                <div style="font-size:0.85rem; color:var(--text-muted);">${client.EMAIL}</div>
            </div>
            <div style="text-align:right;">
                <span class="badge badge-primary">${formatBirthday(client.DATE_NAISSANCE)}</span>
            </div>
        </div>
    `).join('');
}

// ===== Utility Functions =====
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i>
        </div>
        <div class="toast-content">
            <h5>${type === 'success' ? 'Succès' : type === 'error' ? 'Erreur' : 'Information'}</h5>
            <p>${message}</p>
        </div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

function formatNumber(num) {
    return new Intl.NumberFormat('fr-MA').format(num);
}

function formatMoney(amount) {
    return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatMonth(monthStr) {
    if (!monthStr) return '-';
    const [year, month] = monthStr.split('-');
    return getMonthName(parseInt(month)) + ' ' + year;
}

function formatBirthday(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-MA', { day: '2-digit', month: 'long' }).format(date);
}

function getMonthName(month) {
    const months = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return months[month] || '';
}

function getStatusBadge(status) {
    const badges = {
        'PENDING': '<span class="badge badge-warning">En attente</span>',
        'APPROVED': '<span class="badge badge-success">Approuvé</span>',
        'REJECTED': '<span class="badge badge-danger">Rejeté</span>',
        'PAID': '<span class="badge badge-success">Payée</span>',
        'OVERDUE': '<span class="badge badge-danger">En retard</span>',
        'DELIVERED': '<span class="badge badge-success">Livré</span>',
        'IN_DELIVERY': '<span class="badge badge-info">En cours</span>',
        'CANCELLED': '<span class="badge badge-danger">Annulé</span>',
        'SUSPENDED': '<span class="badge badge-danger">Suspendu</span>'
    };
    return badges[status] || `<span class="badge">${status}</span>`;
}

function getTypeBadgeClass(type) {
    const classes = {
        'PROFESSIONNEL': 'primary',
        'PARTICULIER': 'info',
        'AGRICULTEUR': 'warning'
    };
    return classes[type] || 'secondary';
}

function renderPagination(containerId, pagination, loadFunction) {
    const container = document.getElementById(containerId);
    if (!container || !pagination) return;

    const { page, pages } = pagination;
    if (pages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    html += `<button class="pagination-btn" ${page === 1 ? 'disabled' : ''} onclick="${loadFunction.name}(${page - 1})"><i class="fas fa-chevron-left"></i></button>`;

    for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) {
            html += `<button class="pagination-btn ${i === page ? 'active' : ''}" onclick="${loadFunction.name}(${i})">${i}</button>`;
        } else if (i === page - 2 || i === page + 2) {
            html += '<span style="padding:0 8px;">...</span>';
        }
    }

    html += `<button class="pagination-btn" ${page === pages ? 'disabled' : ''} onclick="${loadFunction.name}(${page + 1})"><i class="fas fa-chevron-right"></i></button>`;

    container.innerHTML = html;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function refreshData() {
    loadPageData(currentPage);
    showToast('Données actualisées', 'success');
}
