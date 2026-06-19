const API_BASE = "";

function getSession() {
  try {
    return JSON.parse(localStorage.getItem("wellspring_session")) || null;
  } catch (error) {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem("wellspring_session", JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem("wellspring_session");
}

function authHeaders() {
  const session = getSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Request failed.");
  return payload;
}

function markActiveNav() {
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.getAttribute("href") === current) link.classList.add("active");
  });
}

function setupLogout() {
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", () => {
      clearSession();
      location.href = "login.html";
    });
  });
}

function requireAuth() {
  const session = getSession();
  if (!session?.token) {
    location.href = "login.html";
    return null;
  }
  return session;
}

function redirectIfAuthed() {
  if (getSession()?.token) location.href = "chatbot.html";
}

document.addEventListener("DOMContentLoaded", () => {
  markActiveNav();
  setupLogout();
});
