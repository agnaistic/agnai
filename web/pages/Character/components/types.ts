import { AppSchema } from '/common/types/schema'

export type ViewProps = {
  groups: Array<{ label: string; list: AppSchema.Character[] }>
  showGrouping: boolean
  toggleFavorite: (id: string, state: boolean) => void
  setDelete: (char: AppSchema.Character) => void
  setDownload: (char: AppSchema.Character) => void
  setEdit: (char: AppSchema.Character) => void
}

export type CardProps = {
  char: AppSchema.Character
  delete: () => void
  download: () => void
  toggleFavorite: (value: boolean) => void
  edit: () => void
}

export type ViewType = 'list' | 'cards' | 'folders'
export type SortField = 'modified' | 'created' | 'name'
export type SortDirection = 'asc' | 'desc'
