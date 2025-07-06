import { applyObjectPatch, createObjectPatch, ObjectPatch } from 'symmetry'

export class VersionController<T extends { _id: string }, U extends Array<keyof T>> {
  current: Pick<T, U[number]>
  changes: ObjectPatch<Pick<T, U[number]>>[] = []

  constructor(public base: T, private keys: U) {
    this.current = getBase(base, keys)
  }

  update = (next: T) => {
    // We want to retain the value that we changed
    const obj = getBase(next, this.keys)
    const patch = createObjectPatch(obj, this.current)
    this.current = obj
    this.changes.push(patch as any)
  }

  undo = (): T => {
    const reverted = applyObjectPatch(this.current, this.changes.slice(-1)[0])

    // TODO:
    return { ...this.base, ...reverted }
  }

  reset = () => {
    const reverted = this.changes.reduce((prev, curr) => {
      const next = applyObjectPatch(prev, curr)
      return next
    }, this.current)

    return { ...this.base, ...reverted }
  }
}

function getBase<T extends { _id: string }, U extends Array<keyof T>>(obj: T, keys: U) {
  const diffable: any = {}

  for (const key of keys) {
    diffable[key] = obj[key]
  }

  return diffable as Pick<T, U[number]>
}
