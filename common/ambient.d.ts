declare type PartialUpdate<T> = { [P in keyof T]?: T[P] | null }
