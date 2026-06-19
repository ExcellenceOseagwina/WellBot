document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "login" || page === "signup" || page === "reset") redirectIfAuthed();

  const signupForm = document.querySelector("#signupForm");
  const loginForm = document.querySelector("#loginForm");
  const resetForm = document.querySelector("#resetForm");

  if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.querySelector("#formMessage");
      message.textContent = "Creating account...";

      try {
        const payload = Object.fromEntries(new FormData(signupForm));
        const session = await apiRequest("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setSession(session);
        location.href = "chatbot.html";
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

      try {
        const payload = Object.fromEntries(new FormData(loginForm));
        const session = await apiRequest("/api/auth/login", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setSession(session);
        location.href = "chatbot.html";
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }

  if (resetForm) {
    resetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.querySelector("#formMessage");
      message.textContent = "Sending request...";

      try {
        const payload = Object.fromEntries(new FormData(resetForm));
        const result = await apiRequest("/api/auth/reset-password", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        message.textContent = result.message;
        message.classList.add("success");
        resetForm.reset();
      } catch (error) {
        message.classList.remove("success");
        message.textContent = error.message;
      }
    });
  }
});
