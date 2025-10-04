import { AnalysisResponse } from "../../schemas/analysis.schema";

export function buildSystemPrompt(): string {
  return `You are an expert software architect and planning assistant.

Your task is to generate high-level implementation plans for coding tasks based on codebase analysis and task descriptions.

Guidelines:
- Plans should be human-readable, structured in Markdown format
- Focus on phases, not detailed code implementation
- Reference specific files and directories from the codebase when relevant
- Be concise but comprehensive
- Use clear section headers and bullet points
- Break down complex tasks into logical phases (3-6 phases typically)
- Consider the existing codebase structure and patterns`;
}

export function buildPlanGenerationPrompt(
  taskDescription: string,
  analysisResult: AnalysisResponse
): string {
  const contextSummary = buildContextSummary(analysisResult);

  return `## Task Description

${taskDescription}

## Codebase Analysis

${contextSummary}

## Instructions

Generate a high-level implementation plan with the following structure:

1. Break down the task into logical phases (3-6 phases typically)
2. For each phase, provide:
   - A clear phase title
   - 2-4 bullet points describing the work
   - Reference specific files or directories when relevant (use backticks for file paths)
3. Keep descriptions concise and actionable
4. Focus on WHAT needs to be done, not HOW to implement it
5. Consider the existing codebase structure and patterns

## Expected Output Format

Use this Markdown structure:

\`\`\`
Phase: [Phase Name]

- [Action item with file reference \`path/to/file.ts\`]
- [Action item]
- [Action item]

Phase: [Next Phase Name]

- [Action item]
- [Action item]
\`\`\`

Generate the implementation plan now:`;
}

export function buildContextSummary(analysisResult: AnalysisResponse): string {
  const { projectInfo, summary, codebasePath } = analysisResult;

  let contextSummary = "";

  // Project information
  if (projectInfo.name) {
    contextSummary += `**Project:** ${projectInfo.name}`;
    if (projectInfo.version) {
      contextSummary += ` v${projectInfo.version}`;
    }
    contextSummary += "\n\n";
  }

  contextSummary += `**Location:** \`${codebasePath}\`\n\n`;

  // File structure overview
  contextSummary += `**Structure:**\n`;
  contextSummary += `- ${summary.totalFiles} files across ${summary.totalDirectories} directories\n`;
  contextSummary += `- Estimated complexity: ${summary.estimatedComplexity}\n\n`;

  // File types breakdown
  const extensions = Object.entries(summary.filesByExtension)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (extensions.length > 0) {
    contextSummary += `**File Types:**\n`;
    extensions.forEach(([ext, count]) => {
      contextSummary += `- ${ext || "no extension"}: ${count} files\n`;
    });
    contextSummary += "\n";
  }

  // Dependencies
  if (
    projectInfo.dependencies &&
    Object.keys(projectInfo.dependencies).length > 0
  ) {
    const depCount = Object.keys(projectInfo.dependencies).length;
    contextSummary += `**Dependencies:** ${depCount} packages\n`;

    const topDeps = Object.keys(projectInfo.dependencies).slice(0, 5);
    if (topDeps.length > 0) {
      contextSummary += `**Key dependencies:** ${topDeps.join(", ")}\n`;
    }
    contextSummary += "\n";
  }

  // Enhanced context from analyzer (if available)
  const enhancedContext = (analysisResult as any).context;
  if (enhancedContext && enhancedContext.insights) {
    contextSummary += `**Architecture Insights:**\n`;
    enhancedContext.insights.slice(0, 3).forEach((insight: string) => {
      contextSummary += `- ${insight}\n`;
    });
  }

  return contextSummary.trim();
}
