import { AppSchema } from './types'

export function extractReasoning(
  content: string,
  opts?: { tags?: AppSchema.UserGenPreset['reasoning']; display?: 'all' | 'post' | 'pre' }
) {
  const display = opts?.display || 'all'
  const open = opts?.tags?.start || '<think>'
  const close = opts?.tags?.end || '</think>'

  if (!open || !close) return { thoughts: [], content }

  const len = {
    open: open.length,
    close: close.length,
  }

  const thoughts: string[] = []

  if (!content) return { thoughts, content }

  const init = {
    start: content.indexOf(open),
    end: content.indexOf(close),
  }

  // No thoughts, skip everything
  if (init.start === -1 && init.end === -1) {
    return { content, thoughts: [] }
  }

  if (init.start === 0 && init.end === -1) {
    return { content, thoughts }
  }

  while (true) {
    const start = content.indexOf(open)
    const end = content.indexOf(close)

    // Both present, but end comes before start
    if (start > -1 && end > -1 && start > end) {
      let pre = content.slice(0, end)

      let thought = content.slice(start + len.open)
      const nextEnd = thought.indexOf(close)

      // There is another end tag
      if (nextEnd > -1) {
        const innerThought = thought.slice(0, nextEnd)
        const post = thought.slice(nextEnd + len.close)
        content = `${pre.trim()}\n${post.trim()}`
        thought = innerThought
        thoughts.push(thought)
        continue
      }

      thoughts.push(thought)
      return { content: pre, thoughts }
    }

    // Both tags present
    if (start > -1 && end > -1) {
      const pre = content.slice(0, start)
      const post = content.slice(end + len.close)
      const thought = content.slice(start + len.open, end)
      thoughts.push(thought)

      // Case 1. Only display pre-thought text
      if (display === 'pre') {
        return { content: pre, thoughts }
      }

      // Case 2. Only display post-thought text
      if (display === 'post') {
        content = post.trim()
      }

      // Case 3. Display all non-thought (pre and post) text
      else {
        content = `${pre.trim()}\n${post.trim()}`
      }

      continue
    }

    // Only opening tag
    if (start > -1) {
      const pre = content.slice(0, start)
      const thought = content.slice(start + len.open)

      content = pre
      thoughts.push(thought)
      break
    }

    // Only closing tag
    if (end > -1) {
      const post = content.slice(end + len.close)
      const thought = content.slice(0, end)
      thoughts.push(thought)
      content = post
      break
    }

    // Should never get here
    break
  }

  return { thoughts: thoughts.filter((t) => !!t.trim()), content: content.trim() }
}
