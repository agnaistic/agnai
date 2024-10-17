# Memory Books

## What is it?

Memory books are a way to dynamically provide context to your characters as you talk with them. Instead of filling up your entire context budget with your `Scenario`, `Persona` and `Sample Chat`, you can use Memory Books instead.

## How does it work?

When you create a **Memory Entry**, you provide: `keywords` and the `entry` text.  
You can also provide `priority` and `weight`, but we'll get to that later.

- Keywords:
  - These are words that "trigger" the memory to be inserted into your prompt.
  - E.g. `drink, thirst, hydrate, water`
- Entry:
  - This is the text that is inserted into your prompt when one of your keywords is found.
  - E.g. `{{user}}'s favourite drink is red cordial on the rocks`

Your generation settings will have a **Memory Depth**. This is the maximum number of chat messages that Agnai will scan for keywords.  
It is important to remember this all happens in your browser.

You can use `*` (matching any character zero or more times) and `?` (matching a single character) wildcards in your keywords, e.g.

- `book*` will match `book`, `books`, `booking`, but not `ebook`
- `?book` will match `ebook`, but not `book`

In particular the keyword `*` matches anything, as long as Memory settings allow for it.

### Why is it important to remember this occurs in the browser?

_Note: This does not apply to anonymous/guest users. Guest users always have the entire chat history available for prompt building._

If you configure your memory depth above `100`, the keywords may not trigger as you expect them to.
When you initially load your chat, you will be sent a maximum of 100 messages from the server. You can continue to scroll up to retrieve more messages.

## What are priority and weight?

In a nutshell, these two values are used to determine which memories to include in your memory budget (`memory context limit`) and in what order they appear in the prompt.

### Priority

The higher this value is, the more "important" it is. To evaluate which memories we will include in the prompt:

- We sort the memories by priority
- We add the memories one by one to the prompt until the budget is full

### Weight

The higher this value is, the further toward the bottom of the memory prompt the memory will be.  
The theory is: the further toward the bottom of the prompt something is, the more important it is when generating a response.

After the memories have been "pruned" to fit inside the budget the memories and then sorted by weight.

## What memory generation settings do you recommend?

At the moment I have no idea. I would be very interested to hear your experiences as you experiment with them.

The generation settings available to play with are: `depth` and `contextLimit`.

- **Depth**: This is the maximum number of chat messages to scan for keywords.
- **Context Limit**: This is the maximum number of tokens that the memory prompt will consume from your "Max Context Length".
