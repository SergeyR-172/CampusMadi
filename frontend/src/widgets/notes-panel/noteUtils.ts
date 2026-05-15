export const parseNoteText = (text: string): { title: string; body: string } => {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && "body" in parsed) {
      const p = parsed as { title?: string; body?: string };
      return { title: p.title ?? "", body: p.body ?? "" };
    }
  } catch {
    // plain text stored before JSON format was introduced
  }
  return { title: "", body: text };
};

export const serializeNote = (title: string, body: string): string =>
  JSON.stringify({ title, body });
