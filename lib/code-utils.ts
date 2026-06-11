export function stripFences(code: string): string {
  let c = code.trim();
  if (c.startsWith("```")) c = c.replace(/^```\w*\n?/, "");
  if (c.endsWith("```")) c = c.replace(/```$/, "");
  // Strip any text preamble before the first import/export statement
  const codeStart = c.search(/^(import |export )/m);
  if (codeStart > 0) c = c.slice(codeStart);
  return c;
}

// Count braces/parens. Skip single quotes — apostrophes in JSX text (e.g. "We'll") cause false positives.
export function countDelimiters(code: string) {
  let braces = 0, parens = 0, inString: string | null = null, escaped = false;
  for (const ch of code) {
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (inString) { if (ch === inString) inString = null; continue; }
    if (ch === '"' || ch === '`') { inString = ch; continue; }
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '(') parens++;
    if (ch === ')') parens--;
  }
  return { braces, parens };
}

// Strip trailing non-code text (model reasoning, second code blocks) that
// sometimes appears after a complete React component.
export function stripPostamble(code: string): string {
  const lines = code.split('\n');
  let prevBlank = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      prevBlank = true;
      continue;
    }

    // Embedded markdown fence — strong signal, no blank line required
    if (line.startsWith('```') && i > 0) {
      return lines.slice(0, i).join('\n').trimEnd();
    }

    // After a blank line, check for natural-language patterns that LLMs
    // emit when they start "thinking out loud" after generating code.
    if (prevBlank && i > 5) {
      if (/^(Wait|Let me|I need|I should|I'll|Note[:\s]|Actually|Here'?s|However|Looking|Now[,\s]|To |In this|For the|\d+\.\s)/.test(line)) {
        return lines.slice(0, i).join('\n').trimEnd();
      }
    }

    prevBlank = false;
  }
  return code;
}

export function autoClose(code: string): string {
  let c = stripFences(code);
  c = stripPostamble(c);
  const { braces, parens } = countDelimiters(c);
  if (parens > 0) c += '\n' + ')'.repeat(parens);
  if (braces > 0) c += '\n' + '}'.repeat(braces);
  return c;
}

// More robust string closer (handles ", ', and `).
// The original countDelimiters intentionally ignored ' to avoid apostrophe false-positives;
// this pass is a final "best effort" closer for LLM streaming truncations.
function closeOpenStrings(code: string): string {
  let result = code;
  // If it ends inside a string, append the closing quote + a safe terminator.
  const lastSingle = result.lastIndexOf("'");
  const lastDouble = result.lastIndexOf('"');
  const lastBack = result.lastIndexOf('`');

  const maxLast = Math.max(lastSingle, lastDouble, lastBack);
  if (maxLast === -1) return result;

  const candidates = [
    { idx: lastSingle, char: "'" },
    { idx: lastDouble, char: '"' },
    { idx: lastBack, char: '`' },
  ].filter(c => c.idx !== -1);

  // Pick the rightmost opener that is still open at the end of the file.
  // Simple heuristic: if the total count of that quote char is odd, it's likely open.
  for (const { char } of candidates.sort((a, b) => b.idx - a.idx)) {
    const count = (result.match(new RegExp(`\\${char}`, 'g')) || []).length;
    if (count % 2 === 1) {
      // Close the string, then try to close the current object/array expression if it makes sense.
      result += char;
      // If right after a partial value like: foo: 'bar   <EOF>   try to finish the object
      if (/:\s*['"`][^'"`]*$/.test(result.slice(0, -1))) {
        result += " }";
      }
      break;
    }
  }
  return result;
}

// Best-effort repair for the very common case where an LLM streams an array of
// objects (e.g. healthItems, cards, list items) and the last object gets cut off
// mid-key or mid-value. We drop the last incomplete item and close the array.
function repairIncompleteLastArrayItem(code: string): string {
  // Look for a pattern like: const fooItems = [ ... , { title: 'X', subtitle: 'Y'   <incomplete>
  // We find the last top-level `[` that looks like the start of an items array, then
  // cut after the last *complete* object (one that has a closing `}` and preferably a title-like key).
  const lines = code.split('\n');
  let lastArrayStart = -1;
  let lastCompleteObjectEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/=\s*\[\s*$/.test(l.trim()) || /:\s*\[\s*$/.test(l.trim())) {
      lastArrayStart = i;
      lastCompleteObjectEnd = -1;
    }
    // A reasonably complete object line usually ends with }, or has several , separated keys
    if (lastArrayStart !== -1) {
      if (/}\s*,?\s*$/.test(l.trim()) && /title|label|name|heading/i.test(l)) {
        lastCompleteObjectEnd = i;
      }
    }
  }

  if (lastArrayStart !== -1 && lastCompleteObjectEnd > lastArrayStart) {
    // Rebuild up to the last good object, then close the array + any open parens we may have.
    const kept = lines.slice(0, lastCompleteObjectEnd + 1);
    let rebuilt = kept.join('\n');
    // Close the array
    if (!rebuilt.trimEnd().endsWith(']')) {
      rebuilt = rebuilt.trimEnd() + '\n]';
    }
    // If there was more code after the array (e.g. the rest of the component), append a minimal safe continuation.
    const tail = lines.slice(lastCompleteObjectEnd + 1).join('\n').trim();
    if (tail && !/^\s*[\]\}\)]/.test(tail)) {
      // very conservative: just close structures and stop
      rebuilt += '\n' + tail.replace(/,\s*$/, '');
    }
    return rebuilt;
  }

  return code;
}

export function prepareCodeForPreview(raw: string): string {
  let c = autoClose(raw);
  c = closeOpenStrings(c);
  c = repairIncompleteLastArrayItem(c);
  // One more pass of autoClose in case the repairs introduced new open braces
  const { braces, parens } = countDelimiters(c);
  if (parens > 0) c += '\n' + ')'.repeat(parens);
  if (braces > 0) c += '\n' + '}'.repeat(braces);
  return c.trim();
}
