import Message from "../../models/Message";

export const mockMessages: Message[] = [
  {
    speaker: {
      name: "John",
      avatarUrl: "#",
      isHuman: true,
    },
    utterance: "Hi Robot",
    timestamp: new Date(),
  },
];
