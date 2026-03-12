// API Base URL - Use the same as your backend
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Auth Token Key (must match auth.js)
const TOKEN_KEY = 'extradata_admin_token';
const USER_KEY = 'extradata_admin_user';

// Current state
let currentTab = 'dashboard';
let cachedBundles = [];

function formatCurrency(amount) {
    return `GHS ${Number(amount || 0).toFixed(2)}`;
}

function formatDateTime(dateValue) {
    if (!dateValue) return 'N/A';
    return new Date(dateValue).toLocaleString();
}

function getOrderAmount(order) {
    return Number(order?.bundle?.price || 0);
}

function getOrderRecipient(order) {
    return order?.recipient_phone || order?.phone_number || 'N/A';
}

function getOrderPayer(order) {
    return order?.payer_phone || order?.phone_number || 'N/A';
}

// ==================== AUTH CHECK ====================

// Check authentication before anything else
function checkAuth() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Get auth headers for API calls
function getAuthHeaders() {
    const token = localStorage.getItem(TOKEN_KEY);
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Handle unauthorized response
function handleUnauthorized() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = 'login.html';
}

// Logout function
function adminLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    window.location.href = 'login.html';
}

// ==================== INITIALIZE ====================

// Initialize admin portal
document.addEventListener('DOMContentLoaded', async function () {
    console.log('Admin portal loaded');
    
    // Check authentication first
    if (!checkAuth()) {
        return;
    }

    // Verify token with server
    try {
        const response = await fetch(`${API_BASE_URL}/admin/verify-token`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            handleUnauthorized();
            return;
        }
    } catch (error) {
        console.error('Auth verification failed:', error);
        handleUnauthorized();
        return;
    }

    // Update UI with username
    const username = localStorage.getItem(USER_KEY);
    if (username) {
        const profileName = document.querySelector('.profile-name');
        if (profileName) {
            profileName.textContent = username;
        }
    }

    initializeAdmin();
    setupEventListeners();
    loadDashboard();
});

// Initialize admin
function initializeAdmin() {
    showAdminLoading();

    // Set up tab navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const tab = this.getAttribute('data-tab');
            switchTab(tab);
        });
    });

    // Hide loading after initialization
    setTimeout(() => {
        hideAdminLoading();
    }, 1000);
}

// Enhanced loading functions
function showAdminLoading() {
    const loadingScreen = document.getElementById('adminLoadingScreen');
    loadingScreen.style.display = 'flex';
}

function hideAdminLoading() {
    const loadingScreen = document.getElementById('adminLoadingScreen');
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        loadingScreen.classList.remove('fade-out');
    }, 500);
}

// Setup event listeners
function setupEventListeners() {
    // Add bundle form
    document.getElementById('addBundleForm').addEventListener('submit', handleAddBundle);
    document.getElementById('editBundleForm').addEventListener('submit', handleEditBundle);

    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function () {
            document.getElementById('addBundleModal').style.display = 'none';
            closeEditBundleModal();
        });
    });

    // Menu toggle for mobile
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }

    // Search functionality
    const searchInputs = ['bundleSearch', 'orderSearch', 'paymentSearch', 'historySearch'];
    searchInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', debounce(handleSearch, 300));
        }
    });

    // Filter functionality
    const filters = ['networkFilter', 'statusFilter', 'paymentStatusFilter'];
    filters.forEach(id => {
        const filter = document.getElementById(id);
        if (filter) {
            filter.addEventListener('change', handleFilter);
        }
    });
}

// Debounce search
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

// Handle search
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    if (currentTab === 'orders') {
        const activeRows = document.querySelectorAll('#ordersTable tr');
        const completedRows = document.querySelectorAll('#completedOrdersTable tr');
        [...activeRows, ...completedRows].forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
        return;
    }

    const currentTable = document.querySelector(`#${currentTab}Table`);
    if (currentTable) {
        const rows = currentTable.getElementsByTagName('tr');
        Array.from(rows).forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }
}

// Handle filter
function handleFilter(e) {
    if (currentTab === 'orders' && e.target.id === 'statusFilter') {
        const value = e.target.value;
        const queuePanel = document.querySelector('.orders-panel:first-child');
        const historyPanel = document.querySelector('.orders-panel:last-child');

        if (!queuePanel || !historyPanel) {
            return;
        }

        queuePanel.style.display = (value === 'history') ? 'none' : 'block';
        historyPanel.style.display = (value === 'queue') ? 'none' : 'block';

        const rowMatcher = (row) => {
            const rowText = row.textContent.toLowerCase();
            if (!value || value === 'queue' || value === 'history') return true;
            return rowText.includes(value.toLowerCase());
        };

        document.querySelectorAll('#ordersTable tr').forEach(row => {
            row.style.display = rowMatcher(row) ? '' : 'none';
        });
        document.querySelectorAll('#completedOrdersTable tr').forEach(row => {
            row.style.display = rowMatcher(row) ? '' : 'none';
        });
        return;
    }

    switch (currentTab) {
        case 'bundles':
            loadBundles();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'payments':
            loadPayments();
            break;
    }
}

// Toggle sidebar for mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
}

// Switch between tabs
function switchTab(tabName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    // Update page title
    document.getElementById('pageTitle').textContent =
        tabName.charAt(0).toUpperCase() + tabName.slice(1);

    // Load tab data
    currentTab = tabName;
    switch (tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'bundles':
            loadBundles();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'payments':
            loadPayments();
            break;
        case 'history':
            loadHistory();
            break;
    }

    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 1024) {
        toggleSidebar();
    }
}

// Step 1 placeholder: History tab loader (full implementation in Step 2)
function loadHistory() {
    const tableBody = document.getElementById('historyTable');
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-light);">
                History view is ready. Data rendering will be added in Step 2.
            </td>
        </tr>
    `;
}

// Enhanced dashboard loading with animations
async function loadDashboard() {
    try {
        console.log('Loading dashboard data...');
        const [dashboardResponse, ordersResponse, paymentsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/admin/dashboard`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE_URL}/orders/`),
            fetch(`${API_BASE_URL}/payments/`)
        ]);

        if (dashboardResponse.status === 401) {
            handleUnauthorized();
            return;
        }

        if (!dashboardResponse.ok || !ordersResponse.ok || !paymentsResponse.ok) {
            throw new Error('Failed to load dashboard aggregates');
        }

        const dashboardData = await dashboardResponse.json();
        const orders = await ordersResponse.json();
        const payments = await paymentsResponse.json();

        const completedOrders = orders.filter(order => order.status === 'completed');
        const pendingOrders = orders.filter(order => order.status === 'pending' || order.status === 'processing');
        const revenue = completedOrders.reduce((sum, order) => sum + getOrderAmount(order), 0);
        const uniqueCustomers = new Set(
            orders
                .map(order => `${order.customer_name || ''}-${getOrderRecipient(order)}`)
                .filter(Boolean)
        ).size;

        // Animate stats counting up
        animateCounter('totalOrders', orders.length || dashboardData.total_orders || 0);
        animateCounter('totalPayments', payments.length || dashboardData.total_payments || 0);
        animateCounter('pendingOrders', pendingOrders.length || dashboardData.pending_orders || 0);
        animateCounter('completedPayments', completedOrders.length || dashboardData.completed_payments || 0);

        // Quick stats
        document.getElementById('totalRevenue').textContent = revenue.toFixed(2);
        document.getElementById('totalCustomers').textContent = uniqueCustomers;

        // Load recent orders
        await loadRecentOrders();

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load dashboard data. Error: ' + error.message);
    }
}

// Animate counter
function animateCounter(elementId, target) {
    const element = document.getElementById(elementId);
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 16);
}

// Enhanced recent orders loading
async function loadRecentOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const orders = await response.json();
        console.log('Recent orders:', orders);

        const recentOrders = orders.slice(-5).reverse();
        const container = document.getElementById('recentOrders');

        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="activity-item">
                    <div class="activity-info">
                        <h4>No orders found</h4>
                        <p>There are no recent orders to display</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = recentOrders.map(order => `
            <div class="activity-item">
                <div class="activity-info">
                    <h4>${order.customer_name}</h4>
                    <p>${order.bundle ? order.bundle.name : 'N/A'} • ${getOrderRecipient(order)}</p>
                </div>
                <div class="activity-status">
                    <span class="status-badge status-${order.status}">${order.status}</span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading recent orders:', error);
        document.getElementById('recentOrders').innerHTML = `
            <div class="activity-item">
                <div class="activity-info">
                    <h4>Error loading orders</h4>
                    <p>Please try again later</p>
                </div>
            </div>
        `;
    }
}

// Enhanced bundles loading
async function loadBundles() {
    try {
        console.log('Loading bundles...');
        const response = await fetch(`${API_BASE_URL}/bundles/`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const bundles = await response.json();
        console.log('Bundles loaded:', bundles);
        cachedBundles = bundles;

        const tableBody = document.getElementById('bundlesTable');

        if (!bundles || bundles.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 3rem;">
                        <div style="text-align: center; color: var(--text-light);">
                            <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                            <h3 style="margin-bottom: 0.5rem;">No bundles found</h3>
                            <p style="margin-bottom: 1.5rem;">Get started by adding your first bundle</p>
                            <button onclick="openAddBundleModal()" class="btn btn-gradient">
                                <i class="fas fa-plus"></i> Add First Bundle
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = bundles.map(bundle => `
            <tr>
                <td data-label="ID"><strong>#${bundle.id}</strong></td>
                <td data-label="Name">
                    <div class="bundle-info">
                        <div class="bundle-name">${bundle.name}</div>
                        <div class="bundle-meta">${bundle.network}</div>
                    </div>
                </td>
                <td data-label="Size"><span class="bundle-size">${bundle.size}</span></td>
                <td data-label="Price"><strong>${formatCurrency(bundle.price)}</strong></td>
                <td data-label="Network">
                    <span class="network-badge">${bundle.network}</span>
                </td>
                <td data-label="Status">
                    <span class="status-badge status-completed">Active</span>
                </td>
                <td data-label="Actions">
                    <div class="action-buttons">
                        <button class="btn btn-outline btn-sm" onclick="openEditBundleModalById(${bundle.id})" title="Edit Bundle">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteBundle(${bundle.id})" title="Delete Bundle">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading bundles:', error);
        showError('Failed to load bundles. Error: ' + error.message);
    }
}

// Enhanced orders loading
async function loadOrders() {
    try {
        console.log('Loading orders...');
        const response = await fetch(`${API_BASE_URL}/orders/`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const orders = await response.json();
        console.log('Orders loaded:', orders);

        const activeTableBody = document.getElementById('ordersTable');
        const completedTableBody = document.getElementById('completedOrdersTable');

        if (!orders || orders.length === 0) {
            activeTableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 3rem;">
                        <div style="text-align: center; color: var(--text-light);">
                            <i class="fas fa-shopping-cart" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                            <h3 style="margin-bottom: 0.5rem;">No orders found</h3>
                            <p>Customer orders will appear here</p>
                        </div>
                    </td>
                </tr>
            `;
            completedTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-light);">
                        No completed orders yet.
                    </td>
                </tr>
            `;
            document.getElementById('activeOrderCount').textContent = '0';
            document.getElementById('completedOrderCount').textContent = '0';
            return;
        }

        const sortedOrders = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const activeOrders = sortedOrders.filter(order => order.status !== 'completed');
        const completedOrders = sortedOrders.filter(order => order.status === 'completed');

        document.getElementById('activeOrderCount').textContent = `${activeOrders.length}`;
        document.getElementById('completedOrderCount').textContent = `${completedOrders.length}`;

        activeTableBody.innerHTML = activeOrders.length ? activeOrders.map(order => `
            <tr>
                <td data-label="ID"><strong>#${order.id}</strong></td>
                <td data-label="Customer">
                    <div class="customer-info">
                        <div class="customer-name">${order.customer_name}</div>
                    </div>
                </td>
                <td data-label="Send To">${getOrderRecipient(order)}</td>
                <td data-label="Paying No.">${getOrderPayer(order)}</td>
                <td data-label="Bundle">${order.bundle ? `${order.bundle.name} (${order.bundle.size || ''})` : 'N/A'}</td>
                <td data-label="Amount"><strong>${formatCurrency(getOrderAmount(order))}</strong></td>
                <td data-label="Status">
                    <span class="status-badge status-${order.status}">${order.status}</span>
                </td>
                <td data-label="Date">${formatDateTime(order.created_at)}</td>
                <td data-label="Actions">
                    <div class="action-buttons">
                        <button class="btn btn-success btn-sm" onclick="updateOrderStatus(${order.id}, 'completed')" title="Complete Order">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="updateOrderStatus(${order.id}, 'processing')" title="Mark Processing">
                            <i class="fas fa-spinner"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('') : `
            <tr>
                <td colspan="9" style="text-align:center; padding: 2rem; color: var(--text-light);">
                    No active orders in queue.
                </td>
            </tr>
        `;

        completedTableBody.innerHTML = completedOrders.length ? completedOrders.map(order => `
            <tr>
                <td data-label="ID"><strong>#${order.id}</strong></td>
                <td data-label="Customer">${order.customer_name}</td>
                <td data-label="Send To">${getOrderRecipient(order)}</td>
                <td data-label="Bundle">${order.bundle ? `${order.bundle.name} (${order.bundle.size || ''})` : 'N/A'}</td>
                <td data-label="Amount"><strong>${formatCurrency(getOrderAmount(order))}</strong></td>
                <td data-label="Status"><span class="status-badge status-completed">completed</span></td>
                <td data-label="Completed On">${formatDateTime(order.created_at)}</td>
                <td data-label="Actions">
                    <div class="action-buttons">
                        <button class="btn btn-outline btn-sm" onclick="updateOrderStatus(${order.id}, 'pending')" title="Move back to queue">
                            <i class="fas fa-undo"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('') : `
            <tr>
                <td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-light);">
                    No completed orders yet.
                </td>
            </tr>
        `;

    } catch (error) {
        console.error('Error loading orders:', error);
        showError('Failed to load orders. Error: ' + error.message);
    }
}

// Enhanced payments loading
async function loadPayments() {
    try {
        console.log('Loading payments...');
        const response = await fetch(`${API_BASE_URL}/payments/`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const payments = await response.json();
        console.log('Payments loaded:', payments);

        const tableBody = document.getElementById('paymentsTable');

        if (!payments || payments.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 3rem;">
                        <div style="text-align: center; color: var(--text-light);">
                            <i class="fas fa-credit-card" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                            <h3 style="margin-bottom: 0.5rem;">No payments found</h3>
                            <p>Payment transactions will appear here</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = payments.map(payment => `
            <tr>
                <td data-label="ID"><strong>#${payment.id}</strong></td>
                <td data-label="Order ID"><strong>#${payment.order_id}</strong></td>
                <td data-label="Amount"><strong>${formatCurrency(payment.amount)}</strong></td>
                <td data-label="Method">
                    <span class="payment-method">${payment.method}</span>
                </td>
                <td data-label="Status">
                    <span class="status-badge status-${payment.status}">${payment.status}</span>
                </td>
                <td data-label="Date">${formatDateTime(payment.created_at)}</td>
                <td data-label="Actions">
                    <div class="action-buttons">
                        <button class="btn btn-success btn-sm" onclick="updatePaymentStatus(${payment.id}, 'paid')" title="Mark as Paid">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading payments:', error);
        showError('Failed to load payments. Error: ' + error.message);
    }
}

// Enhanced populate bundles
async function populateBundles() {
    try {
        const button = event.target;
        const originalText = button.innerHTML;

        // Show loading state
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Populating...';
        button.disabled = true;

        console.log('Populating MTN bundles...');
        const response = await fetch(`${API_BASE_URL}/admin/populate-bundles`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Populate result:', result);

        showSuccess(result.message || 'Bundles populated successfully!');

        // Reload bundles if on bundles tab
        if (currentTab === 'bundles') {
            loadBundles();
        }

    } catch (error) {
        console.error('Error populating bundles:', error);
        showError('Failed to populate bundles. Error: ' + error.message);
    } finally {
        // Restore button state
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Enhanced modal functions
function openAddBundleModal() {
    document.getElementById('addBundleModal').style.display = 'block';
}

function closeAddBundleModal() {
    document.getElementById('addBundleModal').style.display = 'none';
    document.getElementById('addBundleForm').reset();
}

function closeEditBundleModal() {
    const modal = document.getElementById('editBundleModal');
    const form = document.getElementById('editBundleForm');
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
}

function openEditBundleModalById(bundleId) {
    const bundle = cachedBundles.find(item => item.id === bundleId);
    if (!bundle) {
        showError('Bundle not found for editing.');
        return;
    }

    document.getElementById('editBundleId').value = bundle.id;
    document.getElementById('editBundleName').value = bundle.name || '';
    document.getElementById('editBundleSize').value = bundle.size || '';
    document.getElementById('editBundlePrice').value = Number(bundle.price || 0).toFixed(2);
    document.getElementById('editBundleNetwork').value = bundle.network || 'MTN';

    document.getElementById('editBundleModal').style.display = 'block';
}

async function handleEditBundle(e) {
    e.preventDefault();

    const bundleId = parseInt(document.getElementById('editBundleId').value);
    const payload = {
        name: document.getElementById('editBundleName').value.trim(),
        size: document.getElementById('editBundleSize').value.trim(),
        price: parseFloat(document.getElementById('editBundlePrice').value),
        network: document.getElementById('editBundleNetwork').value
    };

    if (!bundleId || !payload.name || !payload.size || !payload.network || Number.isNaN(payload.price)) {
        showError('Please provide valid bundle details.');
        return;
    }

    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;

    try {
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitButton.disabled = true;

        const response = await fetch(`${API_BASE_URL}/bundles/${bundleId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        closeEditBundleModal();
        showSuccess('Bundle updated successfully.');
        await loadBundles();
    } catch (error) {
        console.error('Error updating bundle:', error);
        showError('Failed to update bundle. Error: ' + error.message);
    } finally {
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    }
}

// Enhanced add bundle form submission
async function handleAddBundle(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('bundleName').value,
        size: document.getElementById('bundleSize').value,
        price: parseFloat(document.getElementById('bundlePrice').value),
        network: document.getElementById('bundleNetwork').value
    };

    // Validation
    if (!formData.name || !formData.size || !formData.price || !formData.network) {
        showError('Please fill in all fields.');
        return;
    }

    try {
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;

        // Show loading state
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        submitButton.disabled = true;

        console.log('Adding bundle:', formData);
        const response = await fetch(`${API_BASE_URL}/bundles/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        closeAddBundleModal();
        loadBundles();
        showSuccess('Bundle added successfully!');

    } catch (error) {
        console.error('Error adding bundle:', error);
        showError('Failed to add bundle. Error: ' + error.message);
    } finally {
        // Restore button state in case of error
        const submitButton = e.target.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.innerHTML = '<i class="fas fa-plus"></i> Add Bundle';
            submitButton.disabled = false;
        }
    }
}

// Enhanced delete bundle with confirmation
async function deleteBundle(bundleId) {
    if (!confirm('Are you sure you want to delete this bundle? This action cannot be undone.')) {
        return;
    }

    try {
        console.log('Deleting bundle:', bundleId);
        const response = await fetch(`${API_BASE_URL}/bundles/${bundleId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        loadBundles();
        showSuccess('Bundle deleted successfully!');

    } catch (error) {
        console.error('Error deleting bundle:', error);
        showError('Failed to delete bundle. Error: ' + error.message);
    }
}

// Enhanced order status update
async function updateOrderStatus(orderId, status) {
    try {
        console.log('Updating order status:', orderId, status);
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status?status=${status}`, {
            method: 'PUT'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        loadOrders();
        loadDashboard();
        showSuccess('Order status updated successfully!');

    } catch (error) {
        console.error('Error updating order status:', error);
        showError('Failed to update order status. Error: ' + error.message);
    }
}

// Enhanced payment status update
async function updatePaymentStatus(paymentId, status) {
    try {
        console.log('Updating payment status:', paymentId, status);
        const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/status?status=${status}`, {
            method: 'PUT'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        loadPayments();
        showSuccess('Payment status updated successfully!');

    } catch (error) {
        console.error('Error updating payment status:', error);
        showError('Failed to update payment status. Error: ' + error.message);
    }
}

// Enhanced notification functions
function showError(message) {
    showNotification(message, 'error');
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification-toast').forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = `notification-toast notification-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#6366f1'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: var(--shadow-xl);
        z-index: 10000;
        max-width: 400px;
        transform: translateX(400px);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-left: 4px solid ${type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : '#4f46e5'};
        backdrop-filter: blur(10px);
    `;
    toast.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}" 
               style="font-size: 1.2rem; margin-top: 2px;"></i>
            <div>
                <div style="font-weight: 600; margin-bottom: 0.25rem;">
                    ${type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info'}
                </div>
                <div style="font-size: 0.9rem; opacity: 0.9;">${message}</div>
            </div>
        </div>
    `;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 5 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 5000);
}

// Close modal when clicking outside
window.addEventListener('click', function (event) {
    const addModal = document.getElementById('addBundleModal');
    const editModal = document.getElementById('editBundleModal');
    if (event.target === addModal || event.target.classList.contains('modal-backdrop')) {
        closeAddBundleModal();
    }
    if (event.target === editModal || event.target.classList.contains('modal-backdrop')) {
        closeEditBundleModal();
    }
});

// Enhanced API connection test
async function testConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            console.log('✅ Admin: Backend connection successful');
        } else {
            console.warn('⚠️ Admin: Backend connection issue');
        }
    } catch (error) {
        console.error('❌ Admin: Backend connection failed:', error);
    }
}

// Test connection when page loads
testConnection();

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC key closes modals
    if (e.key === 'Escape') {
        closeAddBundleModal();
        closeEditBundleModal();
    }

    // Ctrl/Cmd + K focuses search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) {
            searchInput.focus();
        }
    }
});