// API Base URL - Auto-detect environment
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8000/api'           // Local development
  : 'https://datashare-backend-2aiz.onrender.com/api';  // Production

// Auth Token Key
const TOKEN_KEY = 'extradata_admin_token';
const USER_KEY = 'extradata_admin_user';

// ==================== AUTH FUNCTIONS ====================

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    const token = localStorage.getItem(TOKEN_KEY);
    return token !== null && token !== '';
}

/**
 * Get stored token
 */
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get stored username
 */
function getUsername() {
    return localStorage.getItem(USER_KEY);
}

/**
 * Store authentication data
 */
function setAuthData(token, username, remember = false) {
    if (remember) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, username);
    } else {
        // Use sessionStorage for non-persistent login
        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(USER_KEY, username);
        // Also set in localStorage for consistency
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, username);
    }
}

/**
 * Clear authentication data
 */
function clearAuthData() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
    const currentPath = window.location.pathname;
    const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
    window.location.href = basePath + '/login.html';
}

/**
 * Redirect to dashboard
 */
function redirectToDashboard() {
    const currentPath = window.location.pathname;
    const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
    window.location.href = basePath + '/index.html';
}

/**
 * Login function
 */
async function login(username, password, remember = false) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Login failed');
        }

        // Store auth data
        setAuthData(data.access_token, data.username, remember);

        return { success: true, data };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Logout function
 */
async function logout() {
    try {
        const token = getToken();
        if (token) {
            await fetch(`${API_BASE_URL}/admin/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        clearAuthData();
        redirectToLogin();
    }
}

/**
 * Verify token validity
 */
async function verifyToken() {
    const token = getToken();
    if (!token) {
        return false;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/verify-token`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            clearAuthData();
            return false;
        }

        return true;
    } catch (error) {
        console.error('Token verification error:', error);
        clearAuthData();
        return false;
    }
}

/**
 * Get authorization headers for API calls
 */
function getAuthHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * Make authenticated API request
 */
async function authFetch(url, options = {}) {
    const token = getToken();
    
    if (!token) {
        redirectToLogin();
        throw new Error('Not authenticated');
    }

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    const response = await fetch(url, { ...options, headers });

    // If unauthorized, redirect to login
    if (response.status === 401) {
        clearAuthData();
        redirectToLogin();
        throw new Error('Session expired');
    }

    return response;
}

// ==================== LOGIN PAGE SPECIFIC ====================

// Only run on login page
if (document.getElementById('loginForm')) {
    // Check if already logged in
    document.addEventListener('DOMContentLoaded', async function() {
        if (isAuthenticated()) {
            const isValid = await verifyToken();
            if (isValid) {
                redirectToDashboard();
                return;
            }
        }
    });

    // Handle login form submission
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const remember = document.getElementById('rememberMe').checked;
        const loginBtn = document.getElementById('loginBtn');
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');

        // Hide previous error
        errorMessage.classList.remove('show');

        // Show loading state
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;

        // Attempt login
        const result = await login(username, password, remember);

        // Hide loading state
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;

        if (result.success) {
            // Redirect to dashboard
            redirectToDashboard();
        } else {
            // Show error message
            errorText.textContent = result.error || 'Invalid username or password';
            errorMessage.classList.add('show');
            
            // Shake animation
            errorMessage.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                errorMessage.style.animation = '';
            }, 500);
        }
    });
}

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('toggleIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// Add shake animation
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);
