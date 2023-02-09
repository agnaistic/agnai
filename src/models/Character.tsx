interface Character {
  id: string;

  name: string;
  description: string;
  avatarId?: string;
  visibility: "public" | "private" | "unlisted";

  createdAt: string;
  updatedAt: string;
}

export default Character;
