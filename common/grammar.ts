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

Parent "parent-node" = v:(BotIterator / HistoryIterator / HistoryInsert / Condition / Placeholder / Text) { return v }

ManyPlaceholder "repeatable-placeholder" = OP i:(Character / User / Random / Roll) CL {
	return { kind: 'placeholder', value: i }
}

BotIterator "bot-iterator" = OP "#each" WS loop:Bots CL children:(BotChild / LoopText)* CloseLoop { return { kind: 'each', value: loop, children } }
BotChild = i:(BotRef / BotCondition / ManyPlaceholder) { return i }

HistoryIterator "history-iterator" = OP "#each" WS loop:History CL children:(HistoryChild / LoopText)* CloseLoop { return { kind: 'each', value: loop, children } }
HistoryChild = i:(HistoryRef / HistoryCondition / ManyPlaceholder) { return i }
HistoryInsert "history-insert" = OP "#insert"i WS "="? WS line:[0-9]|1..2| CL children:(Placeholder / InsertText)* CloseInsert { return { kind: 'history-insert', values: +line.join(''), children } }
  
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

ConditionChild = Placeholder / Condition
Condition "if" = OP "#if" WS value:Word CL sub:(ConditionChild / ConditionText)* CloseCondition {
  return { kind: 'if', value, children: sub.flat() }
}

InsertText "insert-text" = !(BotChild / HistoryChild / CloseCondition / CloseInsert) ch:(.) { return ch }
LoopText "loop-text" = !(BotChild / HistoryChild / CloseCondition / CloseLoop) ch:(.)  { return ch }
ConditionText = !(ConditionChild / CloseCondition) ch:. { return ch }
Text "text" = !(Placeholder / Condition / BotIterator / HistoryIterator) ch:. { return ch }

CSV "csv" = words:WordList* WS last:Word { return [...words, last] }
WordList = word:Word WS "," WS { return word }


CloseCondition = OP "/if"i CL
CloseLoop = OP "/each"i CL
CloseInsert = OP "/insert"i CL
Word "word" = text:[a-zA-Z_ 0-9\!\?\.\'\#\@\%\"\&\*\=\+]+ { return text.join('') }
Pipe "pipe" = _ "|" _ fn:Handler {  return fn }


_ "whitespace" = [ \t]*  
OP "open" = "{{" WS
CL "close" = WS "}}" 
WS "ws" = " "*
NL "newline" = "\\n" / "\\r" "\\n"?

// Example pipe functions: lowercase, uppercase
Handler "handler" = "upper" / "lower"

BotRef = OP prop:BotProperty CL {return { kind: 'bot-prop', prop } }
HistoryRef = OP prop:HistoryProperty CL { return { kind: 'history-prop', prop } }

BotProperty "bot-prop" = "." prop:("name"i / Persona / "i"i) { return prop.toLowerCase() }
HistoryProperty "history-prop" = "." prop:(Message / "dialogue"i / "name"i / "isuser"i / "isbot"i / "i"i) { return prop.toLowerCase() }

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
ChatEmbed "chat-embed" = "chat_embed"i { return "chat_embed" }
UserEmbed "user-embed" = "user_embed"i { return "user_embed" }
Random "random" = "random"i ":"? WS words:CSV { return { kind: "random", values: words } }
Roll "roll" = ("roll"i / "dice"i) ":"? WS "d"|0..1| max:[0-9]|0..10| { return { kind: 'roll', values: +max.join('') || 20 } }

// Iterable entities
Bots "bots" = ( "bots"i / "bot"i ) { return "bots" }
History "history" = ( "history"i / "messages"i / "msgs"i / "msg"i) { return "history" }

Interp "interp"
	= Character
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
    / UserEmbed
    / Random
    / Roll
`
