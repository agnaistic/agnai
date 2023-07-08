declare module '*.svg' {
  declare const mod: string
  export default mod
}

declare module '*.scss' {
  declare const mod: Record<string, string>
  export default mod
}

declare module '*.png' {
  declare const mod: any
  export default mod
  export { mod }
}

declare interface Window {
  flag: (flag: any, value?: boolean) => void & any
  agnai_version: string
  flags: Record<string, boolean>
  usePipeline: boolean
}
