export const grammar = `
Expression = content:Parent* { return content.filter(v => !!v) }

Parent "parent-node" = v:(BotIterator / HistoryIterator / Condition / Placeholder / Text) { return v }

ManyPlaceholder "repeatable-placeholder" = OP i:(Character / User) CL {
	return { kind: 'placeholder', value: i }
}

BotIterator "bot-iterator" = OP "#each" WS loop:Bots CL children:(BotChild / LoopText)* CloseLoop { return { kind: 'each', value: loop, children } }
BotChild = i:(BotRef / BotCondition / ManyPlaceholder) { return i }

HistoryIterator "history-iterator" = OP "#each" WS loop:History CL children:(HistoryChild / LoopText)* CloseLoop { return { kind: 'each', value: loop, children } }
HistoryChild = i:(HistoryRef / HistoryCondition / ManyPlaceholder) { return i }
  
Placeholder "placeholder"
  = OP WS interp:Interp WS pipes:Pipe* CL {
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


LoopText "loop-text" = !(BotChild / HistoryChild / CloseCondition / CloseLoop) ch:(.)  { return ch }
ConditionText = !(ConditionChild / CloseCondition) ch:. { return ch }
Text "text" = !(Placeholder / Condition / BotIterator / HistoryIterator) ch:. { return ch }

CloseCondition = OP "/if"i CL
CloseLoop = OP "/each"i CL
Word "word" = text:[a-zA-Z_]+ {  return text.join('') }
Pipe "pipe" = _ "|" _ fn:Handler {  return fn }


_ "whitespace" = [ \t]*  
OP "open" = "{{" WS
CL "close" = WS "}}" 
WS "ws" = " "*

// Example pipe functions: lowercase, uppercase
Handler "handler" = "upper" / "lower"

BotRef = OP prop:BotProperty CL {return { kind: 'bot-prop', prop } }
HistoryRef = OP prop:HistoryProperty CL { return { kind: 'history-prop', prop } }

BotProperty "bot-prop" = "." prop:("name"i / Persona / "i"i) { return prop.toLowerCase() }
HistoryProperty "history-prop" = "." prop:(Message / "dialogue"i / "name"i / "isuser"i / "isbot"i / "i"i) { return prop.toLowerCase() }

Character "character" = "char"i / "character"i / "bot"i { return "char" }
User "user" = "user"i { return "user" }
Scenario "scenario" = "scenario"i { return "scenario" }
Persona "personality" = "personality"i / "persona"i { return "personality" }
AllPersona "all_personalities" = "all_personas"i / "all_personalities"i { return "all_personalities" }
Dialogue "example_dialogue" = "samplechat"i / "example_dialogue"i { return "example_dialogue" }

Note "ujb" = "ujb"i / "system_note"i { return "ujb" }
Post "post" = "post"i { return "post" }
Memory "memory" = "memory"i { return "memory" }
Message "message" = "msg"i / "message"i / "text"i { return "message" }
ChatAge "chat-age" = "chat_age"i { return "chat_age" }
IdleDuration "idle-duration" = "idle_duration"i { return "idle_duration" }
ChatEmbed "chat-embed" = "chat_embed"i { return "chat_embed" }
UserEmbed "user-embed" = "user"i { return "user_embed" }

// Iterable entities
Bots "bots" = ( "bots"i ) { return "bots" }
History "history" = ( "history"i / "messages"i / "msgs"i / "msg"i) { return "history" }

Interp "interp"
	= Character
	/ User
    / Scenario
    / Persona
    / AllPersona
    / Dialogue
    / History
    / Note
    / Post
    / Memory
    / Message
    / ChatAge
    / IdleDuration
    / ChatEmbed
    / UserEmbed
`
