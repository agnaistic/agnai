export const grammar = `
Expression = body:(Variable / Text)+ {
	const result = []
    let text = ''
    
    for (const item of body) {
      if (typeof item !== 'string') {
      	if (text) {
          result.push({ kind: 'text', text })
          text = ''
        }
        result.push(item)
        continue
      }
      
      text += item
    }
    
    if (text) result.push({ kind: 'text', text})
	return result
}


Variable "variable" = "[" val:Char+ pipe:Pipe? tokens:TokensPipe? "]" { return { kind: 'variable', name: val.join(''), pipe, tokens } }

Pipe = Sep pipe:(WordPipe / SentencePipe) _ { return pipe }
WordPipe = ("words" / "word"i) _ "=" _ value:Number { return { type: "words", value } }
SentencePipe = "sentence"i { return { type: "sentence" } }
TokensPipe "max-tokens" = Sep "tokens"i _ "=" _ value:Number { return value }

Number "number" = nums:[0-9]+ { return +nums.join('') }
Text "text" = !(Variable) ch:(.) { return ch }
Char = ch:[a-z0-9_-]i { return ch }

Sep = _ "|" _
_ "whitespace" = [ \t]* 
`
