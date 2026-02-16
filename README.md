# LeetCode Helper

A web app that analyzes your LeetCode submission history using AI to provide personalized feedback on your problem-solving journey.

## Features

- View your recent LeetCode submissions grouped by problem
- Analyze your submission history with Gemini, Claude, or OpenAI to understand:
  - How your thinking evolved across attempts
  - Common mistakes and misconceptions
  - Suggestions for improvement
- Track which submissions you've already analyzed
- Dark mode support

## Getting Started

### Prerequisites

- Node.js 20+
- A LeetCode account
- A Gemini API key (get one at [Google AI Studio](https://aistudio.google.com/apikey))

### Installation

```bash
git clone <repo-url>
cd leethelper
npm install
```

### Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Then edit `.env.local` to configure your deployment.

### Running

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment Modes

The app supports two deployment modes controlled by the `DEPLOYMENT_MODE` environment variable:

### Single-User Mode

Best for personal use or self-hosting for yourself.

```bash
# .env.local
DEPLOYMENT_MODE=single-user
GEMINI_API_KEY=your-api-key-here
ANTHROPIC_API_KEY=your-api-key-here
OPENAI_API_KEY=your-api-key-here
```

In this mode:
- The APIs key is configured server-side via environment variable
- The API key input field is hidden on the homepage
- Users only need to enter their LeetCode credentials

### Multi-User Mode (Default)

Best for deploying the app for others to use with their own API keys.

```bash
# .env.local
DEPLOYMENT_MODE=multi-user
```

In this mode:
- Users provide their own API keys via the homepage
- API keys are stored in the browser's localStorage (isolated per user)
- Optionally set same API keys as single-user mode as a fallback for users who don't provide one


## Tech Stack

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Google Generative AI](https://ai.google.dev/) - Gemini API for analysis
- [leetcode-query](https://www.npmjs.com/package/leetcode-query) - LeetCode API client

## Privacy

- LeetCode credentials are stored in your browser's localStorage only
- In multi-user mode, API keys are also stored in localStorage
- No data is sent to any server except LeetCode (for fetching submissions) and Google (for AI analysis)
