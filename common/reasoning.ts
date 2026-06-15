import { AppSchema } from './types'

export function extractReasoning(
  message: string | { thoughts?: string; tokens?: string },
  opts?: { tags?: AppSchema.UserGenPreset['reasoning']; display?: 'all' | 'post' | 'pre' }
) {
  let content = ''

  const display = opts?.display || 'all'
  const defaults = {
    open: '<think>',
    close: '</think>',
  }
  const open = opts?.tags?.start || defaults.open
  const close = opts?.tags?.end || defaults.close

  if (message && typeof message !== 'string') {
    if (message.thoughts) content = `${open}${message.thoughts}${close}${message.tokens || ''}`
    else content = message.tokens || ''
  } else {
    content = message || ''
  }

  if (!open || !close) return { thoughts: [], content }

  const thoughts: string[] = []

  if (!content) return { thoughts, content }

  const init = {
    start: content.indexOf(open),
    end: content.indexOf(close),
    open,
    close,
  }

  if (init.start === -1 && open !== defaults.open) {
    init.start = content.indexOf(defaults.open)
    init.open = defaults.open
  }

  if (init.end === -1 && close !== defaults.close) {
    init.end = content.indexOf(defaults.close)
    init.close = defaults.close
  }

  // No thoughts, skip everything
  if (init.start === -1 && init.end === -1) {
    return { content, thoughts: [] }
  }

  if (init.start === 0 && init.end === -1) {
    return { content, thoughts }
  }

  while (true) {
    let start = content.indexOf(open)
    let end = content.indexOf(close)

    const used = {
      start: open,
      end: close,
    }

    if (open !== defaults.open && start === -1) {
      start = content.indexOf(defaults.open)
      used.start = defaults.open
    }

    if (close !== defaults.close && end === -1) {
      end = content.indexOf(defaults.close)
      used.end = defaults.close
    }

    // Both present, but end comes before start
    if (start > -1 && end > -1 && start > end) {
      let pre = content.slice(0, end)

      let thought = content.slice(start + used.start.length)
      const nextEnd = thought.indexOf(used.end)

      // There is another end tag
      if (nextEnd > -1) {
        const innerThought = thought.slice(0, nextEnd)
        const post = thought.slice(nextEnd + used.end.length)
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
      const post = content.slice(end + used.end.length)
      const thought = content.slice(start + used.start.length, end)
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
      const thought = content.slice(start + used.start.length)

      content = pre
      thoughts.push(thought)
      break
    }

    // Only closing tag
    if (end > -1) {
      const post = content.slice(end + used.end.length)
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
