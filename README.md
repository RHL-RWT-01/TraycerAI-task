# Planning Layer API

REST API service that generates high-level planning for coding agents by analyzing codebases and producing human-readable plans.

## Features

- **Codebase Analysis**: Analyzes code structure and patterns
- **LLM-powered Plan Generation**: Uses AI to create intelligent development plans
- **Human-readable Markdown Output**: Generates clear, structured plans in Markdown format

## Tech Stack

- **TypeScript**: Type-safe JavaScript
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **Zod**: Schema validation

## Setup Instructions

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and configure your API keys.

3. **Run development server:**

   ```bash
   npm run dev
   ```

4. **Build for production:**

   ```bash
   npm run build
   ```

5. **Start production server:**
   ```bash
   npm start
   ```

## Project Structure

```
src/
├── config/     # Environment configuration and settings
├── types/      # TypeScript type definitions and interfaces
└── utils/      # Helper functions and shared utilities
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run type-check` - Type checking without emitting files
