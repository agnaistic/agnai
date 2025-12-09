import { UI } from '/common/types'

const msgInlineLabels: Record<UI.MessageOption, string> = {
  edit: 'Edit',
  regen: 'Regenerate',
  prompt: 'Prompt View',
  fork: 'Fork',
  trash: 'Delete',
  attach: 'Attach',
  'schema-regen': 'Retry Schema',
  visible: 'Visibility',
  'gen-image': 'Gen Image',
  'gen-json': 'Gen JSON',
}

export function toInlineList(opts: UI.UISettings['msgOptsInline']) {
  const next = Object.entries(opts).map(([key, item], i) => ({
    id: i,
    value: key,
    label: msgInlineLabels[key as UI.MessageOption],
    enabled: item.outer,
  }))

  return next
}
