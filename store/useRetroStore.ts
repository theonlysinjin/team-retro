import { create } from "zustand";
import type { Id } from "../convex/_generated/dataModel";
import type { RetroState } from "../types";

/**
 * Zustand store for local UI state
 * Real data comes from Convex subscriptions and is set here after decryption
 */
const useRetroStore = create<RetroState>((set) => ({
  // Session info
  sessionId: null,
  sessionCode: null,
  isHost: false,
  userName: null,

  // Data (decrypted, from Convex subscriptions)
  cards: [],
  votes: [],
  groups: [],
  presence: [],

  // Canvas state
  canvasOffset: { x: 0, y: 0 },

  // Actions
  initialize: (sessionId, sessionCode, isHost, userName) => {
    set({
      sessionId,
      sessionCode,
      isHost,
      userName,
    });
  },

  setCards: (cards) => set({ cards }),
  setVotes: (votes) => set({ votes }),
  setGroups: (groups) => set({ groups }),
  setPresence: (presence) => set({ presence }),

  // Optimistic card position update (for smooth drag)
  updateCardPosition: (cardId: Id<"cards">, position: { x: number; y: number }) => {
    set((state) => ({
      cards: state.cards.map((card) =>
        card._id === cardId ? { ...card, position } : card
      ),
    }));
  },

  // Optimistic vote add
  addVoteOptimistic: (cardId: Id<"cards">, userName: string) => {
    set((state) => ({
      votes: [
        ...state.votes,
        {
          _id: `temp-${Date.now()}` as Id<"votes">,
          cardId,
          sessionId: state.sessionId!,
          userName,
          createdAt: Date.now(),
        },
      ],
    }));
  },

  // Optimistic vote remove
  removeVoteOptimistic: (cardId: Id<"cards">, userName: string) => {
    set((state) => ({
      votes: state.votes.filter(
        (v) => !(v.cardId === cardId && v.userName === userName)
      ),
    }));
  },

  // Optimistic card content update
  updateCardContent: (cardId: Id<"cards">, content: string, color: string) => {
    set((state) => ({
      cards: state.cards.map((card) =>
        card._id === cardId ? { ...card, content, color, updatedAt: Date.now() } : card
      ),
    }));
  },

  setCanvasOffset: (offset) => set({ canvasOffset: offset }),

  reset: () => {
    set({
      sessionId: null,
      sessionCode: null,
      isHost: false,
      userName: null,
      cards: [],
      votes: [],
      groups: [],
      presence: [],
      canvasOffset: { x: 0, y: 0 },
    });
  },
}));

export default useRetroStore;
