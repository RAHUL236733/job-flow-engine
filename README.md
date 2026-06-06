#Job Flow Engine 🚀

Job Flow Engine is a premium, recruiter-ready full-stack web application designed for students and freshers to supercharge their job search. It parses resume skills, calculates an ATS match rating, and matches seekers with live job and internship listings via AI scraping workflows—all wrapped in a stunning modern UI/UX featuring dark/light modes, glassmorphism elements, and smooth interactions.

---

## 🏗️ Architecture & Stack

- **Frontend & Routing**: React, Vite, and [TanStack Start](https://tanstack.com/router/v1/docs/start/overview) (full-stack SSR).
- **Styling & Theme**: Tailwind CSS v4, custom utility layers, and dark mode configuration.
- **Database & Auth**: [Supabase](https://supabase.com) (Supabase Auth and PostgreSQL Database with Row Level Security RLS).
- **Automation Backend**: Existing n8n workflow webhook for live scraping, resume parsing, and skillset matching.

---

## 🌟 Enhanced Features

1. **Authentication (Supabase Auth)**
   - Sign Up and Sign In pages with inputs validation and error feedback.
   - Session persistence and protected routes.
   - Profile sync trigger.

2. **Student & Fresher Dashboard**
   - **Resume Matcher**: Drag & drop resume parser, ATS compatibility rating visualization, extracted skills list, and live scraping matches.
   - **Saved Jobs Vault**: Save listings to track and apply later.
   - **My Profile**: Fine-tune skills, target location, target title, and job type configuration.

3. **Performance Optimization (Supabase Caching)**
   - Scraper results are cached in the `cached_job_results` table for 24 hours.
   - Speeds up page load and bypasses n8n workflow scraper request limits.

4. **Zero-Config Developer Fallback (Mock Mode)**
   - If Supabase environment variables are missing, the application automatically enters **Mock Demo Mode**.
   - Reviewers can immediately explore the signup/login, dashboard pages, filters, bookmarks, and search history locally using browser-based localStorage persistence!

---

## 🔧 Installation & Setup

### 1. Database Setup (Supabase)
Create a free project on [Supabase](https://supabase.com) and execute the SQL script located in:
🔗 **[supabase/schema.sql](file:///c:/Users/Ramya/Downloads/ai-job-matcher/supabase/schema.sql)**

This script sets up:
- `user_profiles` (synced automatically with user signups)
- `saved_jobs` (user bookmarks)
- `cached_job_results` (shared job scraper caching)
- Row Level Security (RLS) policies to ensure data separation.

### 2. Environment Variables Configuration
Copy the template environment file:
```bash
cp .env.example .env
```
Open `.env` and fill in your Supabase connection parameters:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_N8N_WEBHOOK_URL=https://poojitharamya7125.app.n8n.cloud/webhook-test/upload-resume
```

### 3. Local Development
Install dependencies and run the Nitro SSR development server:
```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev
```
Open `http://localhost:3000` (or the console output link) to view the application.

---

## 🚀 Deployment Guide

### Vercel Deployment
1. Import the repository into your Vercel Dashboard.
2. Under **Project Settings**, select **Vite** or **Next.js** (or standard TanStack Start preset).
3. Set the Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_N8N_WEBHOOK_URL`).
4. Click **Deploy**.

### Cloudflare Pages Deployment
This project includes a `wrangler.jsonc` file and Nitro presets to run on Cloudflare Workers/Pages:
```bash
# Build production assets
npm run build

# Deploy to Cloudflare Pages (requires wrangler)
npx wrangler pages deploy dist/client
```
Make sure to add your environment variables in your Cloudflare Pages dashboard under **Settings > Variables**.
