declare type PartialUpdate<T> = { [P in keyof T]?: T[P] | null }

type NoId<T> = Omit<T, '_id' | 'kind'>
type OmitId<T, U extends string> = Omit<T, '_id' | 'kind' | U>

type Dates = 'createdAt' | 'updatedAt' | 'deletedAt' | 'kind'

declare type Ensure<T> = Exclude<T, null | undefined>
