export const grammar = `
Expression
  = pre:Text? content:Parent* post:Text? {
   return [pre, ...content, post].filter(v => !!v)
  }

Parent "parent-node" = v:(BotIterator / HistoryIterator / Condition / Placeholder / Text) { return v }
  
Child "child-node" = v:(Condition / Placeholder) { return v }  
  
Placeholder "placeholder"
  = OP WS interp:Interp WS pipes:Pipe* CL {
  return { kind: 'placeholder', value: interp, pipes }
}

BotIterator "bot-iterator" = OP "#each" WS value:Bots CL pre:Text? sub:(BotCondition / BotRef / Child / Text)* post:Text? OP "/each" CL {
  return { kind: 'each', value, children: [pre,...sub,post].filter(v => !!v) }
}

HistoryIterator "msg-iterator" = OP "#each" WS value:History CL pre:Text? sub:(HistoryCondition / HistoryRef / Child / Text)* post:Text? OP "/each" CL {
  return { kind: 'each', value, children: [pre,...sub,post].filter(v => !!v) }
}

BotCondition "bot-condition" = OP "#if" WS prop:BotProperty CL pre:Text? sub:(BotRef / Child / Text)* post:Text? OP "/if" CL {
  return { kind: 'bot-if', prop, children: sub.flat() }
}

HistoryCondition "history-condition" = OP "#if" WS prop:HistoryProperty CL sub:(HistoryRef / Child / Text)* OP "/if" CL {
  return { kind: 'history-if', prop, children: sub.flat() }
}

Condition "if" = OP "#if" WS value:Word CL sub:(Child / Text)* OP "/if" CL {
  return { kind: 'if', value, children: sub.flat() }
}

Word "word" = text:[a-zA-Z_]+ {
  return text.join('')
}

Pipe "pipe" = _ "|" _ fn:Handler {
  return fn
}

Text "text" = ch:Char+ {
  const text = ch.join('')
  return text
}

Char "character" = word:(.) & {
	const first = word.charCodeAt(0)
    return first !== 123
} { return word }

_ "whitespace"
  = [ \t]*
  
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
Dialogue "example_dialogue" = "samplechat"i / "example_dialogue"i { return "example_dialogue" }

Note "ujb" = "ujb"i / "system_note"i { return "ujb" }
Post "post" = "post"i { return "post" }
Memory "memory" = "memory"i { return "memory" }
Message "message" = "msg"i / "message"i / "text"i { return "message" }

// Iterable entities
Bots "bots" = ( "bots"i / "characters"i ) { return "bots" }
History "history" = ( "history"i / "messages"i ) { return "history" }

Interp "interp"
	= Character
	/ User
    / Scenario
    / Persona
    / Dialogue
    / History
    / Note
    / Post
    / Memory
    / Message
`
