export function parsePolishResult(storedText: string) {
  const normalized = storedText.trim();
  const polishedMatch = normalized.match(
    /<polished>\s*([\s\S]*?)\s*<\/polished>/i,
  );
  const explanationMatch = normalized.match(
    /<explanation>\s*([\s\S]*?)\s*<\/explanation>/i,
  );

  if (polishedMatch) {
    return {
      polishedParagraph: polishedMatch[1].trim(),
      explanation: explanationMatch ? explanationMatch[1].trim() : "",
    };
  }

  return {
    polishedParagraph: normalized
      .replace(/<\/?polished>/gi, "")
      .replace(/<\/?explanation>/gi, "")
      .trim(),
    explanation: "",
  };
}
