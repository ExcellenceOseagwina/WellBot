document.addEventListener("DOMContentLoaded", async () => {
  const session = requireAuth();
  if (!session) return;

  const form = document.querySelector("#chatForm");
  const input = document.querySelector("#questionInput");
  const messages = document.querySelector("#messages");
  const history = document.querySelector("#historyList");
  const studentName = document.querySelector("#studentName");

  studentName.textContent = session.student?.username || "Student";

  function addMessage(text, sender, meta = {}) {
    const message = document.createElement("div");
    message.className = `message ${sender}`;
    message.textContent = text;

    if (meta.confidence !== undefined) {
      const score = document.createElement("span");
      score.className = "score";
      score.textContent = `Confidence: ${Math.round(meta.confidence * 100)}% | Category: ${meta.category || "general"}`;
      message.appendChild(score);
    }

    if (meta.suggestions?.length) {
      const suggestions = document.createElement("div");
      suggestions.className = "suggestions";
      meta.suggestions.forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = item.question;
        button.addEventListener("click", () => {
          input.value = item.question;
          input.focus();
        });
        suggestions.appendChild(button);
      });
      message.appendChild(suggestions);
    }

    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  }

  function renderHistory(conversations = []) {
    history.innerHTML = "";
    if (!conversations.length) {
      history.innerHTML = '<p class="muted">No saved conversations yet.</p>';
      return;
    }

    conversations.forEach((item) => {
      const row = document.createElement("div");
      row.className = "history-item";
      row.innerHTML = `<strong>${item.question}</strong><br><span class="muted">${item.category || "general"} | ${Math.round((item.confidence || 0) * 100)}%</span>`;
      history.appendChild(row);
    });
  }

  async function loadHistory() {
    try {
      const data = await apiRequest("/api/conversations", {
        headers: authHeaders()
      });
      renderHistory(data.conversations);
    } catch (error) {
      renderHistory([]);
    }
  }

  addMessage(
    `Hello ${session.student?.username || "there"}. Ask me about admissions, login help, fees, course registration, transcripts, accommodation, or student support.`,
    "bot"
  );

  await loadHistory();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;

    addMessage(question, "user");
    input.value = "";

    try {
      const result = await apiRequest("/api/chat", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ question })
      });

      addMessage(result.answer, "bot", {
        confidence: result.confidence,
        category: result.category,
        suggestions: result.suggestions
      });
      await loadHistory();
    } catch (error) {
      addMessage(error.message, "bot");
    }
  });
});
