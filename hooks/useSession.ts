import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import useRetroStore from "../store/useRetroStore";
import { SessionEncryption, decryptCardData, decryptGroupData } from "../utils/encryption";
import type { Card, Group } from "../types";

/**
 * Hook to manage session data with Convex subscriptions and client-side decryption
 */
export function useSessionData(sessionId: Id<"sessions"> | null, sessionCode: string | null) {
  const setCards = useRetroStore((state) => state.setCards);
  const setVotes = useRetroStore((state) => state.setVotes);
  const setGroups = useRetroStore((state) => state.setGroups);
  const setPresence = useRetroStore((state) => state.setPresence);

  const encryptionRef = useRef<SessionEncryption | null>(null);

  // Initialize encryption when session code changes
  useEffect(() => {
    if (sessionCode) {
      console.log("Initializing encryption for session:", sessionCode);
      encryptionRef.current = new SessionEncryption(sessionCode);
    }
  }, [sessionCode]);

  // Subscribe to cards
  const rawCards = useQuery(
    api.cards.getCards,
    sessionId ? { sessionId } : "skip"
  );

  // Subscribe to votes
  const votes = useQuery(
    api.cards.getVotes,
    sessionId ? { sessionId } : "skip"
  );

  // Subscribe to presence
  const presence = useQuery(
    api.sessions.getPresence,
    sessionId ? { sessionId } : "skip"
  );

  // Decrypt and update cards
  useEffect(() => {
    if (rawCards && encryptionRef.current) {
      console.log("Decrypting", rawCards.length, "cards");

      const currentCards = useRetroStore.getState().cards;

      const decryptedCards: Card[] = rawCards
        .map((card) => {
          const decrypted = decryptCardData(card.encryptedData, encryptionRef.current!);
          if (!decrypted) {
            console.error("Failed to decrypt card:", card._id);
            return null;
          }

          console.log("Decrypted card:", card._id, "content:", decrypted.content, "updatedAt:", card.updatedAt);

          // Check if we have a newer version locally (prevent overwriting with stale data)
          const existingCard = currentCards.find((c) => c._id === card._id);
          if (existingCard && existingCard.updatedAt > card.updatedAt) {
            console.log("Ignoring stale update for card:", card._id, "local is newer");
            return existingCard;
          }

          return {
            _id: card._id,
            sessionId: card.sessionId,
            content: decrypted.content,
            color: decrypted.color,
            category: decrypted.category as "well" | "badly" | "todo" | null | undefined,
            position: card.position,
            authorName: card.authorName,
            createdAt: card.createdAt,
            updatedAt: card.updatedAt,
            groupId: card.groupId,
          };
        })
        .filter((c) => c !== null) as Card[];

      console.log("Setting", decryptedCards.length, "decrypted cards");
      setCards(decryptedCards);
    }
  }, [rawCards, setCards]);

  // Update votes
  useEffect(() => {
    if (votes) {
      setVotes(votes);
    }
  }, [votes, setVotes]);

  // Update presence
  useEffect(() => {
    if (presence) {
      setPresence(presence);
    }
  }, [presence, setPresence]);

  return {
    encryption: encryptionRef.current,
  };
}

/**
 * Hook to send presence heartbeats
 */
export function usePresenceHeartbeat(
  sessionId: Id<"sessions"> | null,
  userName: string | null
) {
  const updatePresence = useMutation(api.sessions.updatePresence);

  useEffect(() => {
    if (!sessionId || !userName) return;

    // Send heartbeat every 10 seconds
    const interval = setInterval(() => {
      updatePresence({ sessionId, userName });
    }, 10000);

    return () => clearInterval(interval);
  }, [sessionId, userName, updatePresence]);
}
