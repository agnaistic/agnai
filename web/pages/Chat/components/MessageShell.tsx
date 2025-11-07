import Purify from 'dompurify'
import { Component, JSX, Show } from 'solid-js'
import { markdown } from '/web/shared/markdown'

export const MessageShell: Component<{
  author: JSX.Element | string
  dateline?: JSX.Element | string | Date

  content?: string

  avatar?: JSX.Element
  options?: JSX.Element

  type?: 'user' | 'bot' | 'ooc'
  last?: boolean
  style?: JSX.CSSProperties
  blur?: boolean
  children?: any
}> = (props) => {
  return (
    <div
      class="flex w-full rounded-md px-2 py-2 pr-2 sm:px-4"
      data-sender={props.type}
      data-bot={props.type === 'bot' ? props.author : ''}
      data-user={props.type === 'user' ? props.author : ''}
      data-last={props.last?.toString()}
      style={props.style}
      classList={{
        'bg-chat-bot': props.type === 'bot',
        'bg-chat-user': props.type === 'user' || !props.type,
        'bg-chat-ooc': props.type === 'ooc',
        unblur: props.blur === false,
      }}
    >
      <div class={`flex w-full`} classList={{ 'opacity-50': props.type === 'ooc' }}>
        <div class={`flex h-fit w-full select-text flex-col gap-1`}>
          <div class="break-words">
            <span
              class="float-left pr-3"
              data-bot-avatar={props.type === 'bot'}
              data-user-avatar={props.type === 'user'}
            >
              {props.avatar}
            </span>
            <span class="flex flex-row justify-between pb-1">
              <span
                class="flex min-w-0 shrink flex-col items-start gap-1 overflow-hidden align-middle sm:flex-col sm:gap-1"
                classList={{ italic: props.type === 'ooc' }}
              >
                <b
                  class="chat-name text-900 mr-2 max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap sm:max-w-[400px] sm:text-base"
                  style="line-height: 1"
                  data-botname={props.type === 'bot'}
                  data-user-name={props.type === 'user'}
                >
                  {props.author}
                </b>

                <span
                  class="message-date text-600 flex items-center text-xs leading-none"
                  data-bot-time={props.type === 'bot'}
                  data-user-name={props.type === 'user'}
                >
                  {props.dateline instanceof Date
                    ? new Date(props.dateline).toLocaleString()
                    : props.dateline || ''}
                </span>
              </span>

              {props.options}
            </span>

            <Show when={props.content} fallback={<div>{props.children}</div>}>
              <div innerHTML={renderMessage(props.content!)} />
            </Show>
          </div>
        </div>
      </div>
    </div>
  )
}
/**
 * Below is all copied from Message.tsx to avoid a circular reference in the future
 */
function renderMessage(text: string) {
  // Address unfortunate Showdown bug where spaces in code blocks are replaced with nbsp, except
  // it also encodes the ampersand, which results in them actually being rendered as `&amp;nbsp;`
  // https://github.com/showdownjs/showdown/issues/669

  // we sanizize user input to prevent XSS attacks
  // DomPurify has an implicit list of allowed Tags, when we add our own we have to use ADD_TAGS
  const html = Purify.sanitize(
    wrapWithQuoteElement(markdown.makeHtml(text).replace(/&amp;nbsp;/g, '&nbsp;')),
    {
      ADD_TAGS: ['qem'],
    }
  )

  return html
}

/**
 * Markup beautification. Lets us control color of diffrent HTML tags, expands on the markdown functionality
 * Especially useful for quotes, which are wrapped in <q> tags
 * and emphasis, which is wrapped in <qem> tags.
 */
function wrapWithQuoteElement(str: string) {
  // Replace all non-regular double quotes with double regular quotes
  // Unicode double quote characters: https://en.wikipedia.org/wiki/Quotation_mark#Unicode_code_point_table
  str = str.replace(/[\u201C\u201D\u201E\u201F]/g, '"')

  return str.replace(
    /*
    Regex magic explained:
    <[\s\S]*?>      - skip all HTML tags   eg. <sumting>
    ```[\s\S]*?```  - skip all code blocks eg. <pre>/``` markdown transform <pre><code> to ```
    ``[\s\S]*?``    - skip all inline code eg. <code>/`` markdown transform <code> to `` | this is a non standard markup 
    `[\s\S]*?`      - skip all inline code eg. <code>/` markdown transform <code> to `

    (\".+?\")       - capture all regular double quotes, which are not part of HTML tags or code blocks
    All captured groups are passed to the wrapCaptureGroupQuotes function
    */
    /<[\s\S]*?>|```[\s\S]*?```|``[\s\S]*?``|`[\s\S]*?`|(\".+?\")/gm,
    wrapCaptureGroupQuotes
  )
}

/** Processes capture group from above */
function wrapCaptureGroupQuotes(match: string, regularQuoted?: string) {
  if (regularQuoted) {
    /*If we have a valid string then we are within a quote
    ([\s\S]*?) - we ignore all characters between <em> and </em>
    a valid capure will look like this: "lets have some <em>fun</em>"
    we then pass the capture group to wrapCaptureGroupEmphasis function, which will replace <em> with <qem>
    */
    regularQuoted = regularQuoted.replace(/<em>([\s\S]*?)<\/em>/gm, wrapCaptureGroupEmphasis)
    return '<q>"' + regularQuoted.replace(/\"/g, '') + '"</q>'
  }
  return match
}

/** Replaces all <em> tags within a <q> tag with <qem> tags */
function wrapCaptureGroupEmphasis(match: string, emphasisQuote?: string) {
  if (emphasisQuote) {
    return '<qem>' + emphasisQuote.replace(/\"/g, '') + '</qem>'
  }
  return match
}
