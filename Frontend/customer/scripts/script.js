// API Base URL - Use the same as your backend
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Paystack Public Key - Must match PAYSTACK_PUBLIC_KEY in backend/.env
const PAYSTACK_PUBLIC_KEY = 'pk_test_9102d844d7cc5268089a531de060bb366c593d3b';

// Global variables
let currentOrder = null;
let selectedBundle = null;

function parseBundleSizeToMB(sizeValue) {
    if (!sizeValue) return Number.MAX_SAFE_INTEGER;
    const raw = String(sizeValue).trim().toUpperCase();
    const matched = raw.match(/(\d+(?:\.\d+)?)\s*(MB|GB|TB)/i);
    if (!matched) return Number.MAX_SAFE_INTEGER;

    const numeric = parseFloat(matched[1]);
    const unit = matched[2].toUpperCase();

    if (Number.isNaN(numeric)) return Number.MAX_SAFE_INTEGER;
    if (unit === 'MB') return numeric;
    if (unit === 'GB') return numeric * 1024;
    if (unit === 'TB') return numeric * 1024 * 1024;
    return Number.MAX_SAFE_INTEGER;
}

function sortBundlesBySizeAsc(bundles) {
    return [...(bundles || [])].sort((a, b) => {
        const sizeA = parseBundleSizeToMB(a.size);
        const sizeB = parseBundleSizeToMB(b.size);

        if (sizeA !== sizeB) return sizeA - sizeB;

        const nameA = String(a.name || '');
        const nameB = String(b.name || '');
        const byName = nameA.localeCompare(nameB);
        if (byName !== 0) return byName;

        return Number(a.id || 0) - Number(b.id || 0);
    });
}

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

// Copy recipient phone to payer phone
function copyRecipientPhone() {
    const recipientPhone = document.getElementById('recipientPhone');
    const payerPhone = document.getElementById('payerPhone');
    const checkbox = document.getElementById('sameAsRecipient');
    
    if (checkbox.checked) {
        payerPhone.value = recipientPhone.value;
        payerPhone.readOnly = true;
        payerPhone.style.backgroundColor = '#f3f4f6';
    } else {
        payerPhone.readOnly = false;
        payerPhone.style.backgroundColor = '';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', closeModals);
    });

    // Order form submission
    document.getElementById('orderForm').addEventListener('submit', handleOrderSubmit);

    // Success modal close
    document.getElementById('closeSuccess').addEventListener('click', closeModals);

    // Sync recipient phone to payer phone when checkbox is checked
    document.getElementById('recipientPhone').addEventListener('input', function() {
        const checkbox = document.getElementById('sameAsRecipient');
        if (checkbox.checked) {
            document.getElementById('payerPhone').value = this.value;
        }
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

// Error utilities: log technical details, show clean messages to users
function logClientError(context, error) {
    const reference = `ERR-${Date.now().toString(36).toUpperCase()}`;
    console.error(`[${reference}] ${context}`, error);
    return reference;
}

function getFriendlyErrorMessage(error, fallbackMessage = 'Something went wrong. Please try again.') {
    const message = (error?.message || '').toLowerCase();

    if (message.includes('failed to fetch') || message.includes('networkerror')) {
        return 'Network issue detected. Please check your internet connection and try again.';
    }

    if (message.includes('nameresolution') || message.includes('getaddrinfo') || message.includes('api.paystack.co')) {
        return 'Payment service is temporarily unreachable. Please try again in a moment.';
    }

    if (message.includes('access_code') || message.includes('paystack')) {
        return 'Could not start payment right now. Please try again.';
    }

    if (message.includes('timeout')) {
        return 'Request timed out. Please try again.';
    }

    return fallbackMessage;
}

async function parseApiError(response, fallbackMessage) {
    try {
        const errorData = await response.json();
        const detail = typeof errorData?.detail === 'string' ? errorData.detail : '';

        if (response.status === 404) {
            return { technical: detail || 'Resource not found', user: 'Requested item was not found.' };
        }

        if (response.status === 400) {
            return { technical: detail || 'Bad request', user: 'Please check your input and try again.' };
        }

        if (response.status >= 500) {
            return {
                technical: detail || `Server error (${response.status})`,
                user: getFriendlyErrorMessage(new Error(detail || ''), fallbackMessage)
            };
        }

        return {
            technical: detail || `HTTP error ${response.status}`,
            user: fallbackMessage
        };
    } catch {
        return {
            technical: `HTTP error ${response.status}`,
            user: fallbackMessage
        };
    }
}

function showCleanError(context, error, fallbackMessage) {
    const ref = logClientError(context, error);
    const friendly = getFriendlyErrorMessage(error, fallbackMessage);
    showError(`${friendly} (Ref: ${ref})`);
}

// Load bundles from API
async function loadBundles() {
    try {
        console.log('Loading bundles from:', `${API_BASE_URL}/bundles/`);
        const response = await fetch(`${API_BASE_URL}/bundles/`);

        if (!response.ok) {
            const parsed = await parseApiError(response, 'Failed to load bundles. Please try again.');
            throw new Error(parsed.technical);
        }

        const bundles = await response.json();
        const sortedBundles = sortBundlesBySizeAsc(bundles);
        console.log('Loaded bundles (sorted by size):', sortedBundles);

        displayBundles(sortedBundles);
    } catch (error) {
        showCleanError('Loading bundles failed', error, 'Failed to load bundles. Please try again.');
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
        <div class="bundle-card" onclick="openOrderModal(${bundle.id})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openOrderModal(${bundle.id});}" role="button" tabindex="0" aria-label="Buy ${bundle.name}">
            <div class="bundle-card-top">
                <div class="bundle-network-pill">MTN</div>
                <div class="bundle-more-icon">
                    <i class="fas fa-angle-down"></i>
                </div>
            </div>
            <div class="bundle-size">${bundle.size}</div>
            <div class="bundle-name">${bundle.network || 'MTN'} Bundle</div>
            <div class="bundle-card-bottom">
                <div class="bundle-price">₵${bundle.price.toFixed(2)}</div>
                <div class="bundle-non-expiry">No Expiry</div>
            </div>
            <div class="bundle-card-strip"></div>
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
            const parsed = await parseApiError(response, 'Could not load bundle details. Please try again.');
            throw new Error(parsed.technical);
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
        openModalById('orderModal');
    } catch (error) {
        hideModalLoading('orderModal');
        showCleanError('Loading bundle details failed', error, 'Could not load bundle details. Please try again.');
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
        submitBtn.innerHTML = '<i class="fas fa-credit-card"></i><span>Proceed to Pay</span>';
        submitBtn.disabled = false;
    }
}

function openModalById(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.style.display = 'block';

    const backdrop = modal.querySelector('.modal-backdrop');
    const content = modal.querySelector('.modal-content');

    if (backdrop) {
        backdrop.style.animation = 'none';
        void backdrop.offsetHeight;
        backdrop.style.animation = 'fadeIn 0.24s ease-out';
    }

    if (content) {
        content.style.animation = 'none';
        void content.offsetHeight;
        content.style.animation = 'modalSlideIn 0.24s cubic-bezier(0.4, 0, 0.2, 1)';
    }
}

function closeModalById(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'none';
}

// Show processing modal
function showProcessingModal() {
    openModalById('processingModal');
}

// Hide processing modal
function hideProcessingModal() {
    closeModalById('processingModal');
}

// Enhanced order form submission with Paystack integration
async function handleOrderSubmit(e) {
    e.preventDefault();

    const customerName = document.getElementById('customerName').value.trim();
    const recipientPhone = document.getElementById('recipientPhone').value.trim();
    const payerPhone = document.getElementById('payerPhone').value.trim();
    const email = document.getElementById('customerEmail').value.trim();

    // Enhanced validation
    if (!customerName || !recipientPhone || !payerPhone) {
        showError('Please fill in all required fields.');
        return;
    }

    // Validate phone numbers (Ghanaian format)
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(recipientPhone)) {
        showError('Please enter a valid phone number to receive bundle (e.g., 0241234567).');
        return;
    }
    if (!phoneRegex.test(payerPhone)) {
        showError('Please enter a valid phone number for payment (e.g., 0551234567).');
        return;
    }

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('Please enter a valid email address.');
        return;
    }

    const paymentData = {
        bundle_id: parseInt(document.getElementById('selectedBundleId').value),
        customer_name: customerName,
        recipient_phone: recipientPhone,
        payer_phone: payerPhone,
        email: email || null
    };

    try {
        showModalLoading('orderModal');
        closeModalById('orderModal');
        showProcessingModal();

        console.log('Initializing payment:', paymentData);
        
        // Call the initialize payment endpoint
        const response = await fetch(`${API_BASE_URL}/payments/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentData)
        });

        if (!response.ok) {
            const parsed = await parseApiError(response, 'Unable to start payment. Please try again.');
            throw new Error(parsed.technical);
        }

        const result = await response.json();
        console.log('Payment initialized:', result);

        // Store order info for success page
        currentOrder = {
            id: result.order_id,
            payment_reference: result.payment_reference,
            recipient_phone: recipientPhone,
            payer_phone: payerPhone,
            customer_name: customerName,
            email: email || null
        };

        hideProcessingModal();

        // Open Paystack Popup
        openPaystackPopup({
            access_code: result.access_code,
            reference: result.payment_reference,
            authorization_url: result.authorization_url
        });

    } catch (error) {
        hideProcessingModal();
        hideModalLoading('orderModal');
        openModalById('orderModal');
        showCleanError('Payment initialization failed', error, 'Unable to start payment. Please try again.');
    }
}

// Open Paystack Popup for payment
function openPaystackPopup(paystackData) {
    if (!paystackData || !paystackData.access_code) {
        throw new Error('Missing Paystack access code from initialize response');
    }

    const popup = new PaystackPop();
    
    popup.resumeTransaction(paystackData.access_code, {
        onSuccess: function(transaction) {
            console.log('Payment successful:', transaction);
            verifyPayment(paystackData.reference);
        },
        onCancel: function() {
            console.log('Payment cancelled');
            showError('Payment was cancelled. Please try again.');
            // Show order modal again so they can retry
            openModalById('orderModal');
        },
        onError: function(error) {
            console.error('Paystack error:', error);
            showError('Payment failed. Please try again.');
            openModalById('orderModal');
        }
    });
}

// Verify payment after Paystack popup closes
async function verifyPayment(reference) {
    showProcessingModal();
    
    try {
        const response = await fetch(`${API_BASE_URL}/payments/verify/${reference}`);
        
        if (!response.ok) {
            const parsed = await parseApiError(response, 'Could not verify payment at the moment.');
            throw new Error(parsed.technical);
        }
        
        const result = await response.json();
        console.log('Payment verification:', result);
        
        hideProcessingModal();
        
        if (result.status === 'success' || result.status === 'paid') {
            // Show success modal with order details
            showSuccessModal(result);
        } else {
            showError('Payment verification failed. Please contact support with reference: ' + reference);
        }
        
    } catch (error) {
        hideProcessingModal();
        showCleanError('Payment verification failed', error, `Could not verify payment. Please contact support with reference: ${reference}`);
    }
}

// Show success modal with order details
function showSuccessModal(paymentResult) {
    const orderDetails = document.getElementById('orderDetails');
    
    if (currentOrder && selectedBundle) {
        orderDetails.innerHTML = `
            <p><strong>Reference:</strong> ${paymentResult.payment_reference || currentOrder.payment_reference}</p>
            <p><strong>Bundle:</strong> ${selectedBundle.name} (${selectedBundle.size})</p>
            <p><strong>Amount:</strong> GHS ${selectedBundle.price.toFixed(2)}</p>
            <p><strong>Recipient:</strong> ${currentOrder.recipient_phone}</p>
        `;
    }
    
    openModalById('successModal');
    
    // Reset form
    document.getElementById('orderForm').reset();
    document.getElementById('sameAsRecipient').checked = false;
    
    // Reset global variables
    currentOrder = null;
    selectedBundle = null;
    
    // Reload bundles
    setTimeout(() => {
        loadBundles();
    }, 1000);
}

// Enhanced close modals
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        closeModalById(modal.id);
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
            closeModalById(modal.id);
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