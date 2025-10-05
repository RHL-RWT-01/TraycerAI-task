# Planning Layer API

REST API service that generates high-level planning for coding agents by analyzing codebases and producing human-readable plans.

## Features

- **Codebase Analysis**: Analyzes code structure and patterns
- **LLM-powered Plan Generation**: Uses AI to create intelligent development plans
- **Human-readable Markdown Output**: Generates clear, structured plans in Markdown format
- **Persistent plan storage with file-based JSON storage**: Plans are automatically saved for later retrieval
- **Plan retrieval and listing with pagination**: Easy access to historical plans with efficient pagination

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

## API Endpoints

### POST /api/plans

Generate a new plan

- **Request body**: `{ taskDescription }`
- **Response**: Plan object with UUID, Markdown plan, planning time

### GET /api/plans/:id

Retrieve a specific plan by UUID

- **Response**: Stored plan with status

### GET /api/plans

List all plans with pagination

- **Query params**: `page` (default 1), `limit` (default 10, max 100), `sortBy` (createdAt), `sortOrder` (asc|desc)
- **Response**: Paginated list of plans

### GET /health

Health check endpoint

## Storage

- Plans are stored as JSON files in `data/plans/` directory
- Each plan is saved with its UUID as the filename: `{uuid}.json`
- An index file (`data/plans/index.json`) maintains metadata for fast listing
- Plans include status tracking: `completed` or `failed`
- The `data/` directory is git-ignored to prevent committing user data

## Project Structure

```
src/
├── config/     # Environment configuration and settings
├── types/      # TypeScript type definitions and interfaces
├── utils/      # Helper functions and shared utilities
├── storage/    # Plan persistence and retrieval
└── data/plans/ # Stored plan JSON files (git-ignored)
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run type-check` - Type checking without emitting files

