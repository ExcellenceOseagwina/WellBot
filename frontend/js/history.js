document.addEventListener("DOMContentLoaded", async () => {
  const session = requireAuth();
  if (!session) return;

  const history = document.querySelector("#historyList");

  function renderHistory(conversations = []) {
    history.innerHTML = "";

    if (!conversations.length) {
      history.innerHTML = '<p class="muted">No saved conversations yet.</p>';
      return;
    }

    conversations.forEach((item) => {
      const row = document.createElement("article");
      row.className = "history-item full";

      const date = item.created_at ? new Date(item.created_at).toLocaleString() : "";

      const meta = document.createElement("div");
      meta.className = "history-meta";

      [item.category || "general", `${Math.round((item.confidence || 0) * 100)}%`, date].forEach((value) => {
        const span = document.createElement("span");
        span.textContent = value;
        meta.appendChild(span);
      });

      const question = document.createElement("h2");
      question.textContent = item.question;

      const answer = document.createElement("p");
      answer.textContent = item.answer;

      row.append(meta, question, answer);

      history.appendChild(row);
    });
  }

  try {
    const data = await apiRequest("/api/conversations", {
      headers: authHeaders()
    });
    renderHistory(data.conversations);
  } catch (error) {
    history.innerHTML = `<p class="form-message">${error.message}</p>`;
  }
});
