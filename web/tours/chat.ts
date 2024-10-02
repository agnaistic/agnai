import Shepherd from 'shepherd.js'
import { isMobile, setStoredValue } from '../shared/hooks'
import { btn, tourTitle } from './util'
import { getStore } from '../store/create'

export { chatTour as default }

const chatTour = new Shepherd.Tour({
  useModalOverlay: true,
  defaultStepOptions: {
    scrollTo: true,
    classes: 'bg-800',
  },
})

chatTour.on('cancel', onTourClose)
chatTour.on('complete', onTourClose)

function onTourClose() {
  const store = getStore('user')
  const { profile } = store.getState()
  if (profile?.handle === 'You') {
    store.modal(true)
  }
}

const win: any = window
win.chatTourCancel = () => {
  chatTour.cancel()
  setStoredValue('tour-chat', true)
}

const menuSide = isMobile() ? 'bottom' : 'right'
const title = (text: string) => tourTitle(text, 'chatTourCancel')

const prev = {
  text: 'Back',
  classes: 'btn btn-primary',
  action: chatTour.back,
}

const next = {
  text: 'Next',
  classes: 'btn btn-primary',
  action: chatTour.next,
}

chatTour.addSteps([
  {
    id: 'tour-edit-char',
    text: `${title(
      'Character'
    )} You can edit your character and other participants any time by clicking here.`,
    attachTo: {
      element: '.tour-edit-char',
      on: menuSide,
    },
    buttons: [next],
  },
  {
    id: 'tour-main-menu',
    text: `${title(
      'Main Menu'
    )} Use this button to toggle between the <b>Main Menu</b> and the <b>Chat Menu</b>.`,
    attachTo: {
      element: '.tour-main-menu',
      on: menuSide,
    },
    buttons: [prev, next],
  },
  {
    id: 'tour-participants',
    text: `${title(
      'Participants'
    )} You can add and remove additional characters to your chat at any time. <br />
    You can also create <b>Temporary Characters</b>. These are characters that aren't in your regular character list. They only exist in the chat they are created in.<br />`,
    attachTo: {
      element: '.tour-participants',
      on: menuSide,
    },
    buttons: [prev, next],
  },
  {
    id: 'tour-ui',
    text: `${title(
      'Customize your UI'
    )} You can customize many aspects of the site and chat interface from the UI settings.`,
    attachTo: { element: '.tour-ui', on: menuSide },
    buttons: [prev, next],
  },
  {
    id: 'tour-chat-graph',
    text: `${title(
      'Chat Graph and Forking'
    )} Want to take your chat in a different direction without deleting any messages? Use the <code>FORK</code> button in the message options. <br/>You can use the <code>Chat Graph</code> to restore your chat to any point at any time.`,
    attachTo: { element: '.tour-chat-graph', on: 'bottom' },
    buttons: [
      prev,
      btn.next(chatTour, () => {
        getStore('settings').menu(false)

        const ele = document.querySelector('.chat-messages')
        if (ele) {
          ele.scroll({ top: ele.scrollHeight, behavior: 'smooth' })
        }
      }),
    ],
  },
  {
    id: 'tour-message-opts',
    text: `${title(
      'Message Options'
    )} You can <b>Edit</b>, <b>Retry</b>, and <b>Delete</b> your messages from the <code>Message Options</code>.<br />
    You can also <b>Fork</b> your conversation from here as well.<br />
    Remember to use the <code>Chat Graph</code> to load up a different chat 'path' when using forking.<br />
    The order and position of the message options can be customized in the <code>UI Settings</code>.`,
    attachTo: { element: '.tour-message-opts', on: 'bottom-end' },

    buttons: [btn.prev(chatTour, () => getStore('settings').menu(true)), next],
  },
  {
    id: 'tour-message-actions',
    text: `${title('Message Actions')} You can access some message actions here. Such as:<br />
    <ul class="list-disc px-2">
    <li>Control Auto-reply when chatting with multiple bots</li>
    <li>Generate Image: Summarises the chat into an image caption and generates an image</li>
    <li>Respond Again: Generate another response from the last character that spoke</li>
    <li>Generate More: Attempt to 'continue' the last response.</li>
    </ul>`,
    attachTo: { element: '.tour-message-actions', on: 'top-end' },
    buttons: [
      prev,
      {
        text: 'Done',
        classes: 'btn btn-primary',
        action: () => {
          chatTour.complete()
          setStoredValue('tour-chat', true)
          const ele = document.querySelector('.chat-messages')
          if (ele) {
            ele.scroll({ top: 0, behavior: 'smooth' })
          }
        },
      },
    ],
  },
])
