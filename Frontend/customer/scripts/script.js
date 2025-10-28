// API Base URL - Use the same as your backend
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Global variables
let currentOrder = null;
let selectedBundle = null;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function () {
    console.log('Customer portal loaded');
    initializeApp();
});

// Initialize the application
async function initializeApp() {
    showLoadingScreen();
    await setupEventListeners();
    await loadBundles();
    hideLoadingScreen();
    initializeAnimations();
}

// Enhanced loading screen with progress animation
function showLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.style.display = 'flex';

    // Simulate progress
    const progressFill = document.querySelector('.progress-fill');
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
            progress = 100;
            clearInterval(progressInterval);
        }
        progressFill.style.transform = `scaleX(${progress / 100})`;
    }, 200);
}

// Enhanced hide loading screen
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        loadingScreen.classList.remove('fade-out');
    }, 500);
}

// Setup event listeners
function setupEventListeners() {
    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', closeModals);
    });

    // Order form submission
    document.getElementById('orderForm').addEventListener('submit', handleOrderSubmit);

    // Payment confirmation
    document.getElementById('confirmPayment').addEventListener('click', handlePayment);

    // Success modal close
    document.getElementById('closeSuccess').addEventListener('click', closeModals);

    // Payment method selection
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', function () {
            document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Header scroll effect
    window.addEventListener('scroll', handleHeaderScroll);

    // Mobile menu
    const mobileMenu = document.querySelector('.mobile-menu');
    if (mobileMenu) {
        mobileMenu.addEventListener('click', toggleMobileMenu);
    }
}

// Enhanced animations with intersection observer
function initializeAnimations() {
    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';

                // Animate counting numbers
                if (entry.target.classList.contains('stat-number')) {
                    animateCountUp(entry.target);
                }
            }
        });
    }, observerOptions);

    // Observe animated elements
    document.querySelectorAll('.bundle-card, .step, .hero-content, .hero-visual, .section-header').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Observe stats for counting animation
    document.querySelectorAll('.stat-number').forEach(stat => {
        observer.observe(stat);
    });
}

// Animate counting numbers
function animateCountUp(element) {
    const target = parseInt(element.getAttribute('data-count'));
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current) + (element.getAttribute('data-count') === '99' ? '%' : '+');
    }, 16);
}

// Handle header scroll effect
function handleHeaderScroll() {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
}

// Toggle mobile menu
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
    navLinks.classList.toggle('active');
}

// Load bundles from API
async function loadBundles() {
    try {
        console.log('Loading bundles from:', `${API_BASE_URL}/bundles/`);
        const response = await fetch(`${API_BASE_URL}/bundles/`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const bundles = await response.json();
        console.log('Loaded bundles:', bundles);

        displayBundles(bundles);
    } catch (error) {
        console.error('Error loading bundles:', error);
        showError('Failed to load bundles. Please try again. Error: ' + error.message);
    }
}

// Enhanced display bundles with non-expiry badge
function displayBundles(bundles) {
    const bundlesGrid = document.getElementById('bundlesGrid');

    if (!bundles || bundles.length === 0) {
        bundlesGrid.innerHTML = `
            <div class="no-bundles" style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
                <i class="fas fa-box-open" style="font-size: 4rem; color: var(--text-lighter); margin-bottom: 1rem;"></i>
                <h3 style="color: var(--text); margin-bottom: 1rem;">No bundles available</h3>
                <p style="color: var(--text-light);">Please check back later or contact support.</p>
            </div>
        `;
        return;
    }

    bundlesGrid.innerHTML = bundles.map(bundle => `
        <div class="bundle-card">
            <div class="bundle-size">${bundle.size}</div>
            <div class="bundle-name">${bundle.name}</div>
            <div class="bundle-price">${bundle.price.toFixed(2)}</div>
            <div class="bundle-non-expiry">
                <i class="fas fa-infinity"></i>
                Non-Expiry
            </div>
            <button class="buy-btn" onclick="openOrderModal(${bundle.id})">
                <i class="fas fa-shopping-cart"></i> Buy Now
            </button>
        </div>
    `).join('');
}

// Enhanced open order modal with animation
async function openOrderModal(bundleId) {
    try {
        showModalLoading('orderModal');

        console.log('Loading bundle details for ID:', bundleId);
        const response = await fetch(`${API_BASE_URL}/bundles/${bundleId}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        selectedBundle = await response.json();
        console.log('Selected bundle:', selectedBundle);

        document.getElementById('selectedBundleId').value = bundleId;
        document.getElementById('bundleSummary').innerHTML = `
            <div><strong>Bundle:</strong> ${selectedBundle.name}</div>
            <div><strong>Size:</strong> ${selectedBundle.size}</div>
            <div><strong>Price:</strong> GHS ${selectedBundle.price.toFixed(2)}</div>
            <div><strong>Feature:</strong> <span style="color: var(--secondary); font-weight: 600;">Non-Expiry</span></div>
        `;

        hideModalLoading('orderModal');
        document.getElementById('orderModal').style.display = 'block';

        // Add entrance animation
        const modal = document.getElementById('orderModal');
        modal.style.animation = 'modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    } catch (error) {
        console.error('Error loading bundle details:', error);
        hideModalLoading('orderModal');
        showError('Failed to load bundle details. Error: ' + error.message);
    }
}

// Enhanced modal loading states
function showModalLoading(modalId) {
    const modal = document.getElementById(modalId);
    const submitBtn = modal.querySelector('button[type="submit"], .payment-btn');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        submitBtn.disabled = true;
    }
}

function hideModalLoading(modalId) {
    const modal = document.getElementById(modalId);
    const submitBtn = modal.querySelector('button[type="submit"], .payment-btn');
    if (submitBtn && modalId === 'orderModal') {
        submitBtn.innerHTML = '<i class="fas fa-shopping-cart"></i><span>Place Order</span>';
        submitBtn.disabled = false;
    } else if (submitBtn && modalId === 'paymentModal') {
        submitBtn.innerHTML = '<i class="fas fa-lock"></i><span>Pay with MoMo</span>';
        submitBtn.disabled = false;
    }
}

// Enhanced order form submission
async function handleOrderSubmit(e) {
    e.preventDefault();

    const formData = {
        bundle_id: parseInt(document.getElementById('selectedBundleId').value),
        customer_name: document.getElementById('customerName').value,
        phone_number: document.getElementById('phoneNumber').value
    };

    // Enhanced validation
    if (!formData.customer_name || !formData.phone_number) {
        showError('Please fill in all fields.');
        return;
    }

    if (!/^0\d{9}$/.test(formData.phone_number)) {
        showError('Please enter a valid Ghanaian phone number (e.g., 0241234567).');
        return;
    }

    try {
        showModalLoading('orderModal');

        console.log('Creating order:', formData);
        const response = await fetch(`${API_BASE_URL}/orders/`, {
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

        currentOrder = await response.json();
        console.log('Order created:', currentOrder);

        document.getElementById('orderModal').style.display = 'none';
        openPaymentModal();

    } catch (error) {
        console.error('Error creating order:', error);
        hideModalLoading('orderModal');
        showError('Failed to create order. Error: ' + error.message);
    }
}

// Enhanced payment modal
function openPaymentModal() {
    if (!currentOrder || !selectedBundle) {
        showError('Order information missing. Please try again.');
        return;
    }

    document.getElementById('paymentSummary').innerHTML = `
        <div><strong>Order ID:</strong> #${currentOrder.id}</div>
        <div><strong>Bundle:</strong> ${selectedBundle.name}</div>
        <div><strong>Size:</strong> ${selectedBundle.size}</div>
        <div><strong>Amount:</strong> GHS ${selectedBundle.price.toFixed(2)}</div>
        <div><strong>Phone:</strong> ${currentOrder.phone_number}</div>
        <div><strong>Feature:</strong> <span style="color: var(--secondary);">Non-Expiry Data</span></div>
    `;

    document.getElementById('paymentModal').style.display = 'block';

    // Add entrance animation
    const modal = document.getElementById('paymentModal');
    modal.style.animation = 'modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
}

// Enhanced payment handling
async function handlePayment() {
    if (!currentOrder || !selectedBundle) {
        showError('Order information missing. Please try again.');
        return;
    }

    const paymentData = {
        order_id: currentOrder.id,
        amount: selectedBundle.price,
        method: 'mtn-momo'
    };

    try {
        showModalLoading('paymentModal');

        console.log('Creating payment:', paymentData);
        // Create payment record
        const response = await fetch(`${API_BASE_URL}/payments/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const payment = await response.json();
        console.log('Payment created:', payment);

        // Update payment status to paid (simulating successful payment)
        console.log('Updating payment status to paid');
        const updateResponse = await fetch(`${API_BASE_URL}/payments/${payment.id}/status?status=paid`, {
            method: 'PUT'
        });

        if (!updateResponse.ok) {
            throw new Error(`Failed to update payment status: ${updateResponse.status}`);
        }

        // Show enhanced success modal
        document.getElementById('paymentModal').style.display = 'none';
        document.getElementById('successModal').style.display = 'block';

        // Reset form
        document.getElementById('orderForm').reset();

        // Reload bundles to reflect any changes
        setTimeout(() => {
            loadBundles();
        }, 1000);

    } catch (error) {
        console.error('Error processing payment:', error);
        hideModalLoading('paymentModal');
        showError('Payment failed. Error: ' + error.message);
    }
}

// Enhanced close modals
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// Enhanced scroll to bundles
function scrollToBundles() {
    document.getElementById('bundles').scrollIntoView({
        behavior: 'smooth'
    });
}

// Enhanced error messages with better animations
function showError(message) {
    // Remove existing toasts
    document.querySelectorAll('.error-toast').forEach(toast => toast.remove());

    // Create error toast
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
        z-index: 10000;
        max-width: 400px;
        transform: translateX(400px);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-left: 4px solid #dc2626;
        backdrop-filter: blur(10px);
    `;
    toast.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
            <i class="fas fa-exclamation-circle" style="font-size: 1.2rem; margin-top: 2px;"></i>
            <div>
                <div style="font-weight: 600; margin-bottom: 0.25rem;">Error</div>
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

// Enhanced modal close when clicking outside
window.addEventListener('click', function (event) {
    document.querySelectorAll('.modal').forEach(modal => {
        if (event.target === modal || event.target.classList.contains('modal-backdrop')) {
            modal.style.display = 'none';
        }
    });
});

// Enhanced API connection test
async function testConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            console.log('✅ Backend connection successful');
        } else {
            console.warn('⚠️ Backend connection issue');
        }
    } catch (error) {
        console.error('❌ Backend connection failed:', error);
    }
}

// Enhanced page load with connection test
window.addEventListener('load', () => {
    testConnection();

    // Add loaded class for any post-load animations
    document.body.classList.add('loaded');
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC key closes modals
    if (e.key === 'Escape') {
        closeModals();
    }
});

// Enhanced mobile touch support
let touchStartY = 0;
let touchEndY = 0;

document.addEventListener('touchstart', e => {
    touchStartY = e.changedTouches[0].screenY;
});

document.addEventListener('touchend', e => {
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
});

function handleSwipe() {
    const swipeDistance = touchEndY - touchStartY;

    // Swipe down to close modals (if swipe is significant)
    if (swipeDistance > 100) {
        closeModals();
    }
}