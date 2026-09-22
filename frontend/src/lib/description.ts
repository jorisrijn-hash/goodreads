/**
 * Book descriptions come from Open Library, where some carry the source's own markup:
 * citation links ("([source][1])"), reference definitions ("[1]: https://…"), inline
 * links, emphasis asterisks, bare URLs, and a "---" rule before lists of other editions
 * ("Also contained in: …"). None of that is the description.
 *
 * `cleanDescription` keeps every sentence of prose and removes only markup: link text
 * stays, link targets go; nothing is summarised or rewritten.
 */
export function cleanDescription(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let text = raw;
  // Everything after a horizontal rule is a list of related editions, not the description.
  text = text.split(/(?:^|\s)-{3,}(?:\s|$)/)[0];
  // Citation links and their definitions.
  text = text.replace(/\(\s*\[(?:source|Source)[^\]]*\]\[\d+\]\s*\)/g, "");
  text = text.replace(/\[\d+\]:\s*\S+/g, "");
  // Links: keep the words, drop the target.
  text = text.replace(/\[([^\]]+)\]\[\d+\]/g, "$1");
  text = text.replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, "$1");
  // Bare URLs.
  text = text.replace(/https?:\/\/\S+/g, "");
  // Emphasis markers (***bold italic***, **bold**, __bold__, *italic*).
  text = text.replace(/(\*{1,3}|_{2})(\S(?:[^*_]*?\S)?)\1/g, "$2");
  // Emphasis left unclosed by the source, and encyclopedia footnote markers glued to a
  // word ("civilization,[16]"). A citation in the text itself ("P. [4] of cover") stays.
  text = text.replace(/\*{2,}/g, "");
  text = text.replace(/(?<=[\w.,;:!?"”’)])\[\d{1,3}\]/g, "");
  // Tidy what the removals leave behind.
  text = text
    .split(/\n\s*\n/)
    .map((para) => para.replace(/[ \t]+/g, " ").replace(/\s+([.,;:!?])/g, "$1").replace(/\(\s*\)/g, "").trim())
    .filter(Boolean)
    .join("\n\n");
  return text || null;
}

/**
 * Splits a description into a short opening (whole sentences, at least `min` characters
 * where possible) and the rest, so the page can open with the first lines and continue
 * the same text further down without repeating any of it.
 */
export function splitLede(text: string, min = 140, max = 320): { lede: string; rest: string } {
  const firstPara = text.split("\n\n")[0];
  const boundary = /[.!?]["”’)]?\s+(?=["“‘(]?[A-Z0-9])/g;
  let cut = -1;
  for (const match of firstPara.matchAll(boundary)) {
    const end = (match.index ?? 0) + match[0].length;
    if (end > max && cut !== -1) break;
    cut = end;
    if (end >= min) break;
  }
  if (cut === -1 || cut >= text.length) return { lede: text, rest: "" };
  return { lede: text.slice(0, cut).trim(), rest: text.slice(cut).trim() };
}

/**
 * Breaks very long paragraphs (the source often has none) at sentence boundaries into
 * paragraphs of roughly `target` characters. Presentation only: every word stays, in order.
 */
export function paragraphs(text: string, target = 480, longerThan = 760): string[] {
  const out: string[] = [];
  for (const para of text.split("\n\n")) {
    if (para.length <= longerThan) {
      out.push(para);
      continue;
    }
    const sentences = para.split(/(?<=[.!?]["”’)]?)\s+(?=["“‘(]?[A-Z0-9])/);
    let current = "";
    for (const sentence of sentences) {
      current = current ? `${current} ${sentence}` : sentence;
      if (current.length >= target) {
        out.push(current);
        current = "";
      }
    }
    if (current) {
      // A short tail joins the paragraph before it rather than standing alone.
      if (current.length < target / 3 && out.length) out[out.length - 1] += ` ${current}`;
      else out.push(current);
    }
  }
  return out;
}
