export const grammar = `
Expression
  = pre:Text? content:(Parent / Text)* post:Text? {
   return [pre, ...content, post].filter(v => !!v)
  }

Parent "parent" = v:(BotIterator / HistoryIterator / Condition / Placeholder / Text) { return v }
  
Child "child" = v:(Condition / Placeholder) { return v }  
  
Placeholder "placeholder" = OP WS interp:Interp WS pipes:Pipe* CL {
  return { kind: 'placeholder', value: interp, pipes }
}

BotIterator "bot-iterator" = OP "#each" WS value:Bots CL sub:(BotProp / Child / Text)* OP "/each" CL {
  return { kind: 'each', value, children: sub.flat() }
}

HistoryIterator "msg-iterator" = OP "#each" WS value:History CL sub:(HistoryProp / Child / Text)* OP "/each" CL {
  return { kind: 'each', value, children: sub.flat() }
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
  return ch.map(c => c[0]).join('')
}

Char "character" = word:(.) & {
	const code = word.charCodeAt(0)
    if (code === 123) return false
    return word
}

_ "whitespace"
  = [ \t]*
  
OP "open" = "{{" WS
CL "close" = WS "}}"
 
WS "ws" = " "*

// Example pipe functions: lowercase, uppercase
Handler "handler" = "upper" / "lower"

BotProp = pre:Text? OP "." prop:("name"i / Persona / "i"i) CL post:Text? {
  return [pre, { kind: 'bot-prop', prop }, post].filter(v => !!v)
}

HistoryProp = pre:Text? OP "." prop:(Message / "dialogue"i / "name"i / "i"i) CL post:Text? {
  return [pre, { kind: 'history-prop', prop }, post].filter(v => !!v)
}

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

Interp "interp" = Character
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
