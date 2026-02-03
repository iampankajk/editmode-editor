# EditMode Editor

A professional browser-based video editing application built with Next.js, featuring timeline editing, media management, and cloud save support.

## Features

- 🎬 **Timeline Editing** - Multi-track timeline with drag & drop
- 📁 **Media Library** - Import and manage video, audio, and images
- ✂️ **Clip Operations** - Cut, trim, split, and arrange clips
- 🎨 **Canvas Settings** - Multiple aspect ratios and backgrounds
- ☁️ **Cloud Save** - Save projects to the cloud
- 🎯 **Demo Mode** - Try the full editor without signing up

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **Authentication**: NextAuth.js
- **Database**: Prisma + PostgreSQL

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Configure your `.env.local`:
   ```
   DATABASE_URL="postgresql://..."
   AUTH_SECRET="your-secret-key"
   GEMINI_API_KEY="your-api-key"
   ```

4. Run Prisma migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/                 # Next.js app router
├── components/          # React components
│   ├── ui/             # UI primitives
│   └── workspace/      # Editor workspace panels
├── store/              # Redux store and slices
├── lib/                # Utilities and helpers
└── prisma/             # Database schema
```

## Author

**Pankaj Kumar**  
[LinkedIn](https://www.linkedin.com/in/iampankajk/)


