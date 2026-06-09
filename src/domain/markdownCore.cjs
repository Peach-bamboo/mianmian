function parseTable(lines, startIndex) {
  const rows = []
  let cursor = startIndex
  while (cursor < lines.length && /^\s*\|.+\|\s*$/.test(lines[cursor])) {
    const cells = lines[cursor]
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim())

    const isDivider = cells.every(cell => /^:?-{2,}:?$/.test(cell))
    if (!isDivider) rows.push(cells)
    cursor += 1
  }
  return { rows, nextIndex: cursor }
}

function parseInline(text) {
  const source = String(text || '')
  const runs = []
  const tokenPattern = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)]+\))/g
  let cursor = 0
  let match

  while ((match = tokenPattern.exec(source))) {
    if (match.index > cursor) {
      runs.push({ type: 'text', text: source.slice(cursor, match.index) })
    }

    const token = match[0]
    if (token.startsWith('**')) {
      runs.push({ type: 'strong', text: token.slice(2, -2) })
    } else if (token.startsWith('`')) {
      runs.push({ type: 'inlineCode', text: token.slice(1, -1) })
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      runs.push({
        type: 'link',
        text: linkMatch?.[1] || token,
        href: linkMatch?.[2] || ''
      })
    }

    cursor = match.index + token.length
  }

  if (cursor < source.length) {
    runs.push({ type: 'text', text: source.slice(cursor) })
  }

  return runs.length ? runs : [{ type: 'text', text: source }]
}

function createTextBlock(type, text) {
  return { type, text, runs: parseInline(text) }
}

function parseMarkdown(content) {
  const lines = String(content || '').replace(/\r\n/g, '\n').split('\n')
  const parsed = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    const codeMatch = trimmed.match(/^```(\w+)?/)
    if (codeMatch) {
      const codeLines = []
      index += 1
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index])
        index += 1
      }
      parsed.push({ type: 'code', lang: codeMatch[1] || '', text: codeLines.join('\n') })
      index += 1
      continue
    }

    if (/^\s*\|.+\|\s*$/.test(line) && /^\s*\|?\s*:?-{2,}:?/.test(lines[index + 1] || '')) {
      const table = parseTable(lines, index)
      parsed.push({ type: 'table', rows: table.rows })
      index = table.nextIndex
      continue
    }

    const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/)
    if (imageMatch) {
      parsed.push({ type: 'image', alt: imageMatch[1], src: imageMatch[2] })
      index += 1
      continue
    }

    if (trimmed.startsWith('### ')) {
      parsed.push(createTextBlock('heading3', trimmed.replace(/^###\s+/, '')))
      index += 1
      continue
    }

    if (trimmed.startsWith('## ')) {
      parsed.push(createTextBlock('heading2', trimmed.replace(/^##\s+/, '')))
      index += 1
      continue
    }

    if (trimmed.startsWith('# ')) {
      parsed.push(createTextBlock('heading1', trimmed.replace(/^#\s+/, '')))
      index += 1
      continue
    }

    if (trimmed.startsWith('>')) {
      parsed.push(createTextBlock('quote', trimmed.replace(/^>\s?/, '')))
      index += 1
      continue
    }

    if (/^([-*]|\d+\.)\s+/.test(trimmed)) {
      parsed.push(createTextBlock('list', trimmed.replace(/^([-*]|\d+\.)\s+/, '• ')))
      index += 1
      continue
    }

    parsed.push(createTextBlock('paragraph', trimmed))
    index += 1
  }

  return parsed
}

module.exports = {
  parseInline,
  parseMarkdown,
  parseTable
}
