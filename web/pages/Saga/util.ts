import { v4 } from 'uuid'
import { sagaStore } from './state'
import { downloadJson } from '/web/shared/util'
import { toastStore } from '/web/store'
import { Saga } from '/common/types'

const emptyTemplate: Saga.Template = {
  _id: '',
  userId: '',
  name: '',
  byline: '',
  description: '',

  imagesEnabled: false,

  imagePrompt: '',
  display: '',

  init: '',
  loop: '',
  history: '',
  introduction: '',

  fields: [],
  lists: {},
  manual: [],
}

export function toSessionUrl(id: string) {
  return `/saga/${id}${location.search}`
}

export function exportTemplate(id: string) {
  const { templates } = sagaStore.getState()
  const template = templates.find((t) => t._id === id)

  if (!template) {
    toastStore.error(`Export failed: Could not find template`)
    return
  }

  downloadJson(template, `template_${id.slice(0, 4)}`)
}

export function validateTemplate(template: any): asserts template is Saga.Template {
  const missing: string[] = []

  for (const key of Object.keys(emptyTemplate)) {
    if (key in template === false) {
      missing.push(key)
    }
  }

  if (missing.length) {
    throw new Error(`Invalid template, missing keys: ${missing.join(', ')}`)
  }
}

export function importTemplate(template: any) {
  template.manual ??= []
  validateTemplate(template)

  const next = {
    ...template,
    _id: v4(),
  }

  sagaStore.importTemplate(next)
  return next
}

export function getTemplateFields(
  type: 'intro' | 'input' | 'response',
  template: Saga.Template,
  msg: Record<string, any>
) {
  const intro = extractFields(template.introduction || '{{scene}}')
  const input = extractFields('{{input}}')
  const response = extractFields(template.history).filter((field) => field !== 'input')

  const remainder = Object.entries(msg)
    .filter(([key, value]) => {
      if (value === undefined) return false
      if (key === 'input' || key === 'requestId') return false
      if (intro.includes(key) || response.includes(key)) return false
      return true
    })
    .map(([key]) => key)

  switch (type) {
    case 'intro':
      return intro.concat(remainder)

    case 'input':
      return input

    case 'response':
      return response.concat(remainder)
  }
}

function extractFields(prompt: string) {
  const names = prompt
    .match(/{{([a-z0-9_-]+)}}/gi)
    ?.map((text) => text.replace('{{', '').replace('}}', '').trim())

  if (!names) return []
  return names
}
