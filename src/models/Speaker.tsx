/** Representation of a speaker for front-end components. */
interface Speaker {
  /** User-friendly name. */
  name: string;

  /** URL to the speaker's avatar. */
  avatarUrl?: string;

  /** Whether this is a human speaker. */
  isHuman?: boolean;
}

export default Speaker;
