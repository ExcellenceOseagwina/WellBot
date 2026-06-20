document.addEventListener("DOMContentLoaded", async () => {
  const session = requireAuth();
  if (!session) return;

  const form = document.querySelector("#chatForm");
  const input = document.querySelector("#questionInput");
  const messages = document.querySelector("#messages");
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

  addMessage(
    `Hello ${session.student?.username || "there"}. Ask me about admissions, course registration, academics, exams, fees, portal help, campus services, hostel, departments, timetables, or student support.`,
    "bot"
  );

  async function sendQuestion() {
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
    } catch (error) {
      addMessage(error.message, "bot");
    }
  }

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendQuestion();
  });
});
