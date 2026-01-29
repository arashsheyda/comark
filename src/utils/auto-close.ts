/**
 * Auto-closes unclosed markdown and MDC component syntax
 * Useful for streaming/incremental parsing where content may be partial
 */

// Pre-compiled regex patterns for better performance
const PATTERNS = {
  trailingWhitespace: /\s+$/,
  trailingAsterisks: /\*+$/,
  asteriskGlobal: /\*/g,
  doubleQuoteGlobal: /"/g,
  singleQuoteGlobal: /'/g,
  tildeGlobal: /~~/g,
} as const

// Pre-generated colon closers for common nesting depths (avoids repeat() calls)
const COLON_CLOSERS = ['', ':', '::', ':::', '::::', ':::::', '::::::', ':::::::'] as const

/**
 * Detects and auto-closes unclosed markdown inline syntax and MDC components
 *
 * @param markdown - The markdown content (potentially partial)
 * @returns The markdown with auto-closed syntax
 *
 * @example
 * ```typescript
 * autoCloseMarkdown('**bold text') // Returns: '**bold text**'
 * autoCloseMarkdown('::component\ncontent') // Returns: '::component\ncontent\n::'
 * autoCloseMarkdown(':::parent\n::child') // Returns: ':::parent\n::child\n::\n:::'
 * ```
 */
export function autoCloseMarkdown(markdown: string): string {
  if (!markdown || markdown.trim() === '') {
    return markdown
  }

  // Split once and share between functions to avoid redundant splitting
  const lines = markdown.split('\n')
  const lastLine = lines[lines.length - 1]

  // Step 1: Auto-close inline markdown syntax
  let result = autoCloseInlineSyntax(markdown, lastLine)

  // Step 2: Auto-close MDC block components (only if content changed or has components)
  if (result.includes('::')) {
    // Re-split only if markdown was modified by inline closing
    const updatedLines = result === markdown ? lines : result.split('\n')
    result = autoCloseMDCComponents(result, updatedLines)
  }

  return result
}

/**
 * Auto-closes unclosed inline markdown syntax (bold, italic, code, strikethrough)
 * Only closes markers that appear to be incomplete at the end of content
 */
function autoCloseInlineSyntax(markdown: string, lastLine: string): string {
  // Track what needs closing by scanning from the end
  // This prevents closing markers that are intentionally left open in the middle

  // Define markers in order (bold+italic, then bold, then italic to avoid conflicts)
  const markers = [
    { marker: '***', pattern: /\*\*\*(?:[^*]|\*(?!\*\*)|\*\*(?!\*))*$/ }, // bold+italic (strong emphasis)
    { marker: '**', pattern: /\*\*(?:[^*]|\*(?!\*))*$/ }, // bold - matches ** followed by content not ending with **
    { marker: '~~', pattern: /~~(?:[^~]|~(?!~))*$/ }, // strikethrough
    { marker: '`', pattern: /`[^`]*$/ }, // inline code
    { marker: '*', pattern: /\*(?!\s)[^*]*$/ }, // italic - must be after bold, not followed by space
  ]

  let closingSuffix = ''
  let trimTrailing = false

  // Pre-compute values used multiple times
  const hasTrailingWhitespace = PATTERNS.trailingWhitespace.test(lastLine)
  const trimmedLastLine = hasTrailingWhitespace ? lastLine.trimEnd() : lastLine

  // Check each marker
  for (const { marker, pattern } of markers) {
    if (pattern.test(lastLine)) {
      const markerLen = marker.length
      const markerChar = marker[0]

      // For asterisk-based markers (*, **, ***), handle partial closings
      if (markerChar === '*') {
        // Check if line ends with asterisks (indicates partial closing)
        const endsWithAsterisks = PATTERNS.trailingAsterisks.test(trimmedLastLine)

        // Count total asterisks in the line (use pre-compiled regex)
        const asteriskCount = (lastLine.match(PATTERNS.asteriskGlobal) || []).length

        // Calculate remainder when dividing by (markerLen * 2)
        // markerLen * 2 represents one complete open + close pair
        const remainder = asteriskCount % (markerLen * 2)

        // If remainder is 0, this marker is properly closed, skip it
        if (remainder === 0) {
          continue
        }

        // If remainder equals markerLen, we have exactly one opening marker
        if (remainder === markerLen) {
          // Check if line starts with more asterisks than this marker (e.g., *** when checking **)
          // This prevents "***text***" from being seen as unclosed **
          const startsWithMoreAsterisks = new RegExp('^\\*{' + (markerLen + 1) + ',}').test(lastLine)
          if (startsWithMoreAsterisks) {
            continue // This line uses a different (longer) marker
          }

          // Additional check: ensure line doesn't already have complete pairs and end with non-asterisk
          // This prevents false positives like "**bold** and *italic*" being seen as unclosed **
          const completePairPattern = new RegExp(escapeRegex(marker) + '[^*]+' + escapeRegex(marker))
          const hasCompletePair = completePairPattern.test(lastLine)

          if (hasCompletePair && !endsWithAsterisks) {
            continue // Skip, this is a false match
          }

          if (hasTrailingWhitespace) {
            trimTrailing = true
          }
          closingSuffix = marker
          break
        }
        // If line ends with asterisks AND remainder shows partial closing
        else if (endsWithAsterisks && remainder > markerLen && remainder < markerLen * 2) {
          const needed = (markerLen * 2) - remainder
          if (hasTrailingWhitespace) {
            trimTrailing = true
          }
          closingSuffix = '*'.repeat(needed)
          break
        }
      }
      // For non-asterisk markers, use the original logic
      else {
        // Use pre-compiled regex for strikethrough
        const count = marker === '~~'
          ? (lastLine.match(PATTERNS.tildeGlobal) || []).length
          : (lastLine.match(new RegExp(escapeRegex(marker), 'g')) || []).length

        if (count % 2 === 1) {
          // Preserve whitespace for inline code (spaces are significant in code)
          if (marker !== '`' && hasTrailingWhitespace) {
            trimTrailing = true
          }
          closingSuffix = marker
          break
        }
      }
    }
  }

  // If we need to close and there's trailing whitespace, trim it first
  if (closingSuffix && trimTrailing) {
    return markdown.trimEnd() + closingSuffix
  }

  return markdown + closingSuffix
}

/**
 * Auto-closes unclosed MDC block components
 * Handles nested components by tracking the marker depth (::, :::, ::::, etc.)
 * Also closes incomplete props {...}
 */
function autoCloseMDCComponents(markdown: string, lines: string[]): string {
  let result = markdown

  // Check for incomplete props on the last line
  const lastLine = lines[lines.length - 1]
  if (lastLine) {
    // Check if there's an unclosed brace
    const openBraceMatch = lastLine.match(/\{[^}]*$/)
    if (openBraceMatch) {
      const propsContent = openBraceMatch[0].substring(1) // Remove the opening {

      // Single-pass quote counting using pre-compiled patterns
      const doubleQuotes = (propsContent.match(PATTERNS.doubleQuoteGlobal) || []).length
      const singleQuotes = (propsContent.match(PATTERNS.singleQuoteGlobal) || []).length

      let closing = ''

      // Close unclosed quotes
      if (doubleQuotes % 2 === 1) {
        closing += '"'
      }
      if (singleQuotes % 2 === 1) {
        closing += '\''
      }

      // Always close the brace
      closing += '}'

      result += closing
      lines[lines.length - 1] = lastLine + closing
    }
  }

  // Stack to track unclosed components with their marker count
  const unclosedStack: Array<{ markerCount: number, name: string }> = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Match opening component: ::component, :::component, etc.
    const openMatch = trimmed.match(/^(:+)([a-z$][$\w.-]*)/i)
    if (openMatch) {
      const markerCount = openMatch[1].length
      const componentName = openMatch[2]

      // Check if this line is ONLY the closing marker
      const isClosing = trimmed === openMatch[1] && markerCount >= 2

      if (isClosing) {
        // This is a closing marker - pop from stack if it matches
        if (unclosedStack.length > 0) {
          const last = unclosedStack[unclosedStack.length - 1]
          if (last.markerCount === markerCount) {
            unclosedStack.pop()
          }
        }
      }
      else if (componentName && markerCount >= 2) {
        // This is an opening component
        unclosedStack.push({ markerCount, name: componentName })
      }
    }

    // Match closing marker: ::, :::, etc. (standalone)
    const closeMatch = trimmed.match(/^(:+)$/)
    if (closeMatch && closeMatch[1].length >= 2) {
      const markerCount = closeMatch[1].length

      // Pop matching component from stack
      if (unclosedStack.length > 0) {
        const last = unclosedStack[unclosedStack.length - 1]
        if (last.markerCount === markerCount) {
          unclosedStack.pop()
        }
      }
    }
  }

  // Add closing markers for any unclosed components (in reverse order)
  // Use array join pattern for better performance with multiple closers
  const closers: string[] = []
  while (unclosedStack.length > 0) {
    const component = unclosedStack.pop()!
    // Use pre-generated closers for common depths, fallback to repeat() for deep nesting
    const closer = component.markerCount < COLON_CLOSERS.length
      ? COLON_CLOSERS[component.markerCount]
      : ':'.repeat(component.markerCount)
    closers.push(closer)
  }

  return closers.length > 0 ? result + '\n' + closers.join('\n') : result
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Checks if markdown content has unclosed syntax without modifying it
 * Useful for validation or showing warnings
 *
 * @param markdown - The markdown content to check
 * @returns Object with information about unclosed syntax
 */
export function detectUnclosedSyntax(markdown: string): {
  hasUnclosed: boolean
  unclosedInline: string[]
  unclosedComponents: Array<{ markerCount: number, name: string }>
} {
  const original = markdown
  const closed = autoCloseMarkdown(markdown)

  const hasUnclosed = original !== closed
  const unclosedInline: string[] = []
  const unclosedComponents: Array<{ markerCount: number, name: string }> = []

  if (!hasUnclosed) {
    return { hasUnclosed: false, unclosedInline, unclosedComponents }
  }

  // Analyze what was closed
  const lines = markdown.split('\n')
  const lastLine = lines[lines.length - 1]

  // Check inline syntax
  if (/\*\*[^*\n]+$/.test(lastLine))
    unclosedInline.push('**bold**')
  if (/\*[^*\n]+$/.test(lastLine) && !unclosedInline.includes('**bold**'))
    unclosedInline.push('*italic*')
  if (/`[^`\n]+$/.test(lastLine))
    unclosedInline.push('`code`')
  if (/~~[^~\n]+$/.test(lastLine))
    unclosedInline.push('~~strikethrough~~')

  // Check components
  const unclosedStack: Array<{ markerCount: number, name: string }> = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    const openMatch = trimmed.match(/^(:+)([a-z$][$\w.-]*)/i)
    if (openMatch) {
      const markerCount = openMatch[1].length
      const componentName = openMatch[2]
      const isClosing = trimmed === openMatch[1] && markerCount >= 2

      if (!isClosing && componentName && markerCount >= 2) {
        unclosedStack.push({ markerCount, name: componentName })
      }
    }

    const closeMatch = trimmed.match(/^(:+)$/)
    if (closeMatch && closeMatch[1].length >= 2) {
      const markerCount = closeMatch[1].length
      if (unclosedStack.length > 0) {
        const last = unclosedStack[unclosedStack.length - 1]
        if (last.markerCount === markerCount) {
          unclosedStack.pop()
        }
      }
    }
  }

  return {
    hasUnclosed: true,
    unclosedInline,
    unclosedComponents: unclosedStack,
  }
}
