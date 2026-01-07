# Deployment Environment Variables

When deploying this application to Vercel (or any other hosting provider), you must configure the following environment variables in your project settings:

## Supabase
These variables are required to connect to the Supabase backend for data storage.

- **`VITE_SUPABASE_URL`**: The URL of your Supabase project.
- **`VITE_SUPABASE_ANON_KEY`**: The anonymous public key for your Supabase project.

## Google Gemini API
This variable is required for the flashcard generation feature.

- **`VITE_GEMINI_API_KEY`**: Your Google Gemini API key.

> [!IMPORTANT]
> Ensure these variables are set in the specific environment (Production, Preview, Development) where you want the app to function correctly.
