import type { Id } from "../convex/_generated/dataModel";

export interface Card {
  _id: Id<"cards">;
  sessionId: Id<"sessions">;
  // Decrypted data
  content: string;
  color: string;
  category?: "well" | "badly" | "todo" | null;
  // Metadata
  position: { x: number; y: number };
  authorName: string;
  createdAt: number;
  updatedAt: number;
  groupId?: Id<"groups">;
}

export interface Vote {
  _id: Id<"votes">;
  cardId: Id<"cards">;
  sessionId: Id<"sessions">;
  userName: string;
  createdAt: number;
}

export interface Group {
  _id: Id<"groups">;
  sessionId: Id<"sessions">;
  // Decrypted data
  name?: string;
  color?: string;
  // Metadata
  position: { x: number; y: number };
}

export interface Presence {
  _id: Id<"presence">;
  sessionId: Id<"sessions">;
  userName: string;
  lastSeen: number;
  color: string;
  userAgent?: string;
}

export interface Session {
  _id: Id<"sessions">;
  code: string;
  hostName: string;
  encryptedKey?: string;
  createdAt: number;
  status: "active" | "archived";
}

// Encrypted card data that gets stored in Convex
export interface EncryptedCardData {
  content: string;
  color: string;
  category?: "well" | "badly" | "todo" | null;
}

// Encrypted group data
export interface EncryptedGroupData {
  name?: string;
  color?: string;
}

// UI State
export interface RetroState {
  // Session info
  sessionId: Id<"sessions"> | null;
  sessionCode: string | null;
  isHost: boolean;
  userName: string | null;

  // Decrypted data (subscribed from Convex)
  cards: Card[];
  votes: Vote[];
  groups: Group[];
  presence: Presence[];

  // Canvas state
  canvasOffset: { x: number; y: number };

  // Actions
  initialize: (sessionId: Id<"sessions">, sessionCode: string, isHost: boolean, userName: string) => void;
  setCards: (cards: Card[]) => void;
  setVotes: (votes: Vote[]) => void;
  setGroups: (groups: Group[]) => void;
  setPresence: (presence: Presence[]) => void;
  // Optimistic updates for instant UI feedback
  updateCardPosition: (cardId: Id<"cards">, position: { x: number; y: number }) => void;
  updateCardContent: (cardId: Id<"cards">, content: string, color: string) => void;
  addVoteOptimistic: (cardId: Id<"cards">, userName: string) => void;
  removeVoteOptimistic: (cardId: Id<"cards">, userName: string) => void;
  // Canvas
  setCanvasOffset: (offset: { x: number; y: number }) => void;
  reset: () => void;
}
