import logger from "../utils/logger";

export function parsePlanFromResponse(content: string): string {
  logger.info("Parsing plan from LLM response");

  // Clean the response
  let cleanedContent = content.trim();

  // Remove markdown code fences if present
  cleanedContent = cleanedContent.replace(/^```(?:markdown)?$/gm, "");
  cleanedContent = cleanedContent.replace(/^```$/gm, "");

  // Remove common preamble text
  const preamblePatterns = [
    /^(?:Here's the|Here is the|The following is|Below is) (?:implementation )?plan[:\s]/i,
    /^(?:Based on|Given) the (?:task|codebase)[^:]*:[:\s]/i,
    /^I'll (?:create|generate|provide)[^:]*:[:\s]/i,
    /^## Implementation Plan\s*/i,
  ];

  for (const pattern of preamblePatterns) {
    cleanedContent = cleanedContent.replace(pattern, "");
  }

  // Normalize line endings
  cleanedContent = cleanedContent.replace(/\r\n/g, "\n");

  // Validate structure
  const validation = validatePlanStructure(cleanedContent);
  if (!validation.isValid) {
    logger.warn("Plan structure validation failed", {
      issues: validation.issues,
    });
  } else {
    logger.info("Plan structure validation passed");
  }

  // Enhance formatting
  cleanedContent = enhanceFormatting(cleanedContent);

  logger.info("Plan parsing completed", {
    length: cleanedContent.length,
    phaseCount: (cleanedContent.match(/^Phase:/gim) || []).length,
  });

  return cleanedContent.trim();
}

export function validatePlanStructure(plan: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check minimum length
  if (plan.length < 50) {
    issues.push("Plan is too short (less than 50 characters)");
  }

  // Check maximum length
  if (plan.length > 10000) {
    issues.push("Plan is suspiciously long (more than 10,000 characters)");
  }

  // Check for phase markers
  const phaseMatches = plan.match(/^Phase:/gim);
  if (!phaseMatches || phaseMatches.length < 2) {
    issues.push("Plan should have at least 2 phases");
  }

  // Check for bullet points
  const bulletMatches = plan.match(/^\s*[-*]/gm);
  if (!bulletMatches || bulletMatches.length < 4) {
    issues.push("Plan should have at least 4 bullet points");
  }

  // Check for actionable language
  const actionWords = [
    "create",
    "implement",
    "add",
    "update",
    "modify",
    "setup",
    "configure",
    "build",
    "develop",
    "install",
    "integrate",
  ];
  const hasActionWords = actionWords.some((word) =>
    plan.toLowerCase().includes(word)
  );

  if (!hasActionWords) {
    issues.push("Plan should contain actionable language");
  }

  // Check phase-to-bullet ratio
  if (phaseMatches && bulletMatches) {
    const avgBulletsPerPhase = bulletMatches.length / phaseMatches.length;
    if (avgBulletsPerPhase < 2) {
      issues.push("Each phase should have at least 2 bullet points on average");
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

export function extractPhases(
  plan: string
): Array<{ title: string; items: string[] }> {
  const phases: Array<{ title: string; items: string[] }> = [];
  const lines = plan.split("\n");

  let currentPhase: { title: string; items: string[] } | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check for phase header
    const phaseMatch = trimmedLine.match(/^Phase:\s*(.+)$/i);
    if (phaseMatch) {
      // Save previous phase if exists
      if (currentPhase) {
        phases.push(currentPhase);
      }

      // Start new phase
      currentPhase = {
        title: phaseMatch[1].trim(),
        items: [],
      };
      continue;
    }

    // Check for bullet point
    const bulletMatch = trimmedLine.match(/^[-*]\s*(.+)$/);
    if (bulletMatch && currentPhase) {
      currentPhase.items.push(bulletMatch[1].trim());
    }
  }

  // Add last phase
  if (currentPhase) {
    phases.push(currentPhase);
  }

  return phases;
}

function enhanceFormatting(content: string): string {
  const lines = content.split("\n");
  const enhancedLines: string[] = [];
  let lastWasPhase = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines at the start
    if (enhancedLines.length === 0 && trimmedLine === "") {
      continue;
    }

    // Check if this is a phase header
    const isPhaseHeader = /^Phase:/i.test(trimmedLine);

    // Add spacing before phase headers (except the first one)
    if (isPhaseHeader && enhancedLines.length > 0 && !lastWasPhase) {
      enhancedLines.push("");
    }

    enhancedLines.push(line);
    lastWasPhase = isPhaseHeader;
  }

  return enhancedLines.join("\n");
}
