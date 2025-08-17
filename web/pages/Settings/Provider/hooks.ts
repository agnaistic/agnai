import { createMemo } from 'solid-js'
import { userStore } from '/web/store'
import { useUsableServices } from '/web/shared/util'
import { assertProviderDetail } from '/common/providers'

export function useProviderList(allowNone?: boolean) {
  const state = userStore((s) => ({ providers: s.user?.providers || [] }))

  const usableServices = useUsableServices()

  const services = createMemo(() => {
    const providers = state.providers.map((p) => {
      const detail = assertProviderDetail(p.provider)

      if (detail.category === 'custom') {
        if (p.name) return { label: `Custom - ${p.name}`, value: p._id, detail }
        const hostname = tryGetHostname(p.url)
        return { label: `Custom - ${hostname}`, value: p._id }
      }

      if (detail.category === 'known') {
        return { label: 'Provider - ' + detail.detail.name, value: p._id, detail }
      }

      return {
        label: `Local - ${p.name || detail?.detail?.name || p.provider} `,
        value: p._id,
        detail,
      }
    })

    providers.sort(sortAlpha)

    const list = usableServices()
    const subs = list.some((l) => l === 'agnaistic')

    if (subs) {
      providers.unshift({ label: 'Agnaistic', value: 'agnaistic' })
    }

    if (allowNone) {
      providers.unshift({ label: 'None', value: '' })
    }

    return providers
  })

  return [services]
}

function sortAlpha(l: { label: string }, r: { label: string }) {
  return l.label.localeCompare(r.label)
}

function tryGetHostname(url: string, fallback?: string) {
  if (!url.trim()) return fallback || 'Untitled'

  try {
    return new URL(url).host
  } catch (ex) {
    return fallback || 'Untitled (Invalid URL)'
  }
}
