declare module 'iconv-lite' {
  const mod: any
  export default mod
}

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

  ezstandalone: EzStandalone
  fusetag: FuseTag
}

declare const ezstandalone: EzStandalone

type FuseBreakpoint = 'xs' | 's' | 'm' | 'l' | 'xl'
type FuseStateProp =
  | 'tag_loaded'
  | 'fuse_bootstrap_start'
  | 'component_init_cmp_disabled'
  | 'component_init_prebid_loading'
  | 'prebid_load_script_start'
  | 'component_init_uam_loading'
  | 'uam_script_load_start'
  | 'component_init_yandex_disabled'
  | 'component_init_gpt_loading'
  | 'gpt_load_start'
  | 'component_init_docReadyScan_loading'
  | 'component_init_docReadyScan_ready'
  | 'fuse_bootstrap_finish'
  | 'prebid_onload_received'
  | 'component_init_prebid_ready'
  | 'uam_script_load_finish'
  | 'uam_initialise_start'
  | 'uam_initialise_finish'
  | 'component_init_uam_ready'
  | 'initmanager_fired_auction_ready'
  | 'fuse_queue_start'
  | 'fuse_queue_finish'
  | 'tag_initialised'
  | 'fuse_trigger_auto_auction_start'
  | 'fuse_trigger_auto_auction_finish'
  | 'on_tag_init_event_start'
  | 'on_tag_init_event_finish'
  | 'first_prebid_request'
  | 'first_uam_request'
  | 'gpt_load_finish'
  | 'gpt_queue_start'
  | 'component_init_gpt_ready'
  | 'blockthrough_load_start'
  | 'first_uam_response'
  | 'first_prebid_response'
  | 'first_gpt_request'
  | 'blockthrough_load_finish'
  | 'gpt_first_slot_render_ended'
  | 'gpt_first_slot_loaded'
  | 'gpt_first_impression_viewable'

declare interface FuseTag {
  fuseUUID: string
  events: Array<{ adEvent: string; auctionId: string; ts: number; event_time_ms: number }>
  init: boolean
  initialised: boolean
  loading: boolean
  que: { push: (cmd: any) => void }
  states: Array<{ ts: number; load_time_ms: number } & { [key in FuseStateProp]: boolean }>

  activateZone(zone: string): void
  destroyZone(zone: string): void
  disableRefresh(): voice
  getAdSlotsByFuseId(id: string): any
  getAdSlotsById(id: string): any
  getCurrentBreakpoint(): { size: number; name: FuseBreakpoint }
  getFuseUnits(): Record<string, HTMLDivElement>
  getRefreshIntervals(): Record<string, number>
  getSettings(): {
    account_code: string
    account_domain_map: any
    fuse_blocked_url: string[]
    fuse_breakpoints: Record<FuseBreakpoint, number>
  }
  getTargeting(): Array<{ key: string; value: string }>

  loadFuseSlotById(ele: any, target: any): void
  loadFuseSlots(): void
  onSlotInitialised(cb: any): void
  onSlotRenderEnded(cb: any): void
  onTagInitialised(cb: any): void
  pageInit(opts: {
    // Page-level targeting (applies to all slots by default)
    // passed to Prebid and GPT
    pageTargets?: TargetingPair[]

    // Fuse Ids which must be present in the DOM before
    // the auction will commence
    blockingFuseIds?: FuseId[]

    // Number of milliseconds the auction is blocked waiting for
    // blockingFuseIds before it times out and proceeds with what's available.
    // If not supplied, Fuse will select an appropriate default depending on
    // factors such as device type
    blockingTimeout?: number
  }): void
  processNewSlots(): void
  refreshSlotByCode(code: string): void
  refreshSlots(): void
  registerAll(): void
  registerZone(id: string): void
  resetAfs(e: any): void
  resetFuseSlots(): void
  setAllowRefreshCallback(cb: any): void
  setDefaultTargeting(targeting: any): void
  setSlotTargetingById(e: any, t: any, i: any): void
  setTargeting(e: any, t: any): void
}

declare interface EzStandalone {
  enabled: boolean
  cmd: { push: (cb: Function) => void }
  cbs: { push: (cb: Function) => void }
  init: () => void
  define: (...ids: number[]) => void

  defineVideo: any
  displayMoreVideo: any

  findAll

  display: () => void
  enable: () => void
  displayMore: (...args: number[]) => void
  refresh: () => void
  setEzoicAnchorAd: (state: boolean) => void
  hasAnchorAdBeenClosed: () => boolean
  destroyAll: () => void
  destroyPlaceholders: (...args: number[]) => void
  destroyVideoPlaceholders: () => void
  setDisablePersonalizedStatistics: (state: boolean) => void
  setDisablePersonalizedAds: (state: boolean) => void
  isEzoicUser: boolean
  setIsPWA: (state: boolean) => void
  fireEvent: (target: any, type: string) => void
  setBanger: (value: any) => void
  enableConsent: () => void
  getSelectedPlaceholders: () => Record<number, boolean>
}

declare type FormEvent<T = HTMLInputElement | HTMLTextAreaElement> = Event & {
  target: Element
  currentTarget: T
}

declare type FormHandler<T = HTMLInputElement | HTMLTextAreaElement> = (ev: FormEvent<T>) => void
