import { Check, X } from 'lucide-solid'
import { Component, Show, JSX, createMemo, Switch, Match, createSignal } from 'solid-js'
import Button from './Button'
import './modal.css'
import Tabs, { TabHook } from './Tabs'
import { markdown } from './markdown'
import { Portal } from 'solid-js/web'

interface Props {
  title?: string | JSX.Element
  show: boolean
  children?: JSX.Element
  close: () => void
  footer?: JSX.Element
  maxWidth?: 'full' | 'half'
  maxHeight?: boolean
  fixedHeight?: boolean
  transparent?: boolean
  onSubmit?: (ev: Event & { currentTarget: HTMLFormElement }) => void
  tabs?: TabHook

  /* If set to false, the close button 'X' will be omitted */
  dismissable?: boolean
  ariaLabel?: string
  ariaDescription?: string
}

const Modal: Component<Props> = (props) => {
  const width = createMemo(() => {
    if (!props.maxWidth) return `sm:max-w-lg`

    return props.maxWidth === 'full' ? `sm:w-[calc(100vw-64px)]` : 'sm:w-[calc(50vw)]'
  })

  const minHeight = createMemo(() => (props.fixedHeight ? 'modal-height-fixed' : ''))

  const defaultSubmit = (ev: Event) => {
    ev.preventDefault
  }

  // on-screen readers require focusing on the dialog to work
  const autofocus = (ref: HTMLFormElement) => setTimeout(() => ref.focus())

  return (
    <Portal>
      <Show when={props.show}>
        <div class="fixed inset-x-0 top-0 z-[100] items-center justify-center px-2 sm:inset-0 sm:flex sm:items-center sm:justify-center">
          <div class="fixed inset-0 -z-10 opacity-40 transition-opacity">
            <div class="absolute inset-0 bg-black" />
          </div>
          <div class="modal-body">
            <form
              ref={autofocus}
              onSubmit={props.onSubmit || defaultSubmit}
              class={`modal-height bg-900 z-50 w-[calc(100vw-0px)] overflow-hidden rounded-lg shadow-md shadow-black transition-all ${width()} `}
              classList={{ 'h-full': props.maxHeight, 'opacity-80': props.transparent }}
              role="dialog"
              aria-modal="true"
              aria-label={props.ariaLabel}
              aria-description={props.ariaDescription}
              tabindex="-1"
            >
              <Switch>
                <Match when={props.tabs}>
                  <div class="flex h-[56px] flex-row justify-between text-lg">
                    <Tabs
                      selected={props.tabs?.selected!}
                      select={props.tabs?.select!}
                      tabs={props.tabs?.tabs!}
                    />
                    <Show when={props.dismissable !== false}>
                      <div
                        onClick={props.close}
                        class="cursor-pointer p-4"
                        role="button"
                        aria-label="Close dialog window"
                      >
                        <X aria-hidden="true" />
                      </div>
                    </Show>
                  </div>
                </Match>

                <Match when>
                  <div class="flex w-full flex-row justify-between p-4 text-lg font-bold">
                    <div class="w-full">{props.title}</div>
                    <Show when={props.dismissable !== false}>
                      <div
                        onClick={props.close}
                        class="cursor-pointer"
                        role="button"
                        aria-label="Close window"
                      >
                        <X aria-hidden="true" />
                      </div>
                    </Show>
                  </div>
                </Match>
              </Switch>

              {/* 132px is the height of the title + footer*/}
              <div
                class={`modal-content ${minHeight()} overflow-y-auto p-4 pt-0 text-lg`}
                classList={{ 'h-full': props.maxHeight }}
              >
                {props.children}
              </div>
              <Show when={props.footer}>
                <div class="flex w-full flex-row justify-end gap-2 p-4">{props.footer}</div>
              </Show>
            </form>
          </div>
        </div>
      </Show>
    </Portal>
  )
}

export default Modal

export const NoTitleModal: Component<Omit<Props, 'title'>> = (props) => {
  const width = createMemo(() => {
    if (!props.maxWidth) return `sm:max-w-lg`

    return props.maxWidth === 'full' ? `sm:w-[calc(100vw-64px)]` : 'sm:w-[calc(50vw)]'
  })

  const minHeight = createMemo(() =>
    props.fixedHeight ? `min-h-[calc(80vh-132px)] sm:min-h-[calc(90vh-132px)]` : ''
  )

  const defaultSubmit = (ev: Event) => {
    ev.preventDefault()
  }

  // on-screen readers require focusing on the dialog to work
  const autofocus = (ref: HTMLFormElement) => setTimeout(() => ref.focus())

  return (
    <Show when={props.show}>
      <div class="fixed inset-x-0 top-0 z-[100] items-center justify-center px-4 sm:inset-0 sm:flex sm:items-center sm:justify-center">
        <div class="fixed inset-0 -z-10 opacity-40 transition-opacity">
          <div class="absolute inset-0 bg-black" />
        </div>
        <div class="modal-body">
          <form
            ref={autofocus}
            onSubmit={props.onSubmit || defaultSubmit}
            class={`bg-900 my-auto max-h-[80vh] w-[calc(100vw-16px)] overflow-hidden rounded-lg shadow-md shadow-black transition-all sm:max-h-[90vh] ${width()} `}
            role="dialog"
            aria-modal="true"
            aria-label={props.ariaLabel}
            aria-description={props.ariaDescription}
            tabindex="-1"
          >
            <div class="flex flex-row justify-end pr-4 pt-4 text-lg font-bold">
              <div onClick={props.close} class="cursor-pointer">
                <X />
              </div>
            </div>

            {/* 132px is the height of the title + footer*/}
            <div
              class={`max-h-[calc(80vh-132px)] sm:max-h-[calc(90vh-132px)] ${minHeight()} overflow-y-auto text-lg`}
            >
              {props.children}
            </div>

            <Show when={props.footer}>
              <div class="flex w-full flex-row justify-end gap-2 p-4">{props.footer}</div>
            </Show>
          </form>
        </div>
      </div>
    </Show>
  )
}

export const ConfirmModal: Component<{
  show: boolean
  close: () => void
  confirm: () => void
  message: string | JSX.Element
  ariaLabel?: string
  ariaDescription?: string
}> = (props) => {
  const confirm = () => {
    props.confirm()
    props.close()
  }

  return (
    <Modal
      show={props.show}
      close={props.close}
      title="Confirmation"
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            <X /> Cancel
          </Button>

          <Button onClick={confirm}>
            <Check /> Confirm
          </Button>
        </>
      }
      aria-label={props.ariaLabel}
      aria-description={props.ariaDescription}
    >
      <Show
        when={typeof props.message === 'string'}
        fallback={<div class="mb-8 flex justify-center">{props.message}</div>}
      >
        <div
          class="markdown mb-8 flex flex-col items-center"
          innerHTML={markdown.makeHtml(props.message as string)}
        />
      </Show>
    </Modal>
  )
}

export const HelpModal: Component<{
  title?: string
  cta: JSX.Element
  children?: any
  markdown?: any
}> = (props) => {
  const [show, setShow] = createSignal(false)
  const close = () => setShow(false)

  return (
    <>
      <div onClick={() => setShow(true)}>{props.cta}</div>
      <RootModal
        title={props.title || ''}
        maxWidth="half"
        show={show()}
        close={close}
        footer={
          <>
            <Button onClick={close}>Close</Button>
          </>
        }
      >
        <Show when={!!props.children}>{props.children}</Show>
        <Show when={!!props.markdown}>
          <div class="rendered-markdown text-sm" innerHTML={markdown.makeHtml(props.markdown!)} />
        </Show>
      </RootModal>
    </>
  )
}

export const RootModal: Component<Props> = (props) => {
  return (
    <Portal>
      <Modal {...props} />
    </Portal>
  )
}
