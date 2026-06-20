const API_BASE = "";

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return !payload.exp || payload.exp * 1000 <= Date.now();
  } catch (error) {
    return true;
  }
}

function getSession() {
  try {
    const session = JSON.parse(localStorage.getItem("wellspring_session")) || null;
    if (session?.token && isTokenExpired(session.token)) {
      clearSession();
      return null;
    }
    return session;
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
  if (!response.ok) {
    const error = new Error(payload.message || "Request failed.");
    if (payload.needsVerification) error.needsVerification = true;
    if (payload.email) error.email = payload.email;
    if (payload.devVerificationLink) error.devVerificationLink = payload.devVerificationLink;
    if (payload.devResetLink) error.devResetLink = payload.devResetLink;
    throw error;
  }
  return payload;
}

function markActiveNav() {
  const current = location.pathname.split("/").pop() || "home.html";
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

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-mode", isDark);
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.textContent = isDark ? "Light" : "Dark";
    button.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  });
}

function setupThemeToggle() {
  const savedTheme = localStorage.getItem("wellspring_theme") || "light";
  applyTheme(savedTheme);

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
      localStorage.setItem("wellspring_theme", nextTheme);
      applyTheme(nextTheme);
    });
  });
}

function setupMobileMenu() {
  const toggle = document.querySelector("[data-mobile-menu]");
  const links = document.querySelector("[data-nav-links]");
  if (!toggle || !links) return;

  function closeMenu() {
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation menu");
  }

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
  });

  links.querySelectorAll("a, button").forEach((item) => {
    item.addEventListener("click", closeMenu);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

function setupPasswordToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    const input = document.querySelector(button.dataset.passwordToggle);
    if (!input) return;

    button.addEventListener("click", () => {
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      button.textContent = showing ? "Show" : "Hide";
      button.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupThemeToggle();
  setupMobileMenu();
  setupPasswordToggles();
  markActiveNav();
  setupLogout();
});
