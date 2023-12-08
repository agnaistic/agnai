export const grammar = `
Expression = body:(Variable / Text)* {
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


Variable "variable"	= "[" _ val:Char+ pipes:Pipe* "]" {
    const result = { kind: 'variable', name: val.join('') }
    for (const pipe of pipes) {
       if ('stop' in pipe) {
       	 result.stop = result.stop || []
         result.stop.push(pipe.stop)
       } else {
       	Object.assign(result, pipe)
       }
    }
    return result
}

Pipe = Sep pipe:(TokensPipe / TempPipe / StopPipe / NumPipe / OptionsPipe / PromptPipe / BooleanPipe) _ { return pipe }

TokensPipe "max-tokens" = "tokens"i _ "=" _ value:Number { return { tokens: value } }
TempPipe "temp" = "temp"i _ "=" _ value:Number { return { temp: value } }
NumPipe "num" = "num"i _ range:Threshold* _ { return { num: range.reduce((p, c) => Object.assign(p, c), {}) } }
StopPipe "stop" = "stop"i _ "=" _ value:(Char / Symbols)+  { return { stop: value.join('') } }
OptionsPipe "options" = ("from"i / "options"i / "opts"i ) _ "=" _ list:Char+ { return { options: list.join('') } }
PromptPipe "prompt" = ("prompt"i) _ "=" _ value:(Char / Symbols / " ")+ { return { prompt: value.join('') } }
BooleanPipe "boolean" = ("boolean"i / "bool"i) { return { boolean: true } }

Threshold "threshold" = _ kind:("gte"i / "gt"i / "lte"i / "lt"i / "min"i / "max"i) _ "=" _ neg:"-"? value:Number _ {
	let num = +value
    if (neg) num = -num

	switch (kind) {
    	case 'gte':
      case 'min':
        return { min: num }
      case 'gt':
        return { min: num + 1 }
      case 'lte':
      case 'max':
        return { max: num }
      case 'lt':
        return { max: num - 1 }
    }
}
Number "number" = nums:([0-9] / ".")+ { return +nums.join('') }
Text "text" = !(Variable) ch:(.) { return ch }
Char = ch:[a-z0-9_-]i { return ch }
Symbols = ch:("'" / '"' / "_" / "-" / "?" / "!" / "#" / "@" / "$" / "^" / "&" / "*" / "(" / ")" / "=" / "+" / "%" / "~" / ":" / ";" / "," / "<" / ">" / "." / "/" / "|" / "\`" / "NL") {
  if (ch === 'NL') return '\\n'
	return ch
}


Sep = _ "|" _
_ "whitespace" = [ \t]* 
`

/**
 * Example:
 * Pipes:
 *  temp=float
 *  stop=char
 *  num min?=num max?=num gte?=num lte?=num gt?=num lt?=num
 *  words=num
 *
 * Character description:
 * {{desc}}
 *
 * Describe a character using the following JSON format:
 *
 * {
 *   "name": "[name | words=2 | tokens=10]",
 *   "age": [age min=18 max=60],
 *   "health": [hp min=0 max=100],
 *   "clothing": "[appearance | tokens=100 | stop=" | temp=0.8]",
 *   "location": "[location | tokens=200 | stop=" | temp=0.75]"
 * }
 */
