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
        if (pipe.type && result.type) {
          throw new Error('Invalid node "' + result.name + '": Cannot assign more than one type (One of: number, boolean, list, random)')
        }
       	Object.assign(result, pipe)
       }
    }
    
    if (!result.type) {
    	result.type = 'string'
    }
    return result
}

Pipe = Sep pipe:(TokensPipe / TempPipe / StopPipe / NumPipe / OptionsPipe / BooleanPipe / StringPipe / RandomPipe) _ { return pipe }

TokensPipe "max-tokens" = "tokens"i _ "=" _ value:Number { return { tokens: value } }
TempPipe "temp" = "temp"i _ "=" _ value:Number { return { temp: value } }
StopPipe "stop" = "stop"i _ "=" _ value:(Char / Symbols)+ { return { stop: value.join('') } }

NumPipe "num" =  "type" _ "=" _ ("number"i / "num"i) _ Sep? _ range:Threshold* _ { return { type: 'number', ...range.reduce((p, c) => Object.assign(p, c), {}) } }
OptionsPipe "options" = "type" _ "=" _ ("list"i / "from"i / "options"i / "opts"i / "selection"i / "sel"i) _ list:Char+ { return { type: 'options', options: list.join('') } }
BooleanPipe "boolean" = "type" _ "=" _ ("boolean"i / "bool"i) { return { type: 'boolean' } }
RandomPipe "options" = "type" _ "=" _ ("random"i / "rand"i) _ list:Char+ { return { type: 'random', options: list.join('') } }
StringPipe "string" = "type" _ "=" _ ("string"i / "str"i) { return { type: 'string' } }

TypePipe "type" = "type"i _ "=" _ 

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
 * Pipes (all optional)
 *  temp=float [0.1+]
 *  stop=char | stop=... (stop can be provided multiple times)
 *  tokens=[number]
 * 
 *  plus one of:
 * 
 *  type=num min=... max=... (min and max are optional)
 *  type=boolean
 *  type=list [list name]
 *  type=random [list name]
 *  type=string (default if no type provided)

 *
 * Character description:
 * {{desc}}
 *
 * Describe a character using the following JSON format:
 *
 * {
 *   "name": "[name | tokens=10]",
 *   "age": [age | type=num min=18 max=60],
 *   "health": [hp | type=num min=0 max=100],
 *   "clothing": "[appearance | tokens=100 | stop=" | temp=0.8]",
 *   "location": "[location | tokens=200 | stop=" | temp=0.75]",
 *   "is_evil": "[is_evil | type=bool]",
 *   "mood": "[mood | type=random moods]"
 * }
 */
