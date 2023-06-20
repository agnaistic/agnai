export function extractSystemPromptFromLegacyGaslight(legacyGaslight: string): {
  systemPrompt: string
  gaslight: string
} {
  const firstPlaceholderPos =
    /{{(personality|memory|scenario|example_dialogue|all_personalities)}}/gi.exec(
      legacyGaslight
    )?.index

  const noChange = { systemPrompt: '', gaslight: '{{system_prompt}}\n' + legacyGaslight }

  // No {{personality}} placeholder in gaslight, we don't know what the user is
  // trying to achieve so no change
  if (firstPlaceholderPos == null) return noChange

  const everythingBeforePersonalityPlaceholder = legacyGaslight.slice(0, firstPlaceholderPos).trim()
  const sentenceStartersMatches = [...everythingBeforePersonalityPlaceholder.matchAll(/[.\n\]]/g)]

  // There's only one sentence before the {{personality}} placeholder, so we're
  // going to assume it says something like "{{char}}'s persona:", therefore
  // empty system prompt, therefore no change
  if (sentenceStartersMatches.length === 0) return noChange

  // I'm not sure if this case can happen, but let's include it just in case, to
  // prevent runtime errors
  if (sentenceStartersMatches[sentenceStartersMatches.length - 1]!.index === undefined)
    return noChange

  const startOfLastSentenceBeforePersonalityPlaceholder =
    sentenceStartersMatches[sentenceStartersMatches.length - 1]!.index! + 1

  const systemPrompt = legacyGaslight
    .slice(0, startOfLastSentenceBeforePersonalityPlaceholder)
    .trim()
  const newGaslight =
    '{{system_prompt}}\n' +
    legacyGaslight.slice(startOfLastSentenceBeforePersonalityPlaceholder).trim()

  return { systemPrompt, gaslight: newGaslight }
}
