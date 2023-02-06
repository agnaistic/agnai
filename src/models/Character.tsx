interface Character {
  name: string;
  avatarUrl?: string;
  description: string;
  greeting: string;
  persona: string;
  exampleConversations: string;
  visibility: "public" | "unlisted" | "private";
}
