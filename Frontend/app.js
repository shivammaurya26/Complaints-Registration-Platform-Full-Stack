const BACKEND_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:3000'
    : 'https://complaints-registration-platform-full-stack.onrender.com';
const API_URL = `${BACKEND_BASE_URL}/api`;

// --- State Management ---
let currentUser = null;
let currentComplaint = {
    text: '',
    aiQuestion: '',
    aiAnswer: ''
};

// --- DOM Elements ---
const sections = {
    public: document.getElementById('public-section'),
    login: document.getElementById('login-section'),
    adminDashboard: document.getElementById('admin-dashboard')
};

const navbar = document.getElementById('navbar');
const userNameDisplay = document.getElementById('user-name');

// --- Helper Functions ---
function showSection(sectionName) {
    Object.values(sections).forEach(s => {
        if (s) s.classList.add('hidden');
    });
    if (sections[sectionName]) sections[sectionName].classList.remove('hidden');
    
    if (currentUser && currentUser.role === 'admin') {
        navbar.classList.remove('hidden');
        userNameDisplay.textContent = `Admin: ${currentUser.name}`;
    } else {
        navbar.classList.add('hidden');
    }
}

async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include' // Important for cookies
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Something went wrong');
    return data;
}

// --- Session Check ---
async function checkSession() {
    try {
        currentUser = await apiRequest('/auth/me');
        if (currentUser.role === 'admin') {
            showSection('adminDashboard');
            loadAdminComplaints();
        } else {
            // If logged in but not admin (shouldn't happen in this simplified version)
            showSection('public');
        }
    } catch (err) {
        currentUser = null;
        showSection('public');
    }
}

// --- Public Actions ---

// Direct Complaint Submission
document.getElementById('public-complaint-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('public-name').value;
    const phone = document.getElementById('public-phone').value;
    const category = document.getElementById('public-category').value;
    const complaint_text = document.getElementById('public-complaint').value;
    const errorEl = document.getElementById('public-error');
    const successEl = document.getElementById('public-success');
    
    errorEl.textContent = '';
    successEl.textContent = '';

    try {
        await apiRequest('/complaints/public', 'POST', { name, phone, category, complaint_text });
        successEl.textContent = "Thank you! Your complaint has been submitted successfully.";
        document.getElementById('public-complaint-form').reset();
    } catch (err) {
        errorEl.textContent = err.message;
    }
});

// --- Admin Actions ---

// Admin Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    try {
        currentUser = await apiRequest('/auth/login', 'POST', { email, password });
        if (currentUser.role === 'admin') {
            showSection('adminDashboard');
            loadAdminComplaints();
        } else {
            showSection('public');
            alert('Access Denied: Not an admin');
        }
    } catch (err) {
        errorEl.textContent = err.message;
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await apiRequest('/auth/logout', 'POST');
        currentUser = null;
        showSection('public');
    } catch (err) {
        console.error(err);
    }
});

// --- Navigation ---
document.getElementById('go-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('login');
});
document.getElementById('go-to-public').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('public');
});

// --- Complaint Actions ---

// Load Admin Complaints
async function loadAdminComplaints() {
    const listEl = document.getElementById('admin-complaints-list');
    listEl.innerHTML = '<div class="loading">Loading all complaints...</div>';
    
    try {
        const complaints = await apiRequest('/admin/complaints');
        if (complaints.length === 0) {
            listEl.innerHTML = '<div class="empty-state">No complaints found in the database.</div>';
            return;
        }

        listEl.innerHTML = complaints.map(c => `
            <div class="complaint-card glass">
                <div class="meta">
                    <span>ID: #${c.id}</span>
                    <span class="badge badge-${c.status}">${c.status}</span>
                </div>
                <span class="user-info">${c.userName} (${c.userPhone || 'No Phone'})</span>
                <div class="section">
                    <span class="label">Complaint Type</span>
                    <p style="text-transform: capitalize;">${c.category}</p>
                </div>
                <div class="section">
                    <span class="label">Complaint Detail</span>
                    <p>${c.complaintText}</p>
                </div>
                <div class="meta" style="margin-top: 1rem; margin-bottom: 0;">
                    <span>${new Date(c.createdAt).toLocaleDateString()} ${new Date(c.createdAt).toLocaleTimeString()}</span>
                </div>
            </div>
        `).join('');
    } catch (err) {
        listEl.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

// Initialize
checkSession();

