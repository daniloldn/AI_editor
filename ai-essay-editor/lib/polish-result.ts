type ParsedPolishResult = {
  polishedParagraph: string;
  explanation: string;
};

function extractFirstTaggedSection(text: string, tags: string[]) {
  for (const tag of tags) {
    const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = text.match(
      new RegExp(`<${escapedTag}>\\s*([\\s\\S]*?)\\s*<\\/${escapedTag}>`, "i"),
    );
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

export function parsePolishResult(storedText: string): ParsedPolishResult {
  const normalized = storedText.trim();
  const polishedParagraph = extractFirstTaggedSection(normalized, [
    "polished",
    "polished_paragraph",
  ]);
  const explanation = extractFirstTaggedSection(normalized, [
    "explanation",
    "explanation_of_changes",
  ]);

  if (polishedParagraph) {
    return {
      polishedParagraph,
      explanation,
    };
  }

  const plainSectionMatch = normalized.match(
    /polished paragraph:\s*([\s\S]*?)(?:\n\s*explanation of changes:\s*([\s\S]*))?$/i,
  );
  if (plainSectionMatch) {
    return {
      polishedParagraph: (plainSectionMatch[1] ?? "").trim(),
      explanation: (plainSectionMatch[2] ?? "").trim(),
    };
  }

  return {
    polishedParagraph: normalized
      .replace(/<\/?(polished|polished_paragraph)>/gi, "")
      .replace(/<\/?(explanation|explanation_of_changes)>/gi, "")
      .replace(/\n\s*explanation of changes:\s*[\s\S]*$/i, "")
      .trim(),
    explanation: "",
  };
}

export function normalizePolishResultForStorage(rawText: string) {
  const parsed = parsePolishResult(rawText);

  if (!parsed.polishedParagraph) {
    return "";
  }

  if (!parsed.explanation) {
    return parsed.polishedParagraph;
  }

  return `<polished>
${parsed.polishedParagraph}
</polished>

<explanation>
${parsed.explanation}
</explanation>`;
}
