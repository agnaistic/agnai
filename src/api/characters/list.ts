/* eslint-disable import/prefer-default-export */
import { BASE_CORE_API_URL } from "..";
import Character from "../../models/Character";
import { camelize } from "../utils";

/** Fetches available characters. */
export const fetchCharacters = async (jwt: string): Promise<Character[]> => {
  const res = await fetch(`${BASE_CORE_API_URL}/characters`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });
  const rawCharacters: Record<string, unknown>[] = await res.json();
  return rawCharacters.map((char) => camelize(char)) as unknown as Character[];
};
