require("dotenv").config();

const path = require("path");
const { randomUUID } = require("crypto");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./supabaseClient");
const { findBestAnswer, tokenize } = require("./chatbotEngine");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "development_secret_change_me";
const frontendPath = path.join(__dirname, "..", "frontend");

const memoryStore = {
  students: [],
  conversations: [],
  resetRequests: []
};

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(express.static(frontendPath));

function createToken(student) {
  return jwt.sign(
    {
      id: student.id,
      username: student.username,
      matricNumber: student.matric_number
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function publicStudent(student) {
  return {
    id: student.id,
    email: student.email,
    username: student.username,
    matricNumber: student.matric_number
  };
}

async function findStudentByMatric(matricNumber) {
  if (db.supabase) {
    const { data, error } = await db.supabase
      .from("students")
      .select("*")
      .eq("matric_number", matricNumber)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  return memoryStore.students.find((student) => student.matric_number === matricNumber);
}

async function findStudentByEmail(email) {
  if (db.supabase) {
    const { data, error } = await db.supabase.from("students").select("*").eq("email", email).single();
    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  return memoryStore.students.find((student) => student.email === email);
}

async function saveStudent(student) {
  if (db.supabase) {
    const { data, error } = await db.supabase.from("students").insert(student).select("*").single();
    if (error) throw error;
    return data;
  }

  const saved = { id: randomUUID(), created_at: new Date().toISOString(), ...student };
  memoryStore.students.push(saved);
  return saved;
}

async function saveConversation(payload) {
  if (db.supabase) {
    const { error } = await db.supabase.from("conversations").insert(payload);
    if (error) throw error;
    return;
  }

  memoryStore.conversations.push({
    id: randomUUID(),
    created_at: new Date().toISOString(),
    ...payload
  });
}

function authMiddleware(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Authentication is required." });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Session expired. Please log in again." });
  }
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database: db.supabase ? "supabase" : "memory",
    app: "Wellspring University Student Assistant"
  });
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, username, matricNumber } = req.body;

    if (!email || !password || !username || !matricNumber) {
      return res.status(400).json({ message: "Email, username, matric number, and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const normalizedMatric = String(matricNumber).trim().toUpperCase();
    const existingMatric = await findStudentByMatric(normalizedMatric);
    const existingEmail = await findStudentByEmail(String(email).trim().toLowerCase());

    if (existingMatric || existingEmail) {
      return res.status(409).json({ message: "A student with this email or matric number already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const student = await saveStudent({
      email: String(email).trim().toLowerCase(),
      username: String(username).trim(),
      matric_number: normalizedMatric,
      password_hash: passwordHash
    });

    res.status(201).json({
      token: createToken(student),
      student: publicStudent(student)
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to create account.", detail: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { matricNumber, password } = req.body;

    if (!matricNumber || !password) {
      return res.status(400).json({ message: "Matric number and password are required." });
    }

    const student = await findStudentByMatric(String(matricNumber).trim().toUpperCase());
    const valid = student ? await bcrypt.compare(password, student.password_hash) : false;

    if (!valid) {
      return res.status(401).json({ message: "Invalid matric number or password." });
    }

    res.json({
      token: createToken(student),
      student: publicStudent(student)
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to log in.", detail: error.message });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const student = await findStudentByEmail(String(email).trim().toLowerCase());

    if (!student) {
      return res.json({ message: "If the email exists, password reset instructions will be sent." });
    }

    if (db.supabase) {
      const { error } = await db.supabase.from("password_reset_requests").insert({
        student_id: student.id,
        email: student.email
      });
      if (error) throw error;
    } else {
      memoryStore.resetRequests.push({
        id: randomUUID(),
        student_id: student.id,
        email: student.email,
        created_at: new Date().toISOString()
      });
    }

    res.json({ message: "If the email exists, password reset instructions will be sent." });
  } catch (error) {
    res.status(500).json({ message: "Unable to request password reset.", detail: error.message });
  }
});

app.post("/api/chat", authMiddleware, async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !String(question).trim()) {
      return res.status(400).json({ message: "Question is required." });
    }

    const result = findBestAnswer(question);
    const tokens = tokenize(question);

    await saveConversation({
      student_id: req.user.id,
      question,
      answer: result.answer,
      confidence: result.confidence,
      category: result.category,
      tokens,
      score_breakdown: result.scores,
      suggestions: result.suggestions
    });

    res.json({
      question,
      tokens,
      ...result
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to process question.", detail: error.message });
  }
});

app.get("/api/conversations", authMiddleware, async (req, res) => {
  try {
    if (db.supabase) {
      const { data, error } = await db.supabase
        .from("conversations")
        .select("*")
        .eq("student_id", req.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return res.json({ conversations: data });
    }

    const conversations = memoryStore.conversations
      .filter((conversation) => conversation.student_id === req.user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 50);

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ message: "Unable to load conversations.", detail: error.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

async function startServer() {
  await db.ensureSupabaseReady();

  app.listen(PORT, () => {
    const storage = db.supabase ? "supabase" : "memory";
    console.log(`Wellspring Student Assistant running on http://localhost:${PORT} (${storage})`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
