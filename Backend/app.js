import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { eq, and } from 'drizzle-orm';
import { db } from './db.js';
import { users, complaints } from './schema.js';
import { sendOTPEmail } from './emailService.js';
import { generateFollowUpQuestion } from './aiService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5501',
  'http://127.0.0.1:5501',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Log origin for debugging in Render logs
    console.log("[CORS DEBUG] Request from origin:", origin);

    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    const isLocal = normalizedOrigin.startsWith('http://localhost') || 
                    normalizedOrigin.startsWith('http://127.0.0.1');
    
    const isGitHubPages = normalizedOrigin.includes('.github.io');

    if (isLocal || isGitHubPages || allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.log("[CORS DEBUG] Blocked origin:", origin);
      callback(null, false);
    }
  },
  credentials: true,
}));
app.use(express.json());

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});
app.use(cookieParser());

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// --- Auth Routes ---

// POST /api/auth/send-otp
app.post('/api/auth/send-otp', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  try {
    // Check if user exists and is already verified
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (existingUser.length > 0 && existingUser[0].isVerified) {
      return res.status(400).json({ error: 'Email already registered and verified' });
    }

    if (existingUser.length > 0) {
      // Update existing unverified user
      await db.update(users).set({ name, otp, otpExpiry }).where(eq(users.email, email));
    } else {
      // Create new unverified user
      await db.insert(users).values({
        name,
        email,
        password: 'pending', // Placeholder
        otp,
        otpExpiry,
        isVerified: false,
      });
    }

    const emailSent = await sendOTPEmail(email, otp);
    if (!emailSent) return res.status(500).json({ error: 'Failed to send OTP email' });

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error("[DATABASE ERROR]:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user.length === 0) return res.status(400).json({ error: 'User not found' });

    const userData = user[0];
    if (userData.otp !== otp || new Date() > userData.otpExpiry) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await db.update(users).set({
      password, // Stored as plain text as requested
      isVerified: true,
      otp: null,
      otpExpiry: null,
    }).where(eq(users.email, email));

    res.json({ message: 'Registration successful' });
  } catch (error) {
    console.error("[DATABASE ERROR]:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user.length === 0 || user[0].password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userData = user[0];
    const token = jwt.sign({ id: userData.id, email: userData.email, role: userData.role, name: userData.name }, process.env.JWT_SECRET);

    res.cookie('token', token, { 
      httpOnly: false, 
      secure: true, 
      sameSite: 'none',
      path: '/' 
    });
    res.json({ name: userData.name, email: userData.email, role: userData.role });
  } catch (error) {
    console.error("[DATABASE ERROR]:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// POST /api/complaints/public (Direct submission without OTP)
app.post('/api/complaints/public', async (req, res) => {
  const { name, phone, complaint_text, category, priority } = req.body;
  if (!name || !phone || !complaint_text) {
    return res.status(400).json({ error: 'Name, phone, and complaint text are required' });
  }

  try {
    // 1. Find or create a user by phone number
    let user = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    let userId;

    if (user.length === 0) {
      const newUser = await db.insert(users).values({
        name,
        phone,
        role: 'user',
      }).returning({ id: users.id });
      userId = newUser[0].id;
    } else {
      userId = user[0].id;
    }

    // 2. Insert the complaint
    const insertedComplaint = await db.insert(complaints).values({
      userId,
      complaintText: complaint_text,
      category: category || 'other',
      status: 'pending'
    }).returning({ id: complaints.id });

    const complaintId = insertedComplaint[0].id;

    // 3. Generate AI Follow-up Question
    let aiQuestion = "Could you provide any more details about the incident?";
    try {
      const generatedQuestion = await generateFollowUpQuestion(complaint_text);
      if (generatedQuestion) {
        aiQuestion = generatedQuestion;
        // Save the question to the database
        await db.update(complaints).set({ aiQuestion }).where(eq(complaints.id, complaintId));
      }
    } catch (aiError) {
      console.error("[AI ERROR]:", aiError);
    }

    res.json({ 
      message: 'Initial report saved!', 
      complaintId,
      aiQuestion 
    });
  } catch (error) {
    console.error("[DATABASE ERROR]:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// POST /api/complaints/ai-answer (Save the user's answer to the AI question)
app.post('/api/complaints/ai-answer', async (req, res) => {
  const { complaintId, answer } = req.body;
  if (!complaintId || !answer) return res.status(400).json({ error: 'Complaint ID and answer are required' });

  try {
    await db.update(complaints).set({ userAnswer: answer }).where(eq(complaints.id, complaintId));
    res.json({ message: 'Additional details saved successfully!' });
  } catch (error) {
    console.error("[DATABASE ERROR]:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', { secure: true, sameSite: 'none', path: '/' });
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ name: req.user.name, email: req.user.email, role: req.user.role });
});

// --- Complaints Routes ---

// POST /api/ai/question
app.post('/api/ai/question', authenticateToken, async (req, res) => {
  const { complaint_text } = req.body;
  if (!complaint_text) return res.status(400).json({ error: 'Complaint text is required' });

  const question = await generateFollowUpQuestion(complaint_text);
  res.json({ question });
});

// POST /api/complaints
app.post('/api/complaints', authenticateToken, async (req, res) => {
  const { complaint_text, ai_question, ai_answer } = req.body;
  try {
    await db.insert(complaints).values({
      userId: req.user.id,
      complaintText: complaint_text,
      aiQuestion: ai_question,
      userAnswer: ai_answer,
    });
    res.json({ message: 'Complaint submitted successfully' });
  } catch (error) {
    console.error("[DATABASE ERROR]:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// GET /api/complaints/my
app.get('/api/complaints/my', authenticateToken, async (req, res) => {
  try {
    const userComplaints = await db.select().from(complaints).where(eq(complaints.userId, req.user.id));
    res.json(userComplaints);
  } catch (error) {
    console.error("[DATABASE ERROR]:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// GET /api/admin/complaints
app.get('/api/admin/complaints', authenticateToken, isAdmin, async (req, res) => {
  try {
    const allComplaints = await db.select({
      id: complaints.id,
      complaintText: complaints.complaintText,
      aiQuestion: complaints.aiQuestion,
      userAnswer: complaints.userAnswer,
      createdAt: complaints.createdAt,
      userName: users.name,
      userEmail: users.email,
      userPhone: users.phone, // Include phone number
    })
    .from(complaints)
    .innerJoin(users, eq(complaints.userId, users.id));
    
    res.json(allComplaints);
  } catch (error) {
    console.error("[DATABASE ERROR]:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
