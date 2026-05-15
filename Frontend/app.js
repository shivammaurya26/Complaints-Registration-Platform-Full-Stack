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
    login: document.getElementById('login-section'),
    register: document.getElementById('register-section'),
    userDashboard: document.getElementById('user-dashboard'),
    newComplaint: document.getElementById('new-complaint-section'),
    adminDashboard: document.getElementById('admin-dashboard')
};

const navbar = document.getElementById('navbar');
const userNameDisplay = document.getElementById('user-name');

// --- Helper Functions ---
function showSection(sectionName) {
    Object.values(sections).forEach(s => s.classList.add('hidden'));
    sections[sectionName].classList.remove('hidden');
    
    if (currentUser) {
        navbar.classList.remove('hidden');
        userNameDisplay.textContent = `Hello, ${currentUser.name}`;
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
            showSection('userDashboard');
            loadUserComplaints();
        }
    } catch (err) {
        currentUser = null;
        showSection('login');
    }
}

// --- Auth Actions ---

// Login
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
            showSection('userDashboard');
            loadUserComplaints();
        }
    } catch (err) {
        errorEl.textContent = err.message;
    }
});

// Register - Send OTP
document.getElementById('otp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const errorEl = document.getElementById('otp-error');
    
    try {
        await apiRequest('/auth/send-otp', 'POST', { name, email });
        document.getElementById('reg-step-1').classList.add('hidden');
        document.getElementById('reg-step-2').classList.remove('hidden');
    } catch (err) {
        errorEl.textContent = err.message;
    }
});

// Register - Verify OTP
document.getElementById('verify-otp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('reg-step-2').classList.add('hidden');
    document.getElementById('reg-step-3').classList.remove('hidden');
});

// Register - Finalize
document.getElementById('register-final-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const otp = document.getElementById('reg-otp').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const errorEl = document.getElementById('register-error');

    if (password !== confirmPassword) {
        errorEl.textContent = "Passwords do not match";
        return;
    }

    try {
        await apiRequest('/auth/register', 'POST', { email, otp, password });
        alert('Registration successful! Please login.');
        showSection('login');
    } catch (err) {
        errorEl.textContent = err.message;
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await apiRequest('/auth/logout', 'POST');
        currentUser = null;
        showSection('login');
    } catch (err) {
        console.error(err);
    }
});

// --- Navigation ---
document.getElementById('go-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('register');
});
document.getElementById('go-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('login');
});
document.getElementById('new-complaint-btn').addEventListener('click', () => {
    showSection('newComplaint');
});

// --- Complaint Actions ---

// Get AI Question
document.getElementById('get-ai-question-btn').addEventListener('click', async () => {
    const text = document.getElementById('complaint-text').value;
    if (!text) return alert('Please describe your issue');

    try {
        const { question } = await apiRequest('/ai/question', 'POST', { complaint_text: text });
        currentComplaint.text = text;
        currentComplaint.aiQuestion = question;
        
        document.getElementById('ai-question-display').textContent = question;
        document.getElementById('complaint-step-1').classList.add('hidden');
        document.getElementById('complaint-step-2').classList.remove('hidden');
    } catch (err) {
        alert(err.message);
    }
});

document.getElementById('back-to-complaint-btn').addEventListener('click', () => {
    document.getElementById('complaint-step-2').classList.add('hidden');
    document.getElementById('complaint-step-1').classList.remove('hidden');
});

// Submit Complaint
document.getElementById('submit-complaint-btn').addEventListener('click', async () => {
    const answer = document.getElementById('ai-answer').value;
    if (!answer) return alert('Please answer the follow-up question');

    try {
        await apiRequest('/complaints', 'POST', {
            complaint_text: currentComplaint.text,
            ai_question: currentComplaint.aiQuestion,
            ai_answer: answer
        });
        alert('Complaint submitted successfully!');
        showSection('userDashboard');
        loadUserComplaints();
        
        // Reset form
        document.getElementById('complaint-text').value = '';
        document.getElementById('ai-answer').value = '';
        document.getElementById('complaint-step-2').classList.add('hidden');
        document.getElementById('complaint-step-1').classList.remove('hidden');
    } catch (err) {
        alert(err.message);
    }
});

// Load User Complaints
async function loadUserComplaints() {
    const listEl = document.getElementById('my-complaints-list');
    listEl.innerHTML = '<div class="loading">Loading complaints...</div>';
    
    try {
        const complaints = await apiRequest('/complaints/my');
        if (complaints.length === 0) {
            listEl.innerHTML = '<div class="empty-state">No complaints yet.</div>';
            return;
        }

        listEl.innerHTML = complaints.map(c => `
            <div class="complaint-card glass">
                <div class="meta">
                    <span>ID: #${c.id}</span>
                    <span>${new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="section">
                    <span class="label">Complaint</span>
                    <p>${c.complaintText}</p>
                </div>
                <div class="section">
                    <span class="label">AI Question</span>
                    <p>${c.aiQuestion}</p>
                </div>
                <div class="section">
                    <span class="label">Your Answer</span>
                    <p>${c.userAnswer}</p>
                </div>
            </div>
        `).join('');
    } catch (err) {
        listEl.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

// Load Admin Complaints
async function loadAdminComplaints() {
    const listEl = document.getElementById('admin-complaints-list');
    listEl.innerHTML = '<div class="loading">Loading all complaints...</div>';
    
    try {
        const complaints = await apiRequest('/admin/complaints');
        if (complaints.length === 0) {
            listEl.innerHTML = '<div class="empty-state">No complaints found.</div>';
            return;
        }

        listEl.innerHTML = complaints.map(c => `
            <div class="complaint-card glass">
                <span class="user-info">${c.userName} (${c.userEmail})</span>
                <div class="meta">
                    <span>ID: #${c.id}</span>
                    <span>${new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="section">
                    <span class="label">Complaint</span>
                    <p>${c.complaintText}</p>
                </div>
                <div class="section">
                    <span class="label">AI Question</span>
                    <p>${c.aiQuestion}</p>
                </div>
                <div class="section">
                    <span class="label">User Answer</span>
                    <p>${c.userAnswer}</p>
                </div>
            </div>
        `).join('');
    } catch (err) {
        listEl.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

// Initialize
checkSession();
