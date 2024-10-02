import { createStore } from 'solid-js/store'
import { forms } from '/web/emitter'
import { createContext, useContext } from 'solid-js'
import { AppSchema } from '/common/types'

type PresetCtxState = {
  service: string
  format: string
  mode: string
}

const PresetContext = createContext([
  {
    service: getFormValue('service') as AppSchema.GenSettings['service'],
    format: getFormValue('thirdPartyFormat') as AppSchema.GenSettings['thirdPartyFormat'],
    mode: getFormValue('presetMode') as AppSchema.GenSettings['presetMode'],
  },
  (next: Partial<PresetCtxState>) => {},
] as const)

export function PresetProvider(props: { children: any }) {
  const [state, setState] = createStore({
    service: getFormValue('service'),
    format: getFormValue('thirdPartyFormat'),
    mode: getFormValue('presetMode'),
  })

  forms.useSub((field, value) => {
    switch (field) {
      case 'service': {
        setState('service', value)
        break
      }

      case 'thirdPartyFormat': {
        setState('format', value)
        break
      }

      case 'presetMode': {
        setState('mode', value)
        break
      }
    }
  })

  return <PresetContext.Provider value={[state, setState]}>{props.children}</PresetContext.Provider>
}

export function usePresetContext() {
  const [state, _setState] = useContext(PresetContext)
  return state
}

function getFormValue(field: string) {
  const elements: any = document.querySelector('form')?.elements
  if (!elements) return

  const ele = elements[field]
  if (!ele) return

  return ele.value
}
