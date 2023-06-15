declare module '*.svg' {
  declare const mod: string
  export default mod
}

declare interface Window {
  flag: (flag: any, value: boolea) => void
}

declare type PartialUpdate<T> = { [P in keyof T]?: T[P] | null }
