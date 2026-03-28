import "server-only";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = "gpt-4.1-mini";

// Replace this prompt text with your own instructions.
const POLISH_PROMPT_TEMPLATE = `
You are an academic writing assistant for a third-year biochemistry student.

Your task is to improve a paragraph for clarity, grammar, academic tone, and logical flow.

Constraints:
Do NOT change the original meaning.
Do NOT add new information or interpretations.
Do NOT remove headings
Preserve technical terminology unless it is clearly incorrect.
Make only necessary edits (avoid over-rewriting).
Prefer small, local edits over full sentence rewrites where possible.
If the paragraph is already high quality, make minimal or no changes.
Context usage:

Use the previous paragraphs only to:

maintain consistency in terminology and style
avoid unnecessary repetition
ensure logical continuity

Do NOT modify, repeat, or reference the context explicitly in your output.


Output format:

Polished paragraph:
<polished>
[improved paragraph]
</polished>

Explanation of changes:
<explanation>
Brief bullet points explaining key edits (e.g., clarity, grammar, flow, tone)
 </explanation>



Input:

Essay question:
<question>
{question}
</question>

Paragraph to polish:
<polish_paragraph>
{polish_paragraph}
</polish_paragraph>

Previous paragraphs (context only — do not modify or include in output):
<context>
{context}
</context>
`;

export class OpenAIKeyMissingError extends Error {
  constructor() {
    super("OPENAI_API_KEY is missing.");
    this.name = "OpenAIKeyMissingError";
  }
}

export class PromptInterpolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromptInterpolationError";
  }
}

export class CitationIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CitationIntegrityError";
  }
}

type PromptVariables = {
  question: string;
  polish_paragraph: string;
  context: string;
  references?: string;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function buildPrompt(template: string, variables: PromptVariables) {
  const requiredKeys: Array<keyof PromptVariables> = [
    "question",
    "polish_paragraph",
    "context",
  ];

  for (const key of requiredKeys) {
    if (typeof variables[key] !== "string") {
      throw new PromptInterpolationError(`Missing required variable: ${key}`);
    }
  }

  if (!variables.question.trim()) {
    throw new PromptInterpolationError("Missing required variable: question");
  }

  if (!variables.polish_paragraph.trim()) {
    throw new PromptInterpolationError(
      "Missing required variable: polish_paragraph",
    );
  }

  let prompt = template;
  const templatePlaceholders = new Set(
    (template.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).map((item) =>
      item.slice(1, -1),
    ),
  );

  for (const key of templatePlaceholders) {
    const value = variables[key as keyof PromptVariables];
    if (typeof value !== "string") {
      throw new PromptInterpolationError(`Missing required variable: ${key}`);
    }
    const token = `{${key}}`;
    prompt = prompt.split(token).join(value);
  }

  const unresolved = [...templatePlaceholders].filter((key) =>
    prompt.includes(`{${key}}`),
  );
  if (unresolved && unresolved.length > 0) {
    throw new PromptInterpolationError(
      `Unresolved prompt placeholders: ${unresolved.map((key) => `{${key}}`).join(", ")}`,
    );
  }

  return prompt;
}

function extractPolishedText(data: OpenAIResponse) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const contentParts =
    data.output
      ?.flatMap((item) => item.content ?? [])
      .filter((part) => part.type === "output_text")
      .map((part) => (typeof part.text === "string" ? part.text : "").trim())
      .filter((part) => part.length > 0) ?? [];

  if (contentParts.length > 0) {
    return contentParts.join("\n").trim();
  }

  return "";
}

function buildCitationSafetyRules(references: string) {
  const referenceBlock = references.trim()
    ? `Provided reference list (use only these references):\n${references.trim()}`
    : "Provided reference list: (none provided)";

  return `
Citation integrity rules (must follow strictly):
- Preserve all citation markers from the input paragraph exactly as written.
- Do not change citation numbering or marker formatting.
- Do not invent any new citations.
- Do not remove existing citations.

${referenceBlock}
`;
}

function extractCitationMarkers(text: string) {
  const bracketStyle = text.match(/\[[^\[\]\n]{1,80}\]/g) ?? [];
  const parentheticalStyle =
    text.match(/\([A-Za-z][^()\n]{0,80}\d{4}[a-z]?[^()\n]{0,40}\)/g) ?? [];
  return [...bracketStyle, ...parentheticalStyle].map((marker) => marker.trim());
}

function haveSameMarkerMultiset(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false;
  }

  const counts = new Map<string, number>();

  for (const marker of a) {
    counts.set(marker, (counts.get(marker) ?? 0) + 1);
  }

  for (const marker of b) {
    const next = (counts.get(marker) ?? 0) - 1;
    if (next < 0) {
      return false;
    }
    counts.set(marker, next);
  }

  return [...counts.values()].every((count) => count === 0);
}

export async function polishParagraphWithOpenAI(variables: PromptVariables) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new OpenAIKeyMissingError();
  }

  const corePrompt = buildPrompt(POLISH_PROMPT_TEMPLATE, variables);
  const prompt = `${corePrompt}\n\n${buildCitationSafetyRules(
    variables.references ?? "",
  )}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: prompt,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    const polished = extractPolishedText(data);

    if (!polished) {
      throw new Error("OpenAI API returned empty output.");
    }

    const originalMarkers = extractCitationMarkers(variables.polish_paragraph);
    if (originalMarkers.length > 0) {
      const polishedMarkers = extractCitationMarkers(polished);
      if (!haveSameMarkerMultiset(originalMarkers, polishedMarkers)) {
        throw new CitationIntegrityError(
          "Citation markers were changed, removed, or added.",
        );
      }
    }

    return polished;
  } catch (error) {
    if (
      error instanceof OpenAIKeyMissingError ||
      error instanceof PromptInterpolationError ||
      error instanceof CitationIntegrityError
    ) {
      throw error;
    }

    throw new Error("Failed to polish paragraph with OpenAI.");
  } finally {
    clearTimeout(timeout);
  }
}
