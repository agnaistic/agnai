declare module '*.svg' {
  declare const mod: string
  export default mod
}

declare interface Window {
  flag: (flag: any, value?: boolean) => void & any
}
