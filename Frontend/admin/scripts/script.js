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
    // Set up tab navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const tab = this.getAttribute('data-tab');
            switchTab(tab);
        });
    });
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
}

// Load dashboard data
async function loadDashboard() {
    try {
        console.log('Loading dashboard data...');
        const response = await fetch(`${API_BASE_URL}/admin/dashboard`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Dashboard data:', data);

        // Update stats
        document.getElementById('totalOrders').textContent = data.total_orders;
        document.getElementById('totalPayments').textContent = data.total_payments;
        document.getElementById('pendingOrders').textContent = data.pending_orders;
        document.getElementById('completedPayments').textContent = data.completed_payments;

        // Load recent orders
        await loadRecentOrders();

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load dashboard data. Error: ' + error.message);
    }
}

// Load recent orders
async function loadRecentOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const orders = await response.json();
        console.log('Recent orders:', orders);

        const recentOrders = orders.slice(-5).reverse(); // Get latest 5 orders
        const container = document.getElementById('recentOrders');

        if (!orders || orders.length === 0) {
            container.innerHTML = '<p>No orders found</p>';
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
        document.getElementById('recentOrders').innerHTML = '<p>Error loading orders</p>';
    }
}

// Load bundles for management
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
                    <td colspan="6" style="text-align: center; padding: 2rem;">
                        No bundles found. <button onclick="populateBundles()" class="btn btn-primary">Populate MTN Bundles</button>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = bundles.map(bundle => `
            <tr>
                <td>${bundle.id}</td>
                <td>${bundle.name}</td>
                <td>${bundle.size}</td>
                <td>${bundle.price.toFixed(2)}</td>
                <td>${bundle.network}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteBundle(${bundle.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading bundles:', error);
        showError('Failed to load bundles. Error: ' + error.message);
    }
}

// Load orders for management
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
                    <td colspan="7" style="text-align: center; padding: 2rem;">No orders found</td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = orders.map(order => `
            <tr>
                <td>${order.id}</td>
                <td>${order.customer_name}</td>
                <td>${order.phone_number}</td>
                <td>${order.bundle ? order.bundle.name : 'N/A'}</td>
                <td>
                    <span class="status-badge status-${order.status}">${order.status}</span>
                </td>
                <td>${new Date(order.created_at).toLocaleString()}</td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="updateOrderStatus(${order.id}, 'completed')">
                        <i class="fas fa-check"></i> Complete
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading orders:', error);
        showError('Failed to load orders. Error: ' + error.message);
    }
}

// Load payments for management
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
                    <td colspan="7" style="text-align: center; padding: 2rem;">No payments found</td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = payments.map(payment => `
            <tr>
                <td>${payment.id}</td>
                <td>${payment.order_id}</td>
                <td>${payment.amount.toFixed(2)}</td>
                <td>${payment.method}</td>
                <td>
                    <span class="status-badge status-${payment.status}">${payment.status}</span>
                </td>
                <td>${new Date(payment.created_at).toLocaleString()}</td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="updatePaymentStatus(${payment.id}, 'paid')">
                        <i class="fas fa-check"></i> Mark Paid
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading payments:', error);
        showError('Failed to load payments. Error: ' + error.message);
    }
}

// Populate bundles with MTN data
async function populateBundles() {
    try {
        console.log('Populating MTN bundles...');
        const response = await fetch(`${API_BASE_URL}/admin/populate-bundles`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Populate result:', result);
        alert(result.message);

        // Reload bundles if on bundles tab
        if (currentTab === 'bundles') {
            loadBundles();
        }

    } catch (error) {
        console.error('Error populating bundles:', error);
        showError('Failed to populate bundles. Error: ' + error.message);
    }
}

// Open add bundle modal
function openAddBundleModal() {
    document.getElementById('addBundleModal').style.display = 'block';
}

// Handle add bundle form submission
async function handleAddBundle(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('bundleName').value,
        size: document.getElementById('bundleSize').value,
        price: parseFloat(document.getElementById('bundlePrice').value),
        network: document.getElementById('bundleNetwork').value
    };

    try {
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

        document.getElementById('addBundleModal').style.display = 'none';
        document.getElementById('addBundleForm').reset();
        loadBundles();
        showSuccess('Bundle added successfully!');

    } catch (error) {
        console.error('Error adding bundle:', error);
        showError('Failed to add bundle. Error: ' + error.message);
    }
}

// Delete bundle
async function deleteBundle(bundleId) {
    if (!confirm('Are you sure you want to delete this bundle?')) {
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

// Update order status
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

// Update payment status
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

// Utility functions
function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    alert('Success: ' + message);
}

// Close modal when clicking outside
window.addEventListener('click', function (event) {
    const modal = document.getElementById('addBundleModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Test API connection
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