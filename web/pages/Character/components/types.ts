import { AppSchema } from '/common/types/schema'

export type ViewProps = {
  groups: Array<{ label: string; list: ListCharacter[] }>
  showGrouping: boolean
  toggleFavorite: (id: string, state: boolean) => void
  setDelete: (char: ListCharacter) => void
  setDownload: (char: ListCharacter) => void
  setEdit: (char: ListCharacter) => void
}

export type CardProps = {
  char: ListCharacter
  delete: () => void
  download: () => void
  toggleFavorite: (value: boolean) => void
  edit: () => void
}

export type ViewType = 'list' | 'cards' | 'folders'
export type SortField = 'modified' | 'created' | 'name' | 'conversed'
export type SortDirection = 'asc' | 'desc'

export type ListCharacter = AppSchema.Character & { chat?: AppSchema.Chat }
