declare module '*.svg' {
  const mod: string
  export default mod
}

declare module '*.scss' {
  const mod: Record<string, string>
  export default mod
}

declare module '*.png' {
  const mod: any
  export default mod
  export { mod }
}

declare interface Window {
  flag: (flag: any, value?: boolean) => void & any
  agnai_version: string
  flags: Record<string, boolean>
  usePipeline: boolean

  ezstandalone: EzStandalone
}

declare const ezstandalone: EzStandalone

declare interface EzStandalone {
  enabled: boolean
  cmd: { push: (cb: Function) => void }
  cbs: { push: (cb: Function) => void }
  init: () => void
  define: (...ids: number[]) => void

  defineVideo: any
  displayMoreVideo: any

  findAll

  display: () => void
  enable: () => void
  displayMore: (...args: number[]) => void
  refresh: () => void
  setEzoicAnchorAd: (state: boolean) => void
  hasAnchorAdBeenClosed: () => boolean
  destroyAll: () => void
  destroyPlaceholders: (...args: number[]) => void
  destroyVideoPlaceholders: () => void
  setDisablePersonalizedStatistics: (state: boolean) => void
  setDisablePersonalizedAds: (state: boolean) => void
  isEzoicUser: boolean
  setIsPWA: (state: boolean) => void
  fireEvent: (target: any, type: string) => void
  setBanger: (value: any) => void
  enableConsent: () => void
  getSelectedPlaceholders: () => Record<number, boolean>
}

declare type FormEvent<T = HTMLInputElement | HTMLTextAreaElement> = Event & {
  target: Element
  currentTarget: T
}

declare type FormHandler<T = HTMLInputElement | HTMLTextAreaElement> = (ev: FormEvent<T>) => void
