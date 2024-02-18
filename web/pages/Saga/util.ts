import { v4 } from 'uuid'
import { sagaStore } from './state'
import { downloadJson } from '/web/shared/util'
import { toastStore } from '/web/store'
import { SagaTemplate } from '/web/store/data/saga'

const emptyTemplate: SagaTemplate = {
  _id: '',
  name: '',
  byline: '',
  description: '',

  display: '',

  init: '',
  loop: '',
  history: '',
  introduction: '',

  fields: [],
  lists: {},
  manual: [],
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

export function validateTemplate(template: any): asserts template is SagaTemplate {
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
