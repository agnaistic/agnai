import Speaker from "./Speaker";

/** Represents an individual message. */
interface Message {
  /** Who sent this message. */
  speaker: Speaker;

  /** Contents of the message. */
  utterance: string;

  /** When the message was sent. */
  timestamp: Date;
}

export default Message;
