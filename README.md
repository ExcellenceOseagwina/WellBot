# Wellspring University Student Assistant

A web-based chatbot for Wellspring University students. It includes public pages, student authentication, an NLP-style question matcher, conversation history, and Supabase-ready persistence.

## Features

- Homepage, about page, chatbot page, signup page, login page, forgot password page, reset password page, and email verification page.
- Student signup with email, username, matric number, password, and email verification links.
- Student login with matric number and password after email verification.
- Password reset links sent by email.
- Chatbot answers student questions from a stored university knowledge base.
- Conversations are saved for future review and chatbot improvement.

## Chat Bot Directory Structure

```text
WellBot/
  backend/
    data/
      knowledgeBase.json
    chatbotEngine.js
    emailService.js
    schema.sql
    server.js
    supabaseClient.js
    tokenUtils.js
  docs/
    system-documentation.md
    user-documentation.md
  frontend/
    assets/
      icons/
        android-chrome-192x192.png
        android-chrome-512x512.png
        apple-touch-icon.png
        favicon-16x16.png
        favicon-32x32.png
        favicon.ico
        site.webmanifest
      images/
        bg.jpg
        logo.png
    css/
      styles.css
    js/
      app.js
      auth.js
      chatbot.js
    about.html
    chatbot.html
    index.html
    login.html
    forgot-password.html
    reset-password.html
    signup.html
    verify-email.html
  .env.example
  package.json
  README.md
```

## Setup

1. Install Node.js.
2. Install dependencies:

```bash
npm install
```

3. Create your environment file:

```bash
copy .env.example .env
```

4. Add your Supabase values to `.env`.
5. In Supabase SQL Editor, run `backend/schema.sql`.
6. Start the app:

```bash
npm start
```

7. Open:

```text
http://localhost:5000
```

## Supabase Notes

If Supabase environment variables are not configured, the server uses temporary in-memory storage so you can test locally. For real use, configure Supabase so student accounts and conversations persist.

## Updating University Information

Edit `backend/data/knowledgeBase.json`. Each entry supports:

- `category`
- `question`
- `answer`
- `keywords`
- `phrases`

Use verified Wellspring University information when expanding the knowledge base.
