import showdown from 'showdown'

export { markdown }

const markdown = new showdown.Converter()
markdown.setOption('simpleLineBreaks', true)
