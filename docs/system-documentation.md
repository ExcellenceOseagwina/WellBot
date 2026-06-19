# System Documentation

## Technology Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js and Express
- Database: Supabase
- Authentication: Custom Express auth with bcrypt password hashing and JWT sessions

## Backend Endpoints

- `GET /api/health`: Checks server status.
- `POST /api/auth/signup`: Creates a student account.
- `POST /api/auth/login`: Logs in with matric number and password.
- `POST /api/auth/reset-password`: Records a reset password request.
- `POST /api/chat`: Processes a chatbot question. Requires authentication.
- `GET /api/conversations`: Returns saved student conversations. Requires authentication.

## NLP Matching Flow

When a student asks a question:

1. The backend normalizes the text.
2. It breaks the question into tokens.
3. It compares the tokens with stored questions in `backend/data/knowledgeBase.json`.
4. It calculates:
   - Token overlap
   - Keyword coverage
   - Phrase matching
   - Sequence similarity
   - Category matching
5. It combines those signals into a confidence score.
6. It returns the best answer or suggests related questions when confidence is low.
7. It stores the question, answer, tokens, confidence, scoring details, and suggestions.

## Supabase Tables

Run `backend/schema.sql` in Supabase SQL Editor to create:

- `students`
- `conversations`
- `password_reset_requests`

## Data Maintenance

The chatbot depends on `backend/data/knowledgeBase.json`. Administrators should keep this file updated with verified Wellspring University information. Better data will produce better answers and suggestions.

## Security Notes

- Replace `JWT_SECRET` in production.
- Use the Supabase service role key only on the backend.
- Do not expose `.env` values in frontend files.
- Review Row Level Security policies before production deployment.
