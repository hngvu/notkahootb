// Normalize different newline styles and BOMs into a consistent LF format
function normalizeText(raw) {
  if (!raw) return '';
  // Remove BOM if present
  let s = raw.replace(/^\uFEFF/, '');
  // Normalize Windows and old Mac line endings to LF
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Trim trailing spaces on lines
  s = s.split('\n').map(line => line.replace(/\s+$/g, '')).join('\n');
  return s.trim();
}

// Best-effort decode: handle UTF-8 (with/without BOM), UTF-16LE/BE
function decodeBuffer(buffer) {
  if (!buffer || buffer.length < 2) return buffer.toString('utf8');
  const b0 = buffer[0];
  const b1 = buffer[1];
  // UTF-16 LE BOM FF FE
  if (b0 === 0xFF && b1 === 0xFE) {
    return buffer.toString('utf16le');
  }
  // UTF-16 BE BOM FE FF -> swap to LE then decode
  if (b0 === 0xFE && b1 === 0xFF) {
    const swapped = Buffer.allocUnsafe(buffer.length);
    for (let i = 0; i + 1 < buffer.length; i += 2) {
      swapped[i] = buffer[i + 1];
      swapped[i + 1] = buffer[i];
    }
    return swapped.toString('utf16le');
  }
  // Default: UTF-8
  return buffer.toString('utf8');
}

export async function parseQuestionFile(fileData) {
  // Read the entire file stream chunk by chunk to ensure complete content
  const chunks = [];
  for await (const chunk of fileData.file) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const content = decodeBuffer(buffer);
  return parseQuestionText(content);
}

export function parseQuestionText(content) {
  const text = normalizeText(content);
  const questions = [];

  // Split on one-or-more blank lines, allowing whitespace-only lines between questions
  let blocks = text.split(/\n\s*\n+/).filter(block => block.trim().length > 0);

  // Fallback: if only one block found, try grouping every 6 non-empty lines (question + 4 options + answer)
  if (blocks.length <= 1) {
    const allLines = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !/^#/.test(l));
    const chunked = [];
    for (let i = 0; i + 5 < allLines.length; i += 6) {
      chunked.push(allLines.slice(i, i + 6).join('\n'));
    }
    if (chunked.length > 1) {
      blocks = chunked;
    }
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    // Support CRLF already normalized; remove comment lines starting with '#'
    const lines = block
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !/^#/.test(line));

    if (lines.length < 6) {
      continue;
    }

    // Take first 6 lines only (question + 4 options + answer index)
    const [qText, opt1, opt2, opt3, opt4, answerRaw] = lines.slice(0, 6);
    const correctIndex = parseInt(String(answerRaw).trim(), 10) - 1;

    const question = {
      text: qText,
      options: [opt1, opt2, opt3, opt4],
      correctIndex
    };

    if (isNaN(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) {
      throw new Error(`Invalid correct index in question ${i + 1}: ${answerRaw}. Must be between 1 and 4.`);
    }

    questions.push(question);
  }

  if (questions.length === 0) {
    throw new Error('No valid questions found. Ensure questions are separated by a blank line.');
  }

  return questions;
}