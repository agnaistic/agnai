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


Variable "variable"	= "[" val:Char+ pipes:Pipe* "]" {
    const result = { kind: 'variable', name: val.join('') }
    for (const pipe of pipes) {
       Object.assign(result, pipe)
    }
    return result
}

Pipe = Sep pipe:(WordPipe / SentencePipe / TokensPipe / TempPipe / StopPipe) _ { return pipe }

WordPipe = ("words" / "word"i) _ "=" _ value:Number { return { pipe: { type: "words", value } } }
SentencePipe = "sentence"i { return { pipe: { type: "sentence" } } }
TokensPipe "max-tokens" = "tokens"i _ "=" _ value:Number { return { tokens: value } }
TempPipe "temp" = "temp"i _ "=" _ value:Number { return { temp: value } }
StopPipe "stop" = "stop"i _ "=" _ value:(Char / Symbols)+ { return { stop: value.join('') } }

Number "number" = nums:[0-9]+ { return +nums.join('') }
Text "text" = !(Variable) ch:(.) { return ch }
Char = ch:[a-z0-9_-]i { return ch }
Symbols = ch:("'" / '"' / "_" / "-" / "?" / "!" / "#" / "@" / "$" / "^" / "&" / "*" / "(" / ")" / "=" / "+" / "%" / "~" / ":" / ";" / "," / "<" / ">" / "." / "/" / "|" / "\`" / "NL") {
  if (ch === 'NL') return '\\n'
	return ch
}

Sep = _ "|" _
_ "whitespace" = [ \t]* 
`
