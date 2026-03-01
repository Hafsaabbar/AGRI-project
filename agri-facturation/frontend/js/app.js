// AGRI Facturation - Application JavaScript
const API_BASE = '';
let currentPage = 'dashboard';
let currentUser = null;

// ===== Initialisation =====
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
    loadPage('dashboard');
});

function checkAuth() {
    const userData = localStorage.getItem('agri_facturation_user');
    if (!userData) {
        window.location.href = '/login.html';
        return;
    }
    currentUser = JSON.parse(userData);
    document.getElementById('userName').textContent = `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() || 'Agent';
    document.getElementById('userAvatar').textContent = (currentUser.prenom || 'A')[0].toUpperCase();
}

function logout() {
    localStorage.removeItem('agri_facturation_user');
    window.location.href = '/login.html';
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (page) {
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                loadPage(page);
            }
        });
    });
}

function loadPage(page) {
    currentPage = page;
    const content = document.getElementById('contentArea');
    const titles = {
        dashboard: ['Tableau de bord', 'Vue d\'ensemble du service facturation'],
        clients: ['Fiches clients', 'Gestion et verification des informations clients'],
        commandes: ['Bons de commande', 'Commandes recues des agences'],
        livraisons: ['Bons de livraison', 'Verification et controle des BL recus'],
        factures: ['Facturation', 'Gestion des factures clients'],
        catalogue: ['Catalogue produits', 'Reference des prix unitaires']
    };
    document.getElementById('pageTitle').textContent = titles[page]?.[0] || page;
    document.getElementById('pageSubtitle').textContent = titles[page]?.[1] || '';

    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    switch (page) {
        case 'dashboard': loadDashboard(); break;
        case 'clients': loadClients(); break;
        case 'commandes': loadCommandes(); break;
        case 'livraisons': loadLivraisons(); break;
        case 'factures': loadFactures(); break;
        case 'catalogue': loadCatalogue(); break;
        default: content.innerHTML = '<div class="empty-state"><i class="fas fa-construction"></i><h3>Page en construction</h3></div>';
    }
}

function refreshData() {
    loadPage(currentPage);
}

// ===== API Helper =====
async function api(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id, ...options.headers }
        });
        return await response.json();
    } catch (err) {
        console.error('API Error:', err);
        return { success: false, error: err.message };
    }
}

// ===== Formatters =====
function formatMoney(amount) {
    return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount || 0);
}

function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
}

function getStatusBadge(status) {
    const badges = {
        PENDING: '<span class="badge badge-warning">En attente</span>',
        PAID: '<span class="badge badge-success">Payee</span>',
        OVERDUE: '<span class="badge badge-danger">En retard</span>',
        CANCELLED: '<span class="badge badge-secondary">Annulee</span>'
    };
    return badges[status] || `<span class="badge badge-secondary">${status}</span>`;
}

function getMonthName(month) {
    const months = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
    return months[(month || 1) - 1];
}

// ===== Dashboard =====
async function loadDashboard() {
    const result = await api('/api/dashboard/stats');
    const content = document.getElementById('contentArea');

    if (!result.success) {
        content.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> ${result.error}</div>`;
        return;
    }

    const d = result.data;
    content.innerHTML = `
        <!-- Stats Grid -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon green">
                    <i class="fas fa-coins"></i>
                </div>
                <div class="stat-info">
                    <h3>${formatMoney(d.moisEnCours?.CA_TTC || 0)}</h3>
                    <p>CA du mois (TTC)</p>
                    <div class="stat-change positive">
                        <i class="fas fa-arrow-up"></i>
                        <span>Mois en cours</span>
                    </div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon blue">
                    <i class="fas fa-file-invoice"></i>
                </div>
                <div class="stat-info">
                    <h3>${d.factures?.TOTAL_FACTURES || 0}</h3>
                    <p>Total factures</p>
                    <div class="stat-change positive">
                        <i class="fas fa-check"></i>
                        <span>${d.factures?.PAYEES || 0} payees</span>
                    </div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-info">
                    <h3>${d.factures?.EN_ATTENTE || 0}</h3>
                    <p>En attente paiement</p>
                    <div class="stat-change negative">
                        <i class="fas fa-hourglass-half"></i>
                        <span>A traiter</span>
                    </div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon purple">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="stat-info">
                    <h3>${formatMoney(d.factures?.TOTAL_IMPAYE || 0)}</h3>
                    <p>Montant impaye</p>
                    <div class="stat-change negative">
                        <i class="fas fa-arrow-down"></i>
                        <span>A recouvrer</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Content Grid -->
        <div class="content-grid">
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-file-invoice-dollar"></i> Dernieres factures</h3>
                </div>
                <div class="card-body" style="padding:0;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>N° Facture</th>
                                <th>Date</th>
                                <th>Client</th>
                                <th>Montant</th>
                                <th>Statut</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(d.dernieresFactures || []).map(f => `
                                <tr>
                                    <td><strong>${f.INVOICE_NUMBER || '-'}</strong></td>
                                    <td>${formatDate(f.CREATED_AT)}</td>
                                    <td>${f.NOM_CLIENT || ''}</td>
                                    <td>${formatMoney(f.TOTAL_TTC)}</td>
                                    <td>${getStatusBadge(f.STATUS)}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:40px;">Aucune facture</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-chart-pie"></i> Statistiques du mois</h3>
                </div>
                <div class="card-body">
                    <div style="display:flex;flex-direction:column;gap:16px;">
                        <div style="display:flex;justify-content:space-between;padding:12px;background:var(--bg-main);border-radius:8px;">
                            <span style="color:var(--text-secondary);">TVA collectee</span>
                            <strong style="color:var(--success);">${formatMoney(d.moisEnCours?.TVA_COLLECTEE || 0)}</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:12px;background:var(--bg-main);border-radius:8px;">
                            <span style="color:var(--text-secondary);">Factures payees</span>
                            <strong>${d.factures?.PAYEES || 0}</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:12px;background:var(--bg-main);border-radius:8px;">
                            <span style="color:var(--text-secondary);">Total encaisse</span>
                            <strong style="color:var(--primary);">${formatMoney(d.factures?.TOTAL_ENCAISSE || 0)}</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:12px;background:var(--bg-main);border-radius:8px;">
                            <span style="color:var(--text-secondary);">Clients avec impayes</span>
                            <strong style="color:var(--warning);">${d.impayesCount || 0}</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:12px;background:var(--bg-main);border-radius:8px;">
                            <span style="color:var(--text-secondary);">Bons de livraison</span>
                            <strong>${d.bonsLivraison?.NB_BL || 0}</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:12px;background:var(--bg-main);border-radius:8px;">
                            <span style="color:var(--text-secondary);">Commandes</span>
                            <strong>${d.commandes?.NB_COMMANDES || 0}</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== Factures =====
let facturesPage = 1;
async function loadFactures(page = 1) {
    facturesPage = page;
    const now = new Date();
    const params = new URLSearchParams({ page, limit: 15, year: now.getFullYear() });
    const result = await api(`/api/factures?${params}`);
    const content = document.getElementById('contentArea');

    if (!result.success) {
        content.innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        return;
    }

    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-file-invoice-dollar"></i> Facturation</h3>
                <div style="display:flex;gap:12px;">
                    <button class="btn btn-primary btn-sm" onclick="showGenerateModal()">
                        <i class="fas fa-magic"></i> Generer factures
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div style="display:flex;gap:16px;margin-bottom:20px;">
                    <input type="text" class="form-control" placeholder="Rechercher..." id="searchFactures" style="max-width:300px;">
                    <select class="form-control" style="max-width:180px;" onchange="filterFactures(this.value)">
                        <option value="">Tous les statuts</option>
                        <option value="PENDING">En attente</option>
                        <option value="PAID">Payees</option>
                        <option value="OVERDUE">En retard</option>
                    </select>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>N° Facture</th>
                            <th>Date</th>
                            <th>Client</th>
                            <th>Total HT</th>
                            <th>TVA</th>
                            <th>Total TTC</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(result.data || []).map(f => `
                            <tr>
                                <td><strong>${f.INVOICE_NUMBER || '-'}</strong></td>
                                <td>${formatDate(f.CREATED_AT)}</td>
                                <td>${f.NOM_CLIENT || ''} ${f.PRENOM || ''}<br><small style="color:var(--text-muted);">${f.TYPE_CLIENT || ''}</small></td>
                                <td>${formatMoney(f.TOTAL_HT)}</td>
                                <td>${formatMoney(f.TOTAL_TVA)}</td>
                                <td><strong>${formatMoney(f.TOTAL_TTC)}</strong></td>
                                <td>${getStatusBadge(f.STATUS)}</td>
                                <td>
                                    <div style="display:flex;gap:4px;">
                                        <button class="btn btn-icon" onclick="viewFacture(${f.ID})" title="Voir"><i class="fas fa-eye"></i></button>
                                        <button class="btn btn-icon" onclick="downloadFacture(${f.ID})" title="Telecharger"><i class="fas fa-download"></i></button>
                                        ${f.STATUS !== 'CANCELLED' ? `<button class="btn btn-icon" onclick="editFacture(${f.ID})" title="Modifier"><i class="fas fa-edit"></i></button>` : ''}
                                        ${f.STATUS === 'PENDING' ? `<button class="btn btn-icon" onclick="markPaid(${f.ID})" title="Marquer payee" style="color:var(--success);"><i class="fas fa-check"></i></button>` : ''}
                                        <button class="btn btn-icon" onclick="deleteFacture(${f.ID})" title="Supprimer" style="color:var(--danger);"><i class="fas fa-trash"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">Aucune facture</td></tr>'}
                    </tbody>
                </table>
                <div class="pagination" style="margin-top:20px;">${renderPagination(result.pagination, 'loadFactures')}</div>
            </div>
        </div>
    `;
}

async function viewFacture(id) {
    const result = await api(`/api/factures/${id}`);
    if (!result.success) return alert(result.error);

    const f = result.data.facture;
    openModal('Details Facture ' + f.INVOICE_NUMBER, `
        <div class="mb-2"><strong>Client:</strong> ${f.NOM_CLIENT} ${f.PRENOM || ''}</div>
        <div class="mb-2"><strong>Type:</strong> ${f.TYPE_CLIENT}</div>
        <div class="mb-2"><strong>Email:</strong> ${f.EMAIL || '-'}</div>
        <div class="mb-2"><strong>Commande:</strong> ${f.ORDER_NUMBER || '-'}</div>
        <div class="mb-2"><strong>Date facture:</strong> ${formatDate(f.CREATED_AT)}</div>
        <hr>
        <div class="mb-2"><strong>Total HT:</strong> ${formatMoney(f.TOTAL_HT)}</div>
        <div class="mb-2"><strong>TVA (20%):</strong> ${formatMoney(f.TOTAL_TVA)}</div>
        <div class="mb-2"><strong>Total TTC:</strong> ${formatMoney(f.TOTAL_TTC)}</div>
        <div class="mb-2"><strong>Statut:</strong> ${getStatusBadge(f.STATUS)}</div>
        ${f.STATUS === 'PAID' ? `<div class="mb-2"><strong>Payee le:</strong> ${formatDate(f.PAID_DATE)}</div>` : ''}
        <hr>
        <h5>Produits factures (${result.data.items?.length || 0})</h5>
        <table class="table"><thead><tr><th>Produit</th><th>Qte</th><th>PU</th><th>Total</th></tr></thead>
        <tbody>${(result.data.items || []).map(i => `
            <tr><td>${i.PRODUCT_NAME}</td><td>${i.QUANTITY}</td><td>${formatMoney(i.PRIX_UNITAIRE)}</td><td>${formatMoney(i.TOTAL_LINE)}</td></tr>
        `).join('') || '<tr><td colspan="4">Aucun produit</td></tr>'}</tbody></table>
        <div class="mt-3">
            <button class="btn btn-info" onclick="downloadFacture(${f.ID})"><i class="fas fa-download"></i> Telecharger PDF</button>
        </div>
    `, false);
}

async function editFacture(id) {
    const result = await api(`/api/factures/${id}`);
    if (!result.success) return alert(result.error);

    const f = result.data.facture;
    openModal('Modifier Facture ' + f.INVOICE_NUMBER, `
        <input type="hidden" id="editFactureId" value="${f.ID}">
        <div class="form-group">
            <label class="form-label">Client</label>
            <input type="text" class="form-control" value="${f.NOM_CLIENT} ${f.PRENOM || ''}" disabled>
        </div>
        <div class="grid grid-cols-3" style="gap:1rem;">
            <div class="form-group">
                <label class="form-label">Total HT</label>
                <input type="number" step="0.01" class="form-control" id="editTotalHT" value="${f.TOTAL_HT || 0}">
            </div>
            <div class="form-group">
                <label class="form-label">Total TVA</label>
                <input type="number" step="0.01" class="form-control" id="editTotalTVA" value="${f.TOTAL_TVA || 0}">
            </div>
            <div class="form-group">
                <label class="form-label">Total TTC</label>
                <input type="number" step="0.01" class="form-control" id="editTotalTTC" value="${f.TOTAL_TTC || 0}">
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Statut</label>
            <select class="form-control" id="editStatus">
                <option value="PENDING" ${f.STATUS === 'PENDING' ? 'selected' : ''}>En attente</option>
                <option value="PAID" ${f.STATUS === 'PAID' ? 'selected' : ''}>Payee</option>
                <option value="OVERDUE" ${f.STATUS === 'OVERDUE' ? 'selected' : ''}>En retard</option>
                <option value="CANCELLED" ${f.STATUS === 'CANCELLED' ? 'selected' : ''}>Annulee</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea class="form-control" id="editNotes" rows="2">${f.NOTES || ''}</textarea>
        </div>
    `, true, saveFacture);
}

async function saveFacture() {
    const id = document.getElementById('editFactureId').value;
    const data = {
        total_ht: parseFloat(document.getElementById('editTotalHT').value),
        total_tva: parseFloat(document.getElementById('editTotalTVA').value),
        total_ttc: parseFloat(document.getElementById('editTotalTTC').value),
        status: document.getElementById('editStatus').value,
        notes: document.getElementById('editNotes').value
    };

    const result = await api(`/api/factures/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });

    closeModal();
    if (result.success) {
        alert('Facture mise a jour avec succes');
        loadFactures(facturesPage);
    } else {
        alert('Erreur: ' + result.error);
    }
}

async function deleteFacture(id) {
    if (!confirm('Etes-vous sur de vouloir supprimer cette facture?')) return;

    const result = await api(`/api/factures/${id}`, { method: 'DELETE' });
    if (result.success) {
        alert('Facture supprimee avec succes');
        loadFactures(facturesPage);
    } else {
        alert('Erreur: ' + result.error);
    }
}

function downloadFacture(id) {
    window.open(`/api/factures/${id}/pdf`, '_blank');
}

async function markPaid(id) {
    if (!confirm('Marquer cette facture comme payee?')) return;
    const result = await api(`/api/factures/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'PAID', payment_method: 'Virement' })
    });
    if (result.success) {
        alert('Facture marquee comme payee. Ecriture ajoutee au journal.');
        loadFactures(facturesPage);
    } else alert(result.error);
}

function showGenerateModal() {
    const now = new Date();
    openModal('Generer factures mensuelles', `
        <p class="mb-2">Cette action va generer les factures pour tous les clients ayant des bons de livraison non factures pour le mois selectionne.</p>
        <div class="form-group">
            <label class="form-label">Mois</label>
            <select class="form-control" id="genMonth">
                ${[...Array(12)].map((_, i) => `<option value="${i + 1}" ${i + 1 === now.getMonth() + 1 ? 'selected' : ''}>${getMonthName(i + 1)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Annee</label>
            <input type="number" class="form-control" id="genYear" value="${now.getFullYear()}">
        </div>
        <div class="alert alert-warning"><i class="fas fa-info-circle"></i> Les clients professionnels beneficient d'une remise de 5%</div>
    `, true, generateFactures);
}

async function generateFactures() {
    const month = document.getElementById('genMonth').value;
    const year = document.getElementById('genYear').value;
    const result = await api('/api/factures/generate', {
        method: 'POST',
        body: JSON.stringify({ month: parseInt(month), year: parseInt(year) })
    });
    closeModal();
    if (result.success) {
        alert(result.message);
        loadFactures();
    } else alert(result.error);
}

function searchFactures() {
    loadFactures();
}

function filterFactures(status) {
    loadFactures();
}

// ===== Bons de Commande =====
let commandesPage = 1;
async function loadCommandes(page = 1) {
    commandesPage = page;
    const params = new URLSearchParams({ page, limit: 20 });
    const result = await api(`/api/commandes?${params}`);
    const content = document.getElementById('contentArea');

    if (!result.success) {
        content.innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        return;
    }

    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-clipboard-list"></i> Bons de commande</h3>
            </div>
            <div class="card-body">
                <div style="display:flex;gap:16px;margin-bottom:20px;">
                    <input type="text" class="form-control" placeholder="Rechercher commande ou client..." style="max-width:300px;">
                    <select class="form-control" style="max-width:180px;" onchange="filterCommandes(this.value)">
                        <option value="">Tous les statuts</option>
                        <option value="PENDING">En attente</option>
                        <option value="APPROVED">Approuvees</option>
                        <option value="DELIVERED">Livrees</option>
                    </select>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>N° Commande</th>
                            <th>Date</th>
                            <th>Client</th>
                            <th>Agence</th>
                            <th>Total TTC</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(result.data || []).map(c => `
                            <tr>
                                <td><strong>${c.ORDER_NUMBER || '-'}</strong></td>
                                <td>${formatDate(c.CREATED_AT)}</td>
                                <td>${c.NOM_CLIENT || ''} ${c.PRENOM || ''}<br><small style="color:var(--text-muted);">${c.TYPE_CLIENT || ''}</small></td>
                                <td>${c.AGENCE_NOM || '-'}</td>
                                <td><strong>${formatMoney(c.TOTAL_TTC)}</strong></td>
                                <td>${getOrderStatusBadge(c.STATUS)}</td>
                                <td>
                                    <button class="btn btn-icon" onclick="viewCommande(${c.ID})" title="Voir details"><i class="fas fa-eye"></i></button>
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);">Aucune commande</td></tr>'}
                    </tbody>
                </table>
                <div class="pagination" style="margin-top:20px;">${renderPagination(result.pagination, 'loadCommandes')}</div>
            </div>
        </div>
    `;
}

function getOrderStatusBadge(status) {
    const badges = {
        PENDING: '<span class="badge badge-warning">En attente</span>',
        APPROVED: '<span class="badge badge-info">Approuvee</span>',
        IN_DELIVERY: '<span class="badge badge-info">En livraison</span>',
        DELIVERED: '<span class="badge badge-success">Livree</span>',
        CANCELLED: '<span class="badge badge-secondary">Annulee</span>'
    };
    return badges[status] || `<span class="badge badge-secondary">${status}</span>`;
}

async function viewCommande(id) {
    const result = await api(`/api/commandes/${id}`);
    if (!result.success) return alert(result.error);

    const c = result.data.commande;
    openModal('Commande ' + c.ORDER_NUMBER, `
        <div class="mb-2"><strong>Client:</strong> ${c.NOM_CLIENT} ${c.PRENOM || ''}</div>
        <div class="mb-2"><strong>Type:</strong> ${c.TYPE_CLIENT}</div>
        <div class="mb-2"><strong>Email:</strong> ${c.EMAIL || '-'}</div>
        <div class="mb-2"><strong>Tel:</strong> ${c.TEL || '-'}</div>
        <div class="mb-2"><strong>Date commande:</strong> ${formatDate(c.CREATED_AT)}</div>
        <div class="mb-2"><strong>Statut:</strong> ${getOrderStatusBadge(c.STATUS)}</div>
        <hr>
        <h5>Produits commandes</h5>
        <table class="table"><thead><tr><th>Produit</th><th>Qte</th><th>PU</th><th>Total</th></tr></thead>
        <tbody>${(result.data.items || []).map(i => `
            <tr><td>${i.PRODUCT_NAME}</td><td>${i.QUANTITY}</td><td>${formatMoney(i.PRIX_UNITAIRE)}</td><td>${formatMoney(i.TOTAL_LINE)}</td></tr>
        `).join('')}</tbody></table>
        <div class="mb-2"><strong>Total HT:</strong> ${formatMoney(c.TOTAL_HT)}</div>
        <div class="mb-2"><strong>TVA:</strong> ${formatMoney(c.TOTAL_TVA)}</div>
        <div class="mb-2"><strong>Total TTC:</strong> ${formatMoney(c.TOTAL_TTC)}</div>
    `, false);
}

function filterCommandes(status) {
    loadCommandes();
}
async function loadJournal() {
    const result = await api('/api/journal');
    const facturesResult = await api('/api/factures?limit=100');
    const content = document.getElementById('contentArea');

    if (!result.success) {
        content.innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        return;
    }

    content.innerHTML = `
        <div class="search-bar">
            <div class="form-group" style="margin:0"><input type="date" class="form-control" id="startDate" placeholder="Du"></div>
            <div class="form-group" style="margin:0"><input type="date" class="form-control" id="endDate" placeholder="Au"></div>
            <button class="btn btn-secondary" onclick="filterJournal()"><i class="fas fa-filter"></i> Filtrer</button>
            <button class="btn btn-primary" onclick="exportJournal()"><i class="fas fa-file-csv"></i> Exporter CSV</button>
            <button class="btn btn-success" onclick="showAddEcritureModal()"><i class="fas fa-plus"></i> Nouvelle ecriture</button>
        </div>
        <div class="grid grid-cols-3 mb-3">
            <div class="stat-card"><div class="stat-value">${formatMoney(result.totals?.TOTAL_HT || 0)}</div><div class="stat-label">Total HT</div></div>
            <div class="stat-card"><div class="stat-value">${formatMoney(result.totals?.TOTAL_TVA || 0)}</div><div class="stat-label">Total TVA</div></div>
            <div class="stat-card primary"><div class="stat-value">${formatMoney(result.totals?.TOTAL_TTC || 0)}</div><div class="stat-label">Total TTC</div></div>
        </div>
        <div class="table-container">
            <table><thead><tr><th>N Piece</th><th>Date</th><th>Libelle</th><th>Debit</th><th>Credit</th><th>HT</th><th>TVA</th><th>TTC</th><th>Actions</th></tr></thead>
            <tbody>${(result.data || []).map(j => `
                <tr>
                    <td>${j.NUM_PIECE || '-'}</td>
                    <td>${formatDate(j.DATE_ECRITURE)}</td>
                    <td>${j.LIBELLE || '-'}<br><small class="text-muted">${j.INVOICE_NUMBER || ''}</small></td>
                    <td>${j.COMPTE_DEBIT || '411000'}</td>
                    <td>${j.COMPTE_CREDIT || '701000'}</td>
                    <td>${formatMoney(j.MONTANT_HT)}</td>
                    <td>${formatMoney(j.MONTANT_TVA)}</td>
                    <td><strong>${formatMoney(j.MONTANT_TTC)}</strong></td>
                    <td><button class="btn btn-sm btn-danger" onclick="deleteEcriture(${j.ID})"><i class="fas fa-trash"></i></button></td>
                </tr>
            `).join('') || '<tr><td colspan="9" class="text-center">Aucune ecriture</td></tr>'}</tbody></table>
        </div>
        ${renderPagination(result.pagination, 'loadJournalPage')}
    `;

    window.facturesForModal = facturesResult.data || [];
}

function showAddEcritureModal() {
    const today = new Date().toISOString().split('T')[0];
    const facturesOptions = (window.facturesForModal || []).map(f =>
        `<option value="${f.ID}">${f.INVOICE_NUMBER} - ${f.NOM_CLIENT || ''} (${formatMoney(f.TOTAL_TTC)})</option>`
    ).join('');

    openModal('Nouvelle ecriture au journal', `
        <div class="form-group">
            <label class="form-label">Facture associee *</label>
            <select class="form-control" id="ecritureInvoice" required onchange="fillAmountsFromFacture(this.value)">
                <option value="">-- Selectionner une facture --</option>
                ${facturesOptions}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Date de l'ecriture *</label>
            <input type="date" class="form-control" id="ecritureDate" value="${today}" required>
        </div>
        <div class="form-group">
            <label class="form-label">Libelle *</label>
            <input type="text" class="form-control" id="ecritureLibelle" placeholder="Ex: Paiement facture FACT-XXX" required>
        </div>
        <div class="grid grid-cols-2" style="gap:1rem;">
            <div class="form-group">
                <label class="form-label">Compte debit</label>
                <input type="text" class="form-control" id="ecritureDebit" value="411000" placeholder="411000">
            </div>
            <div class="form-group">
                <label class="form-label">Compte credit</label>
                <input type="text" class="form-control" id="ecritureCredit" value="701000" placeholder="701000">
            </div>
        </div>
        <div class="grid grid-cols-3" style="gap:1rem;">
            <div class="form-group">
                <label class="form-label">Montant HT *</label>
                <input type="number" step="0.01" class="form-control" id="ecritureHT" required>
            </div>
            <div class="form-group">
                <label class="form-label">Montant TVA *</label>
                <input type="number" step="0.01" class="form-control" id="ecrituretva" required>
            </div>
            <div class="form-group">
                <label class="form-label">Montant TTC *</label>
                <input type="number" step="0.01" class="form-control" id="ecriturettc" required>
            </div>
        </div>
    `, true, createEcriture);
}

function fillAmountsFromFacture(factureId) {
    const facture = (window.facturesForModal || []).find(f => f.ID == factureId);
    if (facture) {
        document.getElementById('ecritureHT').value = facture.TOTAL_HT || 0;
        document.getElementById('ecrituretva').value = facture.TOTAL_TVA || 0;
        document.getElementById('ecriturettc').value = facture.TOTAL_TTC || 0;
        document.getElementById('ecritureLibelle').value = `Paiement facture ${facture.INVOICE_NUMBER}`;
    }
}

async function createEcriture() {
    const invoice_id = document.getElementById('ecritureInvoice').value;
    const date_ecriture = document.getElementById('ecritureDate').value;
    const libelle = document.getElementById('ecritureLibelle').value;
    const compte_debit = document.getElementById('ecritureDebit').value;
    const compte_credit = document.getElementById('ecritureCredit').value;
    const montant_ht = parseFloat(document.getElementById('ecritureHT').value);
    const montant_tva = parseFloat(document.getElementById('ecrituretva').value);
    const montant_ttc = parseFloat(document.getElementById('ecriturettc').value);

    if (!invoice_id || !date_ecriture || !libelle || !montant_ht) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }

    const result = await api('/api/journal/ecriture', {
        method: 'POST',
        body: JSON.stringify({ invoice_id: parseInt(invoice_id), date_ecriture, libelle, montant_ht, montant_tva, montant_ttc, compte_debit, compte_credit })
    });

    closeModal();
    if (result.success) {
        alert('Ecriture creee avec succes!');
        loadJournal();
    } else {
        alert('Erreur: ' + result.error);
    }
}

async function deleteEcriture(id) {
    if (!confirm('Supprimer cette ecriture du journal?')) return;
    const result = await api(`/api/journal/${id}`, { method: 'DELETE' });
    if (result.success) {
        loadJournal();
    } else {
        alert('Erreur: ' + result.error);
    }
}

function exportJournal() {
    const start = document.getElementById('startDate')?.value || '';
    const end = document.getElementById('endDate')?.value || '';
    window.open(`${API_BASE}/api/journal/export?format=csv&startDate=${start}&endDate=${end}`, '_blank');
}

async function filterJournal() {
    loadJournal();
}

// ===== Clients (Fiches Clients - Service Facturation) =====
let clientsPage = 1;
async function loadClients(page = 1) {
    clientsPage = page;
    const params = new URLSearchParams({ page, limit: 20 });
    const result = await api(`/api/clients?${params}`);
    const statsResult = await api('/api/clients/stats');
    const content = document.getElementById('contentArea');

    if (!result.success) {
        content.innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        return;
    }

    const stats = statsResult.data || {};

    content.innerHTML = `
        <!-- Stats Grid -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon green"><i class="fas fa-users"></i></div>
                <div class="stat-info">
                    <h3>${stats.TOTAL_CLIENTS || 0}</h3>
                    <p>Total clients</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon blue"><i class="fas fa-user"></i></div>
                <div class="stat-info">
                    <h3>${stats.PARTICULIERS || 0}</h3>
                    <p>Particuliers</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><i class="fas fa-building"></i></div>
                <div class="stat-info">
                    <h3>${stats.PROFESSIONNELS || 0}</h3>
                    <p>Professionnels (remise 5%)</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon purple"><i class="fas fa-tractor"></i></div>
                <div class="stat-info">
                    <h3>${stats.AGRICULTEURS || 0}</h3>
                    <p>Agriculteurs</p>
                </div>
            </div>
        </div>

        <!-- Clients Card -->
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-address-card"></i> Fiches clients</h3>
            </div>
            <div class="card-body">
                <div style="display:flex;gap:16px;margin-bottom:20px;">
                    <input type="text" class="form-control" placeholder="Rechercher client..." id="searchClients" style="max-width:300px;">
                    <select class="form-control" style="max-width:220px;" onchange="filterClients(this.value)">
                        <option value="">Tous types</option>
                        <option value="PARTICULIER">Particuliers</option>
                        <option value="PROFESSIONNEL">Professionnels (remise 5%)</option>
                        <option value="AGRICULTEUR">Agriculteurs</option>
                    </select>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Client</th>
                            <th>Type</th>
                            <th>Remise</th>
                            <th>Contact</th>
                            <th>Impaye</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(result.data || []).map(c => `
                            <tr>
                                <td><strong>${c.NOM_CLIENT || ''}</strong> ${c.PRENOM || ''}<br><small style="color:var(--text-muted);">${c.ENTREPRISE || ''}</small></td>
                                <td>${getClientTypeBadge(c.TYPE_CLIENT)}</td>
                                <td>${c.TYPE_CLIENT === 'PROFESSIONNEL' ? '<span class="badge badge-success">5%</span>' : '<span class="badge badge-secondary">-</span>'}</td>
                                <td>${c.EMAIL || '-'}<br><small style="color:var(--text-muted);">${c.TEL || ''}</small></td>
                                <td style="${c.TOTAL_IMPAYE > 0 ? 'color:var(--danger);font-weight:600;' : ''}">${formatMoney(c.TOTAL_IMPAYE)}</td>
                                <td>
                                    <div style="display:flex;gap:4px;">
                                        <button class="btn btn-icon" onclick="viewClient(${c.ID})" title="Voir fiche"><i class="fas fa-eye"></i></button>
                                        <button class="btn btn-icon" onclick="editClient(${c.ID})" title="Modifier"><i class="fas fa-edit"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">Aucun client</td></tr>'}
                    </tbody>
                </table>
                <div class="pagination" style="margin-top:20px;">${renderPagination(result.pagination, 'loadClients')}</div>
            </div>
        </div>
    `;
}

function getClientTypeBadge(type) {
    const badges = {
        PARTICULIER: '<span class="badge badge-info">Particulier</span>',
        PROFESSIONNEL: '<span class="badge badge-warning">Professionnel</span>',
        AGRICULTEUR: '<span class="badge badge-success">Agriculteur</span>'
    };
    return badges[type] || `<span class="badge badge-secondary">${type}</span>`;
}

async function viewClient(id) {
    const result = await api(`/api/clients/${id}`);
    if (!result.success) return alert(result.error);

    const c = result.data.client;
    const s = result.data.stats;
    openModal('Client: ' + c.NOM_CLIENT, `
        <div class="mb-2"><strong>Nom:</strong> ${c.NOM_CLIENT} ${c.PRENOM || ''}</div>
        <div class="mb-2"><strong>Type:</strong> ${c.TYPE_CLIENT}</div>
        <div class="mb-2"><strong>Entreprise:</strong> ${c.ENTREPRISE || '-'}</div>
        <div class="mb-2"><strong>Email:</strong> ${c.EMAIL || '-'}</div>
        <div class="mb-2"><strong>Tel:</strong> ${c.TEL || '-'}</div>
        <div class="mb-2"><strong>Adresse:</strong> ${c.ADRESSE || '-'}, ${c.VILLE || '-'} ${c.CODE_POSTAL || ''}</div>
        <div class="mb-2"><strong>Date naissance:</strong> ${formatDate(c.DATE_NAISSANCE) || '-'}</div>
        <hr>
        <h5>Statistiques</h5>
        <div class="mb-2"><strong>Nombre de factures:</strong> ${s.NB_FACTURES}</div>
        <div class="mb-2"><strong>Total facture:</strong> ${formatMoney(s.TOTAL_FACTURE)}</div>
        <div class="mb-2"><strong>Total paye:</strong> ${formatMoney(s.TOTAL_PAYE)}</div>
        <div class="mb-2"><strong>Impaye:</strong> <span class="${s.TOTAL_IMPAYE > 0 ? 'text-danger fw-bold' : ''}">${formatMoney(s.TOTAL_IMPAYE)}</span></div>
    `, false);
}

async function editClient(id) {
    const result = await api(`/api/clients/${id}`);
    if (!result.success) return alert(result.error);

    const c = result.data.client;
    const dateNaissance = c.DATE_NAISSANCE ? new Date(c.DATE_NAISSANCE).toISOString().split('T')[0] : '';

    openModal('Modifier fiche client', `
        <input type="hidden" id="editClientId" value="${c.ID}">
        <div class="form-group">
            <label class="form-label">Nom</label>
            <input type="text" class="form-control" value="${c.NOM_CLIENT || ''}" disabled>
        </div>
        <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" id="editEmail" value="${c.EMAIL || ''}">
        </div>
        <div class="form-group">
            <label class="form-label">Telephone</label>
            <input type="text" class="form-control" id="editTel" value="${c.TEL || ''}">
        </div>
        <div class="form-group">
            <label class="form-label">Date de naissance ${c.TYPE_CLIENT === 'PARTICULIER' ? '(requis pour marketing)' : ''}</label>
            <input type="date" class="form-control" id="editDateNaissance" value="${dateNaissance}">
        </div>
        <div class="form-group">
            <label class="form-label">Adresse</label>
            <input type="text" class="form-control" id="editAdresse" value="${c.ADRESSE || ''}">
        </div>
        <div class="grid grid-cols-2" style="gap:1rem;">
            <div class="form-group">
                <label class="form-label">Ville</label>
                <input type="text" class="form-control" id="editVille" value="${c.VILLE || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Code postal</label>
                <input type="text" class="form-control" id="editCodePostal" value="${c.CODE_POSTAL || ''}">
            </div>
        </div>
    `, true, saveClient);
}

async function saveClient() {
    const id = document.getElementById('editClientId').value;
    const data = {
        email: document.getElementById('editEmail').value,
        tel: document.getElementById('editTel').value,
        date_naissance: document.getElementById('editDateNaissance').value || null,
        adresse: document.getElementById('editAdresse').value,
        ville: document.getElementById('editVille').value,
        code_postal: document.getElementById('editCodePostal').value
    };

    const result = await api(`/api/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });

    closeModal();
    if (result.success) {
        alert('Fiche client mise a jour');
        loadClients(clientsPage);
    } else {
        alert('Erreur: ' + result.error);
    }
}

function filterClients(type) {
    loadClients();
}

// ===== Livraisons =====
let livraisonsPage = 1;
async function loadLivraisons(page = 1) {
    livraisonsPage = page;
    const params = new URLSearchParams({ page, limit: 20 });
    const result = await api(`/api/livraisons?${params}`);
    const content = document.getElementById('contentArea');

    if (!result.success) {
        content.innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        return;
    }

    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-truck"></i> Bons de livraison</h3>
                <button class="btn btn-secondary btn-sm" onclick="showNonFactures()">
                    <i class="fas fa-exclamation-circle"></i> BL non factures
                </button>
            </div>
            <div class="card-body">
                <div style="display:flex;gap:16px;margin-bottom:20px;">
                    <input type="text" class="form-control" placeholder="Rechercher BL ou client..." style="max-width:300px;">
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>N° BL</th>
                            <th>Date</th>
                            <th>Client</th>
                            <th>Commande</th>
                            <th>Montant</th>
                            <th>Facture</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(result.data || []).map(bl => `
                            <tr>
                                <td><strong>${bl.BL_NUMBER || '-'}</strong></td>
                                <td>${formatDate(bl.CREATED_AT)}</td>
                                <td>${bl.NOM_CLIENT || ''} ${bl.PRENOM || ''}<br><small style="color:var(--text-muted);">${bl.TYPE_CLIENT || ''}</small></td>
                                <td>${bl.ORDER_NUMBER || '-'}</td>
                                <td>${formatMoney(bl.TOTAL_BL)}</td>
                                <td>${bl.IS_INVOICED > 0 ? '<span class="badge badge-success">Facture</span>' : '<span class="badge badge-warning">Non facture</span>'}</td>
                                <td>
                                    <div style="display:flex;gap:4px;">
                                        <button class="btn btn-icon" onclick="viewBL(${bl.ID})" title="Voir details"><i class="fas fa-eye"></i></button>
                                        <button class="btn btn-icon" onclick="validateBL(${bl.ID})" title="Valider"><i class="fas fa-check-circle"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);">Aucun bon de livraison</td></tr>'}
                    </tbody>
                </table>
                <div class="pagination" style="margin-top:20px;">${renderPagination(result.pagination, 'loadLivraisons')}</div>
            </div>
        </div>
    `;
}

async function viewBL(id) {
    const result = await api(`/api/livraisons/${id}`);
    if (!result.success) return alert(result.error);

    const bl = result.data.bonLivraison;
    openModal('Bon de livraison ' + bl.BL_NUMBER, `
        <div class="mb-2"><strong>Client:</strong> ${bl.NOM_CLIENT} ${bl.PRENOM || ''}</div>
        <div class="mb-2"><strong>Type:</strong> ${bl.TYPE_CLIENT}</div>
        <div class="mb-2"><strong>Email:</strong> ${bl.EMAIL || '-'}</div>
        <div class="mb-2"><strong>Tel:</strong> ${bl.TEL || '-'}</div>
        <div class="mb-2"><strong>Adresse:</strong> ${bl.ADRESSE || '-'}, ${bl.VILLE || '-'}</div>
        <div class="mb-2"><strong>Commande:</strong> ${bl.ORDER_NUMBER}</div>
        <div class="mb-2"><strong>Date:</strong> ${formatDate(bl.CREATED_AT)}</div>
        <hr>
        <h5>Produits livres</h5>
        <table class="table"><thead><tr><th>Produit</th><th>Qte</th><th>PU</th><th>Total</th></tr></thead>
        <tbody>${(result.data.items || []).map(i => `
            <tr><td>${i.PRODUCT_NAME}</td><td>${i.QUANTITY_DELIVERED}</td><td>${formatMoney(i.PRIX_UNITAIRE)}</td><td>${formatMoney(i.TOTAL_LIGNE)}</td></tr>
        `).join('')}</tbody></table>
    `, false);
}

async function validateBL(id) {
    if (!confirm('Valider les informations client sur ce BL?')) return;
    const result = await api(`/api/livraisons/${id}/valider`, { method: 'PUT' });
    if (result.success) {
        alert('BL valide');
        loadLivraisons(livraisonsPage);
    } else {
        alert('Erreur: ' + result.error);
    }
}

async function showNonFactures() {
    const now = new Date();
    const result = await api(`/api/livraisons/non-factures?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
    if (!result.success) return alert(result.error);

    let content = '<p>Bons de livraison non encore factures pour ce mois:</p><ul>';
    for (const bl of result.data) {
        content += `<li><strong>${bl.BL_NUMBER}</strong> - ${bl.NOM_CLIENT} - ${formatMoney(bl.TOTAL_BL)}</li>`;
    }
    content += '</ul>';
    if (result.data.length === 0) {
        content = '<p>Tous les BL du mois ont ete factures.</p>';
    }
    openModal('BL non factures', content, false);
}

// ===== Catalogue =====
let cataloguePage = 1;
async function loadCatalogue(page = 1) {
    cataloguePage = page;
    const params = new URLSearchParams({ page, limit: 30 });
    const result = await api(`/api/catalogue?${params}`);
    const categoriesResult = await api('/api/catalogue/categories');
    const content = document.getElementById('contentArea');

    if (!result.success) {
        content.innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        return;
    }

    const categories = categoriesResult.data || [];

    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-boxes-stacked"></i> Catalogue produits</h3>
            </div>
            <div class="card-body">
                <div style="display:flex;gap:16px;margin-bottom:20px;">
                    <input type="text" class="form-control" placeholder="Rechercher produit..." style="max-width:300px;">
                    <select class="form-control" style="max-width:200px;" onchange="filterCatalogue(this.value)">
                        <option value="">Toutes categories</option>
                        ${categories.map(c => `<option value="${c.CATEGORY}">${c.CATEGORY} (${c.NB_PRODUITS})</option>`).join('')}
                    </select>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Produit</th>
                            <th>Categorie</th>
                            <th>Unite</th>
                            <th>Prix unitaire</th>
                            <th>Stock</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(result.data || []).map(p => `
                            <tr>
                                <td><strong>${p.PRODUCT_CODE || '-'}</strong></td>
                                <td>${p.PRODUCT_NAME}<br><small style="color:var(--text-muted);">${p.DESCRIPTION || ''}</small></td>
                                <td><span class="badge badge-primary">${p.CATEGORY}</span></td>
                                <td>${p.UNIT}</td>
                                <td><strong>${formatMoney(p.PRIX_UNITAIRE)}</strong></td>
                                <td>${p.STOCK_DISPONIBLE || 0}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">Aucun produit</td></tr>'}
                    </tbody>
                </table>
                <div class="pagination" style="margin-top:20px;">${renderPagination(result.pagination, 'loadCatalogue')}</div>
            </div>
        </div>
    `;
}

function filterCatalogue(category) {
    loadCatalogue();
}

// ===== Modal =====
function openModal(title, content, showConfirm = false, onConfirm = null) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modalConfirmBtn').style.display = showConfirm ? 'block' : 'none';
    document.getElementById('modalConfirmBtn').onclick = onConfirm;
    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

// ===== Pagination =====
function renderPagination(pagination, callback) {
    if (!pagination || pagination.pages <= 1) return '';
    let html = '<div class="pagination">';
    html += `<button class="pagination-btn" onclick="${callback}(${pagination.page - 1})" ${pagination.page <= 1 ? 'disabled' : ''}>&laquo;</button>`;
    for (let i = 1; i <= Math.min(pagination.pages, 5); i++) {
        html += `<button class="pagination-btn ${pagination.page === i ? 'active' : ''}" onclick="${callback}(${i})">${i}</button>`;
    }
    html += `<button class="pagination-btn" onclick="${callback}(${pagination.page + 1})" ${pagination.page >= pagination.pages ? 'disabled' : ''}>&raquo;</button>`;
    html += '</div>';
    return html;
}
