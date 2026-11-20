import showdown from 'showdown'

export { markdown }

const SPOILER_CLASS = 'showdown-spoiler'

const spoiler = function () {
  return [
    {
      type: 'output',
      filter: function (text: string) {
        // Split the text into code blocks and non-code blocks
        const parts = text.split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/gi)

        return parts
          .map((part: string) => {
            // If this part is a code block, return it unchanged
            if (part.startsWith('<pre') || part.startsWith('<code')) {
              return part
            }
            // Otherwise, apply the spoiler replacement
            return part.replace(/\|\|((?:(?!<\/).|\n)+?)\|\|/g, function (match, content) {
              return (
                `<span class="${SPOILER_CLASS}"><span class="${SPOILER_CLASS}-opacity">` +
                content.trim() +
                '</span></span>'
              )
            })
          })
          .join('')
      },
    },
  ]
}

// Add Styling
// const showdownSpoilerStyle = document.createElement('style')
// showdownSpoilerStyle.innerHTML = `
//   .${SPOILER_CLASS} {

//   }
//   .${SPOILER_CLASS}.revealed {

//   }
// `
// document.head.appendChild(showdownSpoilerStyle)

// Register Extension with Showdown if Available
if (typeof showdown !== 'undefined' && showdown.extension) {
  showdown.extension('spoiler', spoiler)
}

// Event listener for revealing spoilers
document.addEventListener('click', function (e: any) {
  {
    const element = e.target?.closest?.(`.${SPOILER_CLASS}`)
    if (element) {
      element.classList.toggle('revealed')
    }
  }
  {
    const element = e.target?.closest?.(`.${SPOILER_CLASS}-opacity`)
    if (element) {
      element.classList.toggle('revealed')
    }
  }
})

const markdown = new showdown.Converter({
  extensions: [spoiler()],
})
markdown.setOption('simpleLineBreaks', true)
markdown.setOption('tables', true)
