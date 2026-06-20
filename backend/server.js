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
const { generateToken, hashToken } = require("./tokenUtils");
const { isSmtpConfigured, sendVerificationEmail, sendPasswordResetEmail } = require("./emailService");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "development_secret_change_me";
const frontendPath = path.join(__dirname, "..", "frontend");

const memoryStore = {
  students: [],
  conversations: [],
  resetRequests: [],
  verificationTokens: []
};

async function withDatabase(supabaseQuery, memoryQuery) {
  if (!db.supabase) return memoryQuery();

  try {
    return await supabaseQuery(db.supabase);
  } catch (error) {
    if (db.isRetriableDbError(error)) {
      db.disableSupabase(error.message);
      return memoryQuery();
    }
    throw error;
  }
}

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
    matricNumber: student.matric_number,
    emailVerified: Boolean(student.email_verified)
  };
}

async function findStudentByMatric(matricNumber) {
  return withDatabase(
    async (supabase) => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("matric_number", matricNumber)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    () => memoryStore.students.find((student) => student.matric_number === matricNumber)
  );
}

async function findStudentByEmail(email) {
  return withDatabase(
    async (supabase) => {
      const { data, error } = await supabase.from("students").select("*").eq("email", email).single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    () => memoryStore.students.find((student) => student.email === email)
  );
}

async function findStudentById(id) {
  return withDatabase(
    async (supabase) => {
      const { data, error } = await supabase.from("students").select("*").eq("id", id).single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    () => memoryStore.students.find((student) => student.id === id)
  );
}

async function saveStudent(student) {
  return withDatabase(
    async (supabase) => {
      const { data, error } = await supabase.from("students").insert(student).select("*").single();
      if (error) throw error;
      return data;
    },
    () => {
      const saved = {
        id: randomUUID(),
        email_verified: false,
        email_verified_at: null,
        created_at: new Date().toISOString(),
        ...student
      };
      memoryStore.students.push(saved);
      return saved;
    }
  );
}

async function updateStudent(id, updates) {
  return withDatabase(
    async (supabase) => {
      const { data, error } = await supabase.from("students").update(updates).eq("id", id).select("*").single();
      if (error) throw error;
      return data;
    },
    () => {
      const index = memoryStore.students.findIndex((student) => student.id === id);
      if (index === -1) return null;
      memoryStore.students[index] = { ...memoryStore.students[index], ...updates };
      return memoryStore.students[index];
    }
  );
}

async function saveVerificationToken(payload) {
  return withDatabase(
    async (supabase) => {
      await supabase.from("email_verification_tokens").delete().eq("student_id", payload.student_id);
      const { error } = await supabase.from("email_verification_tokens").insert(payload);
      if (error) throw error;
    },
    () => {
      memoryStore.verificationTokens = memoryStore.verificationTokens.filter(
        (token) => token.student_id !== payload.student_id
      );
      memoryStore.verificationTokens.push({
        id: randomUUID(),
        created_at: new Date().toISOString(),
        used_at: null,
        ...payload
      });
    }
  );
}

async function findVerificationToken(tokenHash) {
  return withDatabase(
    async (supabase) => {
      const { data, error } = await supabase
        .from("email_verification_tokens")
        .select("*")
        .eq("token_hash", tokenHash)
        .is("used_at", null)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    () =>
      memoryStore.verificationTokens.find(
        (token) => token.token_hash === tokenHash && !token.used_at
      )
  );
}

async function markVerificationTokenUsed(id) {
  return withDatabase(
    async (supabase) => {
      const { error } = await supabase
        .from("email_verification_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    () => {
      const token = memoryStore.verificationTokens.find((entry) => entry.id === id);
      if (token) token.used_at = new Date().toISOString();
    }
  );
}

async function saveResetRequest(payload) {
  return withDatabase(
    async (supabase) => {
      await supabase
        .from("password_reset_requests")
        .delete()
        .eq("student_id", payload.student_id)
        .eq("handled", false);
      const { error } = await supabase.from("password_reset_requests").insert(payload);
      if (error) throw error;
    },
    () => {
      memoryStore.resetRequests = memoryStore.resetRequests.filter(
        (request) => !(request.student_id === payload.student_id && !request.handled)
      );
      memoryStore.resetRequests.push({
        id: randomUUID(),
        handled: false,
        used_at: null,
        created_at: new Date().toISOString(),
        ...payload
      });
    }
  );
}

async function findResetRequest(tokenHash) {
  return withDatabase(
    async (supabase) => {
      const { data, error } = await supabase
        .from("password_reset_requests")
        .select("*")
        .eq("token_hash", tokenHash)
        .eq("handled", false)
        .is("used_at", null)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    () =>
      memoryStore.resetRequests.find(
        (request) => request.token_hash === tokenHash && !request.handled && !request.used_at
      )
  );
}

async function markResetRequestUsed(id) {
  return withDatabase(
    async (supabase) => {
      const { error } = await supabase
        .from("password_reset_requests")
        .update({ handled: true, used_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    () => {
      const request = memoryStore.resetRequests.find((entry) => entry.id === id);
      if (request) {
        request.handled = true;
        request.used_at = new Date().toISOString();
      }
    }
  );
}

async function saveConversation(payload) {
  return withDatabase(
    async (supabase) => {
      const { error } = await supabase.from("conversations").insert(payload);
      if (error) throw error;
    },
    () => {
      memoryStore.conversations.push({
        id: randomUUID(),
        created_at: new Date().toISOString(),
        ...payload
      });
    }
  );
}

async function authMiddleware(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Authentication is required." });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    const student = await findStudentById(req.user.id);
    if (!student) return res.status(401).json({ message: "Session expired. Please log in again." });
    if (!student.email_verified) {
      return res.status(403).json({ message: "Please verify your email before using the chatbot." });
    }
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Session expired. Please log in again." });
  }
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database: db.supabase ? "supabase" : "memory",

    email: isSmtpConfigured() ? "smtp" : "not-configured",
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
    const normalizedEmail = String(email).trim().toLowerCase();
    const existingMatric = await findStudentByMatric(normalizedMatric);
    const existingEmail = await findStudentByEmail(normalizedEmail);

    if (existingMatric || existingEmail) {
      return res.status(409).json({ message: "A student with this email or matric number already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const student = await saveStudent({
      email: normalizedEmail,
      username: String(username).trim(),
      matric_number: normalizedMatric,
      password_hash: passwordHash,
      email_verified: false
    });

    const rawToken = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await saveVerificationToken({
      student_id: student.id,
      token_hash: hashToken(rawToken),
      expires_at: expiresAt
    });

    const emailResult = await sendVerificationEmail(student.email, rawToken);

    res.status(201).json({
      message: emailResult.dev
        ? "Account created, but email delivery is not configured. Use the verification link shown below."
        : "Account created. Please check your email to verify your account.",
      email: student.email,

      devVerificationLink: emailResult.dev ? emailResult.link : undefined
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

    if (!student.email_verified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        email: student.email,
        needsVerification: true
      });
    }

    res.json({
      token: createToken(student),
      student: publicStudent(student)
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to log in.", detail: error.message });
  }
});

app.post("/api/auth/verify-email", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Verification token is required." });

    const record = await findVerificationToken(hashToken(token));
    if (!record) return res.status(400).json({ message: "Invalid or expired verification link." });

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ message: "This verification link has expired. Please request a new one." });
    }

    const student = await updateStudent(record.student_id, {
      email_verified: true,
      email_verified_at: new Date().toISOString()
    });

    await markVerificationTokenUsed(record.id);

    res.json({
      message: "Email verified successfully. You can now log in.",
      token: createToken(student),
      student: publicStudent(student)
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to verify email.", detail: error.message });
  }
});

app.post("/api/auth/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const student = await findStudentByEmail(String(email).trim().toLowerCase());

    if (!student || student.email_verified) {
      return res.json({ message: "If the email exists and is unverified, a new verification link will be sent." });
    }

    const rawToken = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await saveVerificationToken({
      student_id: student.id,
      token_hash: hashToken(rawToken),
      expires_at: expiresAt
    });

    const emailResult = await sendVerificationEmail(student.email, rawToken);

    res.json({
      message: emailResult.dev
        ? "Email delivery is not configured. Use the verification link shown below."
        : "If the email exists and is unverified, a new verification link will be sent.",
      devVerificationLink: emailResult.dev ? emailResult.link : undefined
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to resend verification email.", detail: error.message });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const student = await findStudentByEmail(String(email).trim().toLowerCase());

    if (!student) {
      return res.json({ message: "If the email exists, password reset instructions will be sent." });
    }

    const rawToken = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await saveResetRequest({
      student_id: student.id,
      email: student.email,
      token_hash: hashToken(rawToken),
      expires_at: expiresAt
    });

    const emailResult = await sendPasswordResetEmail(student.email, rawToken);

    res.json({
      message: emailResult.dev
        ? "Email delivery is not configured. Use the password reset link shown below."
        : "If the email exists, password reset instructions will be sent.",
      devResetLink: emailResult.dev ? emailResult.link : undefined
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to request password reset.", detail: error.message });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Reset token and new password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const record = await findResetRequest(hashToken(token));
    if (!record) return res.status(400).json({ message: "Invalid or expired reset link." });

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await updateStudent(record.student_id, { password_hash: passwordHash });
    await markResetRequestUsed(record.id);

    res.json({ message: "Password reset successfully. You can now log in with your new password." });
  } catch (error) {
    res.status(500).json({ message: "Unable to reset password.", detail: error.message });
  }
});

app.post("/api/chat", authMiddleware, async (req, res) => {
  try {
    const question = String(req.body.question || "").trim();

    if (!question) {
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
    const conversations = await withDatabase(
      async (supabase) => {
        const { data, error } = await supabase
          .from("conversations")
          .select("*")
          .eq("student_id", req.user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        return data;
      },
      () =>
        memoryStore.conversations
          .filter((conversation) => conversation.student_id === req.user.id)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 50)
    );

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ message: "Unable to load conversations.", detail: error.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "home.html"));
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

