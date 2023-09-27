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
}

type NoId<T> = Omit<T, '_id' | 'kind'>
type OmitId<T, U extends string> = Omit<T, '_id' | 'kind' | U>

type Dates = 'createdAt' | 'updatedAt' | 'deletedAt' | 'kind'
