// AGRI Comptabilité - Application JavaScript
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
    const userData = localStorage.getItem('agri_comptable_user');
    if (!userData) {
        window.location.href = '/login.html';
        return;
    }
    currentUser = JSON.parse(userData);
    document.getElementById('userName').textContent = `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() || 'Comptable';
    document.getElementById('userAvatar').textContent = (currentUser.prenom || 'C')[0].toUpperCase();
}

function logout() {
    localStorage.removeItem('agri_comptable_user');
    localStorage.removeItem('agri_comptable_token');
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
        dashboard: ['Tableau de bord', 'Vue d\'ensemble de la comptabilité'],
        factures: ['Factures mensuelles', 'Gestion des factures clients'],
        journal: ['Journal des ventes', 'Écritures comptables'],
        livraisons: ['Bons de livraison', 'Consultation des BL'],
        clients: ['Clients', 'Liste et historique des clients'],
        rapports: ['Rapports', 'Génération de rapports']
    };
    document.getElementById('pageTitle').textContent = titles[page]?.[0] || page;
    document.getElementById('pageSubtitle').textContent = titles[page]?.[1] || '';

    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    switch (page) {
        case 'dashboard': loadDashboard(); break;
        case 'factures': loadFactures(); break;
        case 'journal': loadJournal(); break;
        case 'livraisons': loadLivraisons(); break;
        case 'clients': loadClients(); break;
        case 'rapports': loadRapports(); break;
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
        PAID: '<span class="badge badge-success">Payée</span>',
        OVERDUE: '<span class="badge badge-danger">En retard</span>',
        CANCELLED: '<span class="badge badge-secondary">Annulée</span>'
    };
    return badges[status] || `<span class="badge badge-secondary">${status}</span>`;
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
        <div class="grid grid-cols-4 mb-3">
            <div class="stat-card primary">
                <div class="stat-value">${formatMoney(d.moisEnCours?.CA_TTC || 0)}</div>
                <div class="stat-label">CA du mois (TTC)</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><i class="fas fa-file-invoice"></i></div>
                <div class="stat-value">${d.factures?.TOTAL_FACTURES || 0}</div>
                <div class="stat-label">Total factures</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><i class="fas fa-clock"></i></div>
                <div class="stat-value">${d.factures?.EN_ATTENTE || 0}</div>
                <div class="stat-label">En attente paiement</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="stat-value">${formatMoney(d.factures?.TOTAL_IMPAYE || 0)}</div>
                <div class="stat-label">Montant impayé</div>
            </div>
        </div>
        <div class="grid grid-cols-2">
            <div class="card">
                <div class="card-header"><h4><i class="fas fa-file-invoice-dollar"></i> Dernières factures</h4></div>
                <div class="card-body" style="padding:0;">
                    <table><thead><tr><th>N° Facture</th><th>Client</th><th>Montant</th><th>Statut</th></tr></thead>
                    <tbody>${(d.dernieresFactures || []).map(f => `
                        <tr><td>${f.INVOICE_NUMBER || '-'}</td><td>${f.NOM_CLIENT || ''} ${f.PRENOM || ''}</td>
                        <td>${formatMoney(f.TOTAL_TTC)}</td><td>${getStatusBadge(f.STATUS)}</td></tr>
                    `).join('') || '<tr><td colspan="4" class="text-center text-muted">Aucune facture</td></tr>'}</tbody></table>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h4><i class="fas fa-chart-line"></i> Statistiques</h4></div>
                <div class="card-body">
                    <div class="mb-2"><strong>TVA collectée ce mois:</strong> ${formatMoney(d.moisEnCours?.TVA_COLLECTEE || 0)}</div>
                    <div class="mb-2"><strong>Factures payées:</strong> ${d.factures?.PAYEES || 0}</div>
                    <div class="mb-2"><strong>Total encaissé:</strong> ${formatMoney(d.factures?.TOTAL_ENCAISSE || 0)}</div>
                    <div class="mb-2"><strong>Clients avec impayés:</strong> ${d.impayesCount || 0}</div>
                    <div><strong>Écritures journal ce mois:</strong> ${d.journal?.NB_ECRITURES || 0}</div>
                </div>
            </div>
        </div>
    `;
}

// ===== Factures =====
let facturesPage = 1;
async function loadFactures(page = 1) {
    facturesPage = page;
    const params = new URLSearchParams({ page, limit: 15 });
    const result = await api(`/api/factures?${params}`);
    const content = document.getElementById('contentArea');

    if (!result.success) {
        content.innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        return;
    }

    content.innerHTML = `
        <div class="search-bar">
            <div class="search-input"><i class="fas fa-search"></i><input type="text" class="form-control" placeholder="Rechercher..." id="searchFactures" onkeyup="searchFactures()"></div>
            <select class="form-control form-select" style="width:auto;" onchange="filterFactures(this.value)">
                <option value="">Tous les statuts</option>
                <option value="PENDING">En attente</option>
                <option value="PAID">Payées</option>
                <option value="OVERDUE">En retard</option>
            </select>
            <button class="btn btn-primary" onclick="showGenerateModal()"><i class="fas fa-magic"></i> Générer factures</button>
        </div>
        <div class="table-container">
            <table><thead><tr><th>N° Facture</th><th>Client</th><th>Période</th><th>Total HT</th><th>TVA</th><th>Total TTC</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>${(result.data || []).map(f => `
                <tr>
                    <td><strong>${f.INVOICE_NUMBER || '-'}</strong></td>
                    <td>${f.NOM_CLIENT || ''} ${f.PRENOM || ''}<br><small class="text-muted">${f.TYPE_CLIENT || ''}</small></td>
                    <td>${f.MONTH}/${f.YEAR}</td>
                    <td>${formatMoney(f.TOTAL_HT)}</td>
                    <td>${formatMoney(f.TOTAL_TVA)}</td>
                    <td><strong>${formatMoney(f.TOTAL_TTC)}</strong></td>
                    <td>${getStatusBadge(f.STATUS)}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="viewFacture(${f.ID})"><i class="fas fa-eye"></i></button>
                        ${f.STATUS === 'PENDING' ? `<button class="btn btn-sm btn-success" onclick="markPaid(${f.ID})"><i class="fas fa-check"></i></button>` : ''}
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="8" class="text-center">Aucune facture</td></tr>'}</tbody></table>
        </div>
        ${renderPagination(result.pagination, 'loadFactures')}
    `;
}

async function viewFacture(id) {
    const result = await api(`/api/factures/${id}`);
    if (!result.success) return alert(result.error);

    const f = result.data.facture;
    openModal('Détails Facture ' + f.INVOICE_NUMBER, `
        <div class="mb-2"><strong>Client:</strong> ${f.NOM_CLIENT} ${f.PRENOM || ''}</div>
        <div class="mb-2"><strong>Email:</strong> ${f.EMAIL || '-'}</div>
        <div class="mb-2"><strong>Période:</strong> ${f.MONTH}/${f.YEAR}</div>
        <div class="mb-2"><strong>Émission:</strong> ${formatDate(f.EMISSION_DATE)}</div>
        <div class="mb-2"><strong>Échéance:</strong> ${formatDate(f.DUE_DATE)}</div>
        <hr>
        <div class="mb-2"><strong>Total HT:</strong> ${formatMoney(f.TOTAL_HT)}</div>
        <div class="mb-2"><strong>TVA (20%):</strong> ${formatMoney(f.TOTAL_TVA)}</div>
        <div class="mb-2"><strong>Total TTC:</strong> ${formatMoney(f.TOTAL_TTC)}</div>
        <div class="mb-2"><strong>Statut:</strong> ${getStatusBadge(f.STATUS)}</div>
        ${f.STATUS === 'PAID' ? `<div class="mb-2"><strong>Payée le:</strong> ${formatDate(f.PAID_DATE)}</div>` : ''}
        <hr>
        <h5>Bons de livraison associés (${result.data.bonsLivraison?.length || 0})</h5>
        <ul>${(result.data.bonsLivraison || []).map(bl => `<li>${bl.BL_NUMBER} - ${formatMoney(bl.TOTAL_BL)}</li>`).join('') || '<li>Aucun</li>'}</ul>
    `, false);
}

async function markPaid(id) {
    if (!confirm('Marquer cette facture comme payée?')) return;
    const result = await api(`/api/factures/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'PAID', payment_method: 'Virement' })
    });
    if (result.success) {
        alert('Facture marquée comme payée. Écriture ajoutée au journal.');
        loadFactures(facturesPage);
    } else alert(result.error);
}

function showGenerateModal() {
    const now = new Date();
    openModal('Générer factures mensuelles', `
        <div class="form-group">
            <label class="form-label">Mois</label>
            <select class="form-control" id="genMonth">
                ${[...Array(12)].map((_, i) => `<option value="${i + 1}" ${i + 1 === now.getMonth() + 1 ? 'selected' : ''}>${['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][i]}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Année</label>
            <input type="number" class="form-control" id="genYear" value="${now.getFullYear()}">
        </div>
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
    // Simplified - reload with filter
    loadFactures();
}

function filterFactures(status) {
    loadFactures();
}

// ===== Journal =====
async function loadJournal() {
    const result = await api('/api/journal');
    // Also get factures for the dropdown
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
            <button class="btn btn-success" onclick="showAddEcritureModal()"><i class="fas fa-plus"></i> Nouvelle écriture</button>
        </div>
        <div class="grid grid-cols-3 mb-3">
            <div class="stat-card"><div class="stat-value">${formatMoney(result.totals?.TOTAL_HT || 0)}</div><div class="stat-label">Total HT</div></div>
            <div class="stat-card"><div class="stat-value">${formatMoney(result.totals?.TOTAL_TVA || 0)}</div><div class="stat-label">Total TVA</div></div>
            <div class="stat-card primary"><div class="stat-value">${formatMoney(result.totals?.TOTAL_TTC || 0)}</div><div class="stat-label">Total TTC</div></div>
        </div>
        <div class="table-container">
            <table><thead><tr><th>N° Pièce</th><th>Date</th><th>Libellé</th><th>Débit</th><th>Crédit</th><th>HT</th><th>TVA</th><th>TTC</th><th>Actions</th></tr></thead>
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
            `).join('') || '<tr><td colspan="9" class="text-center">Aucune écriture</td></tr>'}</tbody></table>
        </div>
        ${renderPagination(result.pagination, 'loadJournalPage')}
    `;

    // Store factures for the modal
    window.facturesForModal = facturesResult.data || [];
}

function showAddEcritureModal() {
    const today = new Date().toISOString().split('T')[0];
    const facturesOptions = (window.facturesForModal || []).map(f =>
        `<option value="${f.ID}">${f.INVOICE_NUMBER} - ${f.NOM_CLIENT || ''} (${formatMoney(f.TOTAL_TTC)})</option>`
    ).join('');

    openModal('Nouvelle écriture au journal', `
        <div class="form-group">
            <label class="form-label">Facture associée *</label>
            <select class="form-control" id="ecritureInvoice" required onchange="fillAmountsFromFacture(this.value)">
                <option value="">-- Sélectionner une facture --</option>
                ${facturesOptions}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Date de l'écriture *</label>
            <input type="date" class="form-control" id="ecritureDate" value="${today}" required>
        </div>
        <div class="form-group">
            <label class="form-label">Libellé *</label>
            <input type="text" class="form-control" id="ecritureLibelle" placeholder="Ex: Paiement facture FACT-XXX" required>
        </div>
        <div class="grid grid-cols-2" style="gap:1rem;">
            <div class="form-group">
                <label class="form-label">Compte débit</label>
                <input type="text" class="form-control" id="ecritureDebit" value="411000" placeholder="411000">
            </div>
            <div class="form-group">
                <label class="form-label">Compte crédit</label>
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
        alert('Écriture créée avec succès!');
        loadJournal();
    } else {
        alert('Erreur: ' + result.error);
    }
}

async function deleteEcriture(id) {
    if (!confirm('Supprimer cette écriture du journal?')) return;
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

// ===== Livraisons =====
async function loadLivraisons() {
    const result = await api('/api/livraisons');
    const content = document.getElementById('contentArea');

    if (!result.success) {
        content.innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        return;
    }

    content.innerHTML = `
        <div class="search-bar">
            <div class="search-input"><i class="fas fa-search"></i><input type="text" class="form-control" placeholder="Rechercher BL ou client..."></div>
        </div>
        <div class="table-container">
            <table><thead><tr><th>N° BL</th><th>Date</th><th>Client</th><th>Commande</th><th>Statut</th><th>Montant</th><th>Actions</th></tr></thead>
            <tbody>${(result.data || []).map(bl => `
                <tr>
                    <td><strong>${bl.BL_NUMBER || '-'}</strong></td>
                    <td>${formatDate(bl.CREATED_AT)}</td>
                    <td>${bl.NOM_CLIENT || ''} ${bl.PRENOM || ''}</td>
                    <td>${bl.ORDER_NUMBER || '-'}</td>
                    <td><span class="badge badge-${bl.DELIVERY_STATUS === 'COMPLETE' ? 'success' : 'warning'}">${bl.DELIVERY_STATUS || '-'}</span></td>
                    <td>${formatMoney(bl.TOTAL_BL)}</td>
                    <td><button class="btn btn-sm btn-secondary" onclick="viewBL(${bl.ID})"><i class="fas fa-eye"></i></button></td>
                </tr>
            `).join('') || '<tr><td colspan="7" class="text-center">Aucun bon de livraison</td></tr>'}</tbody></table>
        </div>
        ${renderPagination(result.pagination, 'loadLivraisonsPage')}
    `;
}

async function viewBL(id) {
    const result = await api(`/api/livraisons/${id}`);
    if (!result.success) return alert(result.error);

    const bl = result.data.bonLivraison;
    openModal('Bon de livraison ' + bl.BL_NUMBER, `
        <div class="mb-2"><strong>Client:</strong> ${bl.NOM_CLIENT} ${bl.PRENOM || ''}</div>
        <div class="mb-2"><strong>Commande:</strong> ${bl.ORDER_NUMBER}</div>
        <div class="mb-2"><strong>Date:</strong> ${formatDate(bl.CREATED_AT)}</div>
        <hr>
        <h5>Produits livrés</h5>
        <table class="table"><thead><tr><th>Produit</th><th>Qté</th><th>PU</th><th>Total</th></tr></thead>
        <tbody>${(result.data.items || []).map(i => `
            <tr><td>${i.PRODUCT_NAME}</td><td>${i.QUANTITY_DELIVERED}</td><td>${formatMoney(i.PRIX_UNITAIRE)}</td><td>${formatMoney(i.TOTAL_LIGNE)}</td></tr>
        `).join('')}</tbody></table>
    `, false);
}

// ===== Clients =====
async function loadClients() {
    const result = await api('/api/clients');
    const content = document.getElementById('contentArea');

    if (!result.success) {
        content.innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        return;
    }

    content.innerHTML = `
        <div class="search-bar">
            <div class="search-input"><i class="fas fa-search"></i><input type="text" class="form-control" placeholder="Rechercher client..."></div>
            <select class="form-control form-select" style="width:auto;">
                <option value="">Tous types</option>
                <option value="PARTICULIER">Particuliers</option>
                <option value="PROFESSIONNEL">Professionnels</option>
            </select>
        </div>
        <div class="table-container">
            <table><thead><tr><th>Client</th><th>Type</th><th>Email</th><th>Factures</th><th>Total payé</th><th>Impayé</th><th>Actions</th></tr></thead>
            <tbody>${(result.data || []).map(c => `
                <tr>
                    <td><strong>${c.NOM_CLIENT || ''}</strong> ${c.PRENOM || ''}<br><small class="text-muted">${c.ENTREPRISE || ''}</small></td>
                    <td><span class="badge badge-info">${c.TYPE_CLIENT || '-'}</span></td>
                    <td>${c.EMAIL || '-'}</td>
                    <td>${c.NB_FACTURES || 0}</td>
                    <td class="text-success">${formatMoney(c.TOTAL_PAYE)}</td>
                    <td class="${c.TOTAL_IMPAYE > 0 ? 'text-danger fw-bold' : ''}">${formatMoney(c.TOTAL_IMPAYE)}</td>
                    <td><button class="btn btn-sm btn-secondary" onclick="viewClient(${c.ID})"><i class="fas fa-eye"></i></button></td>
                </tr>
            `).join('') || '<tr><td colspan="7" class="text-center">Aucun client</td></tr>'}</tbody></table>
        </div>
        ${renderPagination(result.pagination, 'loadClientsPage')}
    `;
}

async function viewClient(id) {
    const result = await api(`/api/clients/${id}`);
    if (!result.success) return alert(result.error);

    const c = result.data.client;
    const s = result.data.stats;
    openModal('Client: ' + c.NOM_CLIENT, `
        <div class="mb-2"><strong>Nom:</strong> ${c.NOM_CLIENT} ${c.PRENOM || ''}</div>
        <div class="mb-2"><strong>Type:</strong> ${c.TYPE_CLIENT}</div>
        <div class="mb-2"><strong>Email:</strong> ${c.EMAIL || '-'}</div>
        <div class="mb-2"><strong>Tél:</strong> ${c.TEL || '-'}</div>
        <div class="mb-2"><strong>Adresse:</strong> ${c.ADRESSE || '-'}, ${c.VILLE || '-'}</div>
        <hr>
        <h5>Statistiques</h5>
        <div class="mb-2"><strong>Nombre de factures:</strong> ${s.NB_FACTURES}</div>
        <div class="mb-2"><strong>Total facturé:</strong> ${formatMoney(s.TOTAL_FACTURE)}</div>
        <div class="mb-2"><strong>Total payé:</strong> ${formatMoney(s.TOTAL_PAYE)}</div>
        <div class="mb-2"><strong>Impayé:</strong> <span class="${s.TOTAL_IMPAYE > 0 ? 'text-danger fw-bold' : ''}">${formatMoney(s.TOTAL_IMPAYE)}</span></div>
    `, false);
}

// ===== Rapports =====
function loadRapports() {
    const content = document.getElementById('contentArea');
    content.innerHTML = `
        <div class="grid grid-cols-3">
            <div class="card" style="cursor:pointer;" onclick="generateReport('ca')">
                <div class="card-body text-center">
                    <i class="fas fa-chart-line" style="font-size:3rem;color:var(--primary-green);margin-bottom:1rem;"></i>
                    <h4>Chiffre d'affaires</h4>
                    <p class="text-muted">CA mensuel/annuel</p>
                </div>
            </div>
            <div class="card" style="cursor:pointer;" onclick="generateReport('impayes')">
                <div class="card-body text-center">
                    <i class="fas fa-exclamation-circle" style="font-size:3rem;color:var(--danger);margin-bottom:1rem;"></i>
                    <h4>Impayés</h4>
                    <p class="text-muted">Liste des factures impayées</p>
                </div>
            </div>
            <div class="card" style="cursor:pointer;" onclick="exportJournal()">
                <div class="card-body text-center">
                    <i class="fas fa-file-export" style="font-size:3rem;color:var(--info);margin-bottom:1rem;"></i>
                    <h4>Export Journal</h4>
                    <p class="text-muted">Exporter pour comptabilité</p>
                </div>
            </div>
        </div>
    `;
}


// ===== Export / Rapports =====
function confirmExportFormat(title, onConfirm) {
    openModal(title, `
        <div class="text-center">
            <p class="mb-4">Veuillez choisir le format du rapport :</p>
            <div class="grid grid-cols-2" style="gap:1rem;">
                <button class="btn btn-outline-danger" style="height:auto;padding:1rem;" onclick="selectFormat('pdf')">
                    <i class="fas fa-file-pdf" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
                    PDF (Imprimable)
                </button>
                <button class="btn btn-outline-success" style="height:auto;padding:1rem;" onclick="selectFormat('csv')">
                    <i class="fas fa-file-csv" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
                    CSV (Excel)
                </button>
            </div>
        </div>
    `, false);

    // Store callback globally temporarily
    window.currentExportCallback = onConfirm;
}

function selectFormat(format) {
    closeModal();
    if (window.currentExportCallback) {
        window.currentExportCallback(format);
        window.currentExportCallback = null;
    }
}

function generateReport(type) {
    let title = 'Rapport ';
    if (type === 'ca') title += "Chiffre d'Affaires";
    else if (type === 'impayes') title += "Impayés";

    confirmExportFormat(title, (format) => {
        if (type === 'ca') {
            const year = new Date().getFullYear();
            window.open(`${API_BASE}/api/reports/ca?year=${year}&format=${format}`, '_blank');
        } else if (type === 'impayes') {
            window.open(`${API_BASE}/api/reports/impayes?format=${format}`, '_blank');
        }
    });
}

function exportJournal() {
    confirmExportFormat('Export Journal des Ventes', (format) => {
        const start = document.getElementById('startDate')?.value || '';
        const end = document.getElementById('endDate')?.value || '';
        window.open(`${API_BASE}/api/journal/export?startDate=${start}&endDate=${end}&format=${format}`, '_blank');
    });
}
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
