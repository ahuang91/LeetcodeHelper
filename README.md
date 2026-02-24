# LeetHelper

A web app that analyzes your LeetCode submission history using AI to provide personalized feedback on your problem-solving journey.

## Features

- View your recent LeetCode submissions grouped by problem and topic
- Analyze submission history with Gemini, Claude, or OpenAI to understand:
  - How your thinking evolved across attempts
  - Common mistakes and misconceptions
  - Suggestions for improvement
- Analyze all problems in a topic category in a single AI call
- Track which submissions you've already analyzed
- Supports multiple AI providers: Google Gemini, Anthropic Claude, OpenAI ChatGPT

## Getting Started

### Prerequisites

- Node.js 18+
- A LeetCode account
- An API key for at least one supported AI provider

### Installation

```bash
git clone <repo-url>
cd leethelper
npm install
```

### Running

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment Modes

The app supports two deployment modes controlled by the `DEPLOYMENT_MODE` environment variable in `.env.local`:

### Single-User Mode

Best for personal use or self-hosting.

```env
DEPLOYMENT_MODE=single-user
GEMINI_API_KEY=your-gemini-key
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
```

In this mode:
- API keys are configured server-side via environment variables
- The API key input fields are hidden on the homepage
- Users only need to enter their LeetCode credentials

### Multi-User Mode (Default)

Best for deploying the app for others to use with their own API keys.

```env
DEPLOYMENT_MODE=multi-user
```

In this mode:
- Users provide their own API keys via the homepage
- API keys are stored in the browser's localStorage (isolated per user)
- Optionally set server-side API keys as a fallback for users who don't provide one

## Tech Stack

- [Next.js](https://nextjs.org/) — React framework (App Router)
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [Google Generative AI](https://ai.google.dev/) — Gemini API
- [Anthropic SDK](https://docs.anthropic.com/) — Claude API
- [OpenAI SDK](https://platform.openai.com/docs) — ChatGPT API
- [leetcode-query](https://www.npmjs.com/package/leetcode-query) — LeetCode API client

## Privacy

- LeetCode credentials and API keys are stored in your browser's localStorage only
- No data is sent to any server except LeetCode (for fetching submissions) and your chosen AI provider (for analysis)
