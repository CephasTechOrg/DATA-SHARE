// API Base URL - Use the same as your backend
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Current state
let currentTab = 'dashboard';

// Initialize admin portal
document.addEventListener('DOMContentLoaded', function () {
    console.log('Admin portal loaded');
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

    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function () {
            document.getElementById('addBundleModal').style.display = 'none';
        });
    });

    // Menu toggle for mobile
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }

    // Search functionality
    const searchInputs = ['bundleSearch', 'orderSearch', 'paymentSearch'];
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
    // Reload data with filters
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
    }

    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 1024) {
        toggleSidebar();
    }
}

// Enhanced dashboard loading with animations
async function loadDashboard() {
    try {
        console.log('Loading dashboard data...');
        const response = await fetch(`${API_BASE_URL}/admin/dashboard`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Dashboard data:', data);

        // Animate stats counting up
        animateCounter('totalOrders', data.total_orders || 0);
        animateCounter('totalPayments', data.total_payments || 0);
        animateCounter('pendingOrders', data.pending_orders || 0);
        animateCounter('completedPayments', data.completed_payments || 0);

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
                    <p>${order.bundle ? order.bundle.name : 'N/A'} - ${order.phone_number}</p>
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
                <td><strong>#${bundle.id}</strong></td>
                <td>
                    <div class="bundle-info">
                        <div class="bundle-name">${bundle.name}</div>
                        <div class="bundle-meta">${bundle.network}</div>
                    </div>
                </td>
                <td><span class="bundle-size">${bundle.size}</span></td>
                <td><strong>GHS ${bundle.price.toFixed(2)}</strong></td>
                <td>
                    <span class="network-badge">${bundle.network}</span>
                </td>
                <td>
                    <span class="status-badge status-completed">Active</span>
                </td>
                <td>
                    <div class="action-buttons">
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

        const tableBody = document.getElementById('ordersTable');

        if (!orders || orders.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 3rem;">
                        <div style="text-align: center; color: var(--text-light);">
                            <i class="fas fa-shopping-cart" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                            <h3 style="margin-bottom: 0.5rem;">No orders found</h3>
                            <p>Customer orders will appear here</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = orders.map(order => `
            <tr>
                <td><strong>#${order.id}</strong></td>
                <td>
                    <div class="customer-info">
                        <div class="customer-name">${order.customer_name}</div>
                    </div>
                </td>
                <td>${order.phone_number}</td>
                <td>${order.bundle ? order.bundle.name : 'N/A'}</td>
                <td><strong>GHS ${order.bundle ? order.bundle.price.toFixed(2) : '0.00'}</strong></td>
                <td>
                    <span class="status-badge status-${order.status}">${order.status}</span>
                </td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-success btn-sm" onclick="updateOrderStatus(${order.id}, 'completed')" title="Complete Order">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

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
                <td><strong>#${payment.id}</strong></td>
                <td><strong>#${payment.order_id}</strong></td>
                <td><strong>GHS ${payment.amount.toFixed(2)}</strong></td>
                <td>
                    <span class="payment-method">${payment.method}</span>
                </td>
                <td>
                    <span class="status-badge status-${payment.status}">${payment.status}</span>
                </td>
                <td>${new Date(payment.created_at).toLocaleDateString()}</td>
                <td>
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
            method: 'POST'
        });

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
    const modal = document.getElementById('addBundleModal');
    if (event.target === modal || event.target.classList.contains('modal-backdrop')) {
        closeAddBundleModal();
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