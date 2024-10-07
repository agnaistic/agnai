export const grammar = `
Expression = content:Parent* {
	const flatten = (nodes) => {
    	let curr = ''
        const res = []
        
        for (const node of nodes) {
          if (typeof node === 'string') curr += node
          else {
          	if (curr) {
            	res.push(curr)
                curr = ''
            }
            if (node.children) {
            	node.children = flatten(node.children)
            }
            res.push(node)
          }
        }
        if (curr) res.push(curr)
        return res       
    }
    
    const results = flatten(content)
    return results
}

Parent "parent-node" = v:(BotIterator / ChatEmbedIterator / HistoryIterator / HistoryInsert / LowPriority / Condition / Placeholder / Text) { return v }

ManyPlaceholder "repeatable-placeholder" = OP i:(Character / User / Random / DiceRoll) CL {
	return { kind: 'placeholder', value: i }
}

BotIterator "bot-iterator" = OP "#each" WS loop:Bots CL children:(BotChild / LoopText)* CloseLoop { return { kind: 'each', value: loop, children } }
BotChild = i:(BotRef / BotCondition / ManyPlaceholder) { return i }

HistoryIterator "history-iterator" = OP "#each" WS loop:History CL children:(HistoryChild / LoopText)* CloseLoop { return { kind: 'each', value: loop, children } }
HistoryChild = i:(HistoryRef / HistoryCondition / ManyPlaceholder) { return i }
HistoryInsert "history-insert" = OP "#insert"i WS "="? WS line:[0-9]|1..2| CL children:(Placeholder / InsertText)* CloseInsert { return { kind: 'history-insert', values: +line.join(''), children } }

ChatEmbedIterator "chat-embed-iterator" = OP "#each" WS loop:ChatEmbed CL children:(ChatEmbedChild / LoopText)* CloseLoop { return { kind: 'each', value: loop, children } }
ChatEmbedChild = i:(ChatEmbedRef / ManyPlaceholder) { return i }

LowPriority "lowpriority" = OP "#lowpriority"i CL children:(Placeholder / LowPriorityText)* CloseLowPriority { return { kind: 'lowpriority', children } }

ElseBlock "else" = OP "#"? "else"i CL children:(Placeholder / BotIterator / ElseText)* CloseElseBlock { return { kind: 'else', children } } 
  
Placeholder "placeholder"
  = OP WS interp:Interp WS pipes:Pipe* CL {
  if (interp.kind) {
    const { kind, ...rest } = interp
  	return { kind: 'placeholder', value: kind, ...rest, pipes }
  }
  return { kind: 'placeholder', value: interp, pipes }
}

BotCondition "bot-condition" = OP "#if" WS prop:BotProperty CL sub:(BotRef / LoopText)* CloseCondition {
  return { kind: 'bot-if', prop, children: sub.flat() }
}

HistoryCondition "history-condition" = OP "#if" WS prop:HistoryProperty CL sub:(HistoryRef / LoopText)* CloseCondition {
  return { kind: 'history-if', prop, children: sub.flat() }
}

ConditionChild = Placeholder / Condition / LowPriority / ElseBlock
Condition "if" = OP "#if" WS value:Word CL sub:(ConditionChild / ConditionText)* CloseCondition {
  return { kind: 'if', value, children: sub.flat() }
}


InsertText "insert-text" = !(BotChild / HistoryChild / CloseCondition / CloseInsert) ch:(.) { return ch }
LowPriorityText "lowpriority-text" = !(BotChild / HistoryChild / CloseCondition / CloseLowPriority) ch:(.) { return ch }
ElseText "else-text" = !(CloseElseBlock / CloseCondition / CloseLowPriority) ch:(.) { return ch }
LoopText "loop-text" = !(BotChild / ChatEmbedChild / HistoryChild / CloseCondition / CloseLoop) ch:(.)  { return ch }
ConditionText = !(ConditionChild / CloseCondition) ch:. { return ch }
Text "text" = !(Placeholder / Condition / BotIterator / HistoryIterator / ChatEmbedIterator) ch:. { return ch }

DelimitedWords "csv" = head:Phrase tail:("," WS p:Phrase { return p })* { return [head, ...tail] }

Symbol = ch:("'" / "_" / "-" / "?" / "!" / "#" / "@" / "$" / "^" / "&" / "*" / "(" / ")" / "=" / "+" / "%" / "~" / ":" / ";" / "<" / ">" / "." / "/" / "|" / "\`" / "[" / "]") {
	return ch
}

Phrase = text:(QuotedPhrase / CommalessPhrase) { return text }
QuotedPhrase = '"' text:(BasicChar / Symbol / "," / " ")+ '"' { return text.join('') }
CommalessPhrase = text:(BasicChar / Symbol / '"' / " ")+ { return text.join('') }

CloseCondition = OP "/if"i CL
CloseLoop = OP "/each"i CL
CloseInsert = OP "/insert"i CL
CloseLowPriority = OP "/lowpriority"i CL
CloseElseBlock = OP "/else"i CL
BasicChar = [a-zA-Z0-9]
Word "word" = text:([a-zA-Z_ 0-9] / Symbol)+ { return text.join('') }
Pipe "pipe" = _ "|" _ fn:Handler {  return fn }


_ "whitespace" = [ \t]*  
OP "open" = "{{" WS
CL "close" = WS "}}" 
WS "ws" = " "*
NL "newline" = "\\n" / "\\r" "\\n"?

// Example pipe functions: lowercase, uppercase
Handler "handler" = "upper" / "lower"

ChatEmbedRef = OP prop:ChatEmbedProperty CL {return { kind: 'chat-embed-prop', prop } }
BotRef = OP prop:BotProperty CL {return { kind: 'bot-prop', prop } }
HistoryRef = OP prop:HistoryProperty CL { return { kind: 'history-prop', prop } }

JsonSchemaValue "json-schema-value" = ("json."i / "var."i) prop:Word { return { kind: 'json', values: prop } }

ChatEmbedProperty "chat-embed-prop" = "." prop:("name"i / "text"i / "i"i) { return prop.toLowerCase() }
BotProperty "bot-prop" = "." prop:("name"i / Persona / "i"i) { return prop.toLowerCase() }
HistoryProperty "history-prop" = "."? prop:(Message / "dialogue"i / "name"i / "isuser"i / "isbot"i / "i"i) { return prop.toLowerCase() }

Character "character" = ("char"i / "character"i / "bot"i) { return "char" }
User "user" = "user"i { return "user" }
Scenario "scenario" = "scenario"i { return "scenario" }
Impersonate "impersonating" = ("impersonate"i / "impersonating"i / "impersonality"i) { return "impersonating" }
Persona "personality" = ("personality"i / "persona"i) { return "personality" }
AllPersona "all_personalities" = ("all_personas"i / "all_personalities"i) { return "all_personalities" }
Dialogue "example_dialogue" = ("samplechat"i / "example_dialogue"i / "sample_chat"i / "example_dialog"i / "example_chat"i) { return "example_dialogue" }

Instruction "instruction" = "system_prompt"i { return "system_prompt" }
Jailbreak "ujb" = ("ujb"i / "system_note"i / "jailbreak"i) { return "ujb" }
Post "post" = "post"i { return "post" }
Memory "memory" = "memory"i { return "memory" }
Message "message" = ("msg"i / "message"i / "text"i) { return "message" }
ChatAge "chat-age" = "chat_age"i { return "chat_age" }
IdleDuration "idle-duration" = "idle_duration"i { return "idle_duration" }
UserEmbed "user-embed" = "user_embed"i { return "user_embed" }
Random "random" = ("random"i) ":"? WS words:DelimitedWords { return { kind: "random", values: words } }
Value "value" = "."? ("value"i) { return { kind: "value" } }

DiceRoll "rolls" = ("roll"i / "dice"i) WS ":"? WS head:RollExpr tails:TailRoll*  { return { kind: 'roll', ...head, extra: tails } }

RollPrefix = res:((amt:RollAmount "d" max:RollSides { return { amt, values: max } }) / v2:("d"? max:RollSides { return { values: max } })) { return res }
RollExpr "roll-expr" = pre:RollPrefix keep:RollKeep? adjust:RollAdjust? { return { ...pre, keep, adjust } }
RollSides "roll-sides" = sides:[0-9]|1..10| { return +sides.join('') }
RollAmount "roll-amount" = h:[1-9] t:[0-9]|0..1| { const val = h + t.join(''); return +val }
RollAdjust "roll-adjust" = dir:('+' / '-') amt:[0-9]+ { return +(amt.join('')) * (dir === '-' ? -1 : 1) }
RollKeep "roll-keep" = dir:('L'i / 'H'i) amt:[0-9]+ { return +(amt.join('')) * (dir.toLowerCase() === 'l' ? -1 : 1) }

TailRoll = WS '+' WS roll:RollExpr WS { return roll }

// Iterable entities
ChatEmbed "chat-embed" = ("chat_embed"i / "ltm"i / "long_memory"i / "longterm_memory"i / "long_term_memory"i) { return "chat_embed" }
Bots "bots" = ( "bots"i / "bot"i ) { return "bots" }
History "history" = ( "history"i / "messages"i / "msgs"i / "msg"i) { return "history" }

Interp "interp"
	= Character
  / UserEmbed
  / User
  / Scenario
  / Persona
  / Impersonate
  / AllPersona
  / Dialogue
  / History
  / Instruction
  / Jailbreak
  / Post
  / Memory
  / Message
  / ChatAge
  / IdleDuration
  / ChatEmbed
  / Random
  / DiceRoll
  / JsonSchemaValue
  / Value
`
