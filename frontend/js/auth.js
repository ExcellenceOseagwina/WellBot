document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "login" || page === "signup" || page === "forgot" || page === "reset") redirectIfAuthed();

  const signupForm = document.querySelector("#signupForm");
  const loginForm = document.querySelector("#loginForm");
  const forgotForm = document.querySelector("#forgotForm");
  const resetForm = document.querySelector("#resetForm");
  const resendForm = document.querySelector("#resendForm");

  if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.querySelector("#formMessage");
      message.textContent = "Creating account...";
      message.classList.remove("success");

      try {
        const payload = Object.fromEntries(new FormData(signupForm));
        const result = await apiRequest("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        const params = new URLSearchParams({ pending: "1", email: result.email });
        if (result.devVerificationLink) params.set("devVerificationLink", result.devVerificationLink);
        location.href = `verify-email.html?${params.toString()}`;
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.querySelector("#formMessage");
      message.textContent = "Signing in...";
      message.classList.remove("success");

      try {
        const payload = Object.fromEntries(new FormData(loginForm));
        const session = await apiRequest("/api/auth/login", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setSession(session);
        location.href = "chatbot.html";
      } catch (error) {
        if (error.needsVerification && error.email) {
          message.textContent = error.message;
          message.classList.add("success");
          setTimeout(() => {
            location.href = `verify-email.html?pending=1&email=${encodeURIComponent(error.email)}`;
          }, 1500);
          return;
        }
        message.textContent = error.message;
      }
    });
  }

  if (forgotForm) {
    forgotForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.querySelector("#formMessage");
      message.textContent = "Sending reset link...";
      message.classList.remove("success");

      try {
        const payload = Object.fromEntries(new FormData(forgotForm));
        const result = await apiRequest("/api/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        message.textContent = result.message;
        message.classList.add("success");
        if (result.devResetLink) showDevLink("#formMessage", result.devResetLink, "reset", "Reset password");
        forgotForm.reset();
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }

  if (resetForm) {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const message = document.querySelector("#formMessage");

    if (!token) {
      message.textContent = "Invalid reset link. Please request a new one.";
      resetForm.querySelector("button[type=submit]").disabled = true;
    }

    resetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      message.classList.remove("success");

      const password = resetForm.password.value;
      const confirmPassword = resetForm.confirmPassword.value;

      if (password !== confirmPassword) {
        message.textContent = "Passwords do not match.";
        return;
      }

      message.textContent = "Resetting password...";

      try {
        const result = await apiRequest("/api/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ token, password })
        });
        message.textContent = result.message;
        message.classList.add("success");
        resetForm.reset();
        setTimeout(() => {
          location.href = "login.html";
        }, 2000);
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }

  if (page === "verify") {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const pending = params.get("pending");
    const email = params.get("email");
    const devVerificationLink = params.get("devVerificationLink");

    const verifyPending = document.querySelector("#verifyPending");
    const verifyToken = document.querySelector("#verifyToken");

    if (token) {
      verifyToken.hidden = false;
      verifyEmailWithToken(token);
    } else if (pending) {
      verifyPending.hidden = false;
      if (email) {
        document.querySelector("#pendingEmail").textContent = email;
        document.querySelector("#resendEmail").value = email;
      }
      if (devVerificationLink) showDevLink("#pendingMessage", devVerificationLink, "confirmation", "Verify email");
    } else {
      verifyPending.hidden = false;
      document.querySelector("#pendingEmail").textContent = "your email";
    }
  }

  if (resendForm) {
    resendForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.querySelector("#pendingMessage");
      message.textContent = "Sending...";
      message.classList.remove("success");

      try {
        const payload = Object.fromEntries(new FormData(resendForm));
        const result = await apiRequest("/api/auth/resend-verification", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        message.textContent = result.message;
        message.classList.add("success");
        if (result.devVerificationLink) {
          showDevLink("#pendingMessage", result.devVerificationLink, "confirmation", "Verify email");
        }
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }
});

async function verifyEmailWithToken(token) {
  const message = document.querySelector("#verifyMessage");
  const card = document.querySelector("#verifyToken");

  try {
    const result = await apiRequest("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token })
    });
    card.querySelector("h1").textContent = "Email verified";
    message.textContent = result.message;
    message.classList.add("success");
    if (result.token) {
      setSession(result);
      setTimeout(() => {
        location.href = "chatbot.html";
      }, 2000);
    } else {
      setTimeout(() => {
        location.href = "login.html";
      }, 2000);
    }
  } catch (error) {
    card.querySelector("h1").textContent = "Verification failed";
    message.textContent = error.message;
  }
}

function showDevLink(messageSelector, link, linkType, label) {
  const message = document.querySelector(messageSelector);
  if (!message) return;

  message.textContent = "";
  message.classList.add("success");

  const text = document.createElement("span");
  text.textContent = `Email sending is not configured on this server. Open this ${linkType} link: `;

  const anchor = document.createElement("a");
  anchor.href = link;
  anchor.textContent = label;

  message.append(text, anchor);
}
