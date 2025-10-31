/**
 * Board Component - Infinite Canvas with Pan & Drag-and-Drop
 *
 * COORDINATE SYSTEM OVERVIEW:
 * ===========================
 *
 * 1. Viewport Coordinates:
 *    - Raw mouse position (clientX, clientY)
 *    - Relative to browser window
 *
 * 2. Container Coordinates:
 *    - Viewport coords minus container offset
 *    - Relative to the Board's <div> container
 *
 * 3. Canvas Coordinates (PRIMARY):
 *    - Container coords minus canvasOffset
 *    - This is where card.position is stored
 *    - Cards are positioned absolutely within the transformed canvas
 *
 * TRANSFORM HIERARCHY:
 * ====================
 * Container (Board div)
 *   └─> Canvas (transformed by canvasOffset)
 *       └─> Cards (positioned absolutely at card.position)
 *
 * DRAG & DROP:
 * ============
 * - @dnd-kit provides delta in viewport/screen coordinates
 * - Delta represents pixel movement of mouse
 * - Since cards move 1:1 with mouse, delta can be applied directly to card.position
 * - During drag: source card hidden (opacity: 0), DragOverlay shows visual feedback
 * - On drop: card.position updated with delta, then synced to Convex
 *
 * PAN:
 * ====
 * - Wheel/trackpad panning updates canvasOffset
 * - Mouse drag panning also updates canvasOffset
 * - Canvas transform applied as: translate(canvasOffset.x, canvasOffset.y)
 */

import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { DndContext, DragEndEvent, DragOverlay, closestCenter } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import useRetroStore from "../store/useRetroStore";
import Card from "./Card";
import type { SessionEncryption } from "../utils/encryption";
import { DEFAULT_COLOR, CARD_COLORS } from "../utils/colors";
import { encryptCardData } from "../utils/encryption";

interface BoardProps {
  encryption: SessionEncryption;
}

export default function Board({ encryption }: BoardProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  const sessionId = useRetroStore((state) => state.sessionId);
  const userName = useRetroStore((state) => state.userName);
  const cards = useRetroStore((state) => state.cards);
  const votes = useRetroStore((state) => state.votes);
  const groups = useRetroStore((state) => state.groups);
  const canvasOffset = useRetroStore((state) => state.canvasOffset);
  const setCanvasOffset = useRetroStore((state) => state.setCanvasOffset);

  const createCardMutation = useMutation(api.cards.createCard);
  const updateCardMutation = useMutation(api.cards.updateCard);
  const createGroupMutation = useMutation(api.groups.createGroup);
  const addCardToGroupMutation = useMutation(api.groups.addCardToGroup);

  // Center canvas on first load (useLayoutEffect runs before paint)
  useLayoutEffect(() => {
    if (!hasScrolled && Platform.OS === "web") {
      // Start centered on swimlanes
      setCanvasOffset({ x: window.innerWidth / 2 - 640, y: window.innerHeight / 2 - 640 });
      setHasScrolled(true);
    }
  }, [hasScrolled, setCanvasOffset]);

  // Handle wheel with native listener for pan (removed zoom functionality)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelNative = (e: WheelEvent) => {
      // Pan with trackpad/mouse wheel
      e.preventDefault();
      setCanvasOffset({
        x: canvasOffset.x - e.deltaX,
        y: canvasOffset.y - e.deltaY,
      });
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelNative);
  }, [canvasOffset, setCanvasOffset]);

  // Handle double-click to create card
  const handleDoubleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sessionId || !userName) {
      console.error("Cannot create card: missing sessionId or userName", { sessionId, userName });
      return;
    }

    if (!encryption) {
      console.error("Cannot create card: encryption not ready");
      alert("Not ready yet, please wait a moment...");
      return;
    }

    // Don't create card if clicking on an existing card
    const target = e.target as HTMLElement;
    if (target.closest('[data-card]')) return;

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    // Calculate position relative to the container, accounting for canvas offset
    const x = (e.clientX - containerRect.left - canvasOffset.x);
    const y = (e.clientY - containerRect.top - canvasOffset.y);

    // Quick card creation with fun placeholder
    const placeholders = [
      "What's on your mind?",
      "Share your thoughts...",
      "Tell us more!",
      "What happened?",
      "Any ideas?",
      "Your feedback here...",
    ];
    const placeholder = placeholders[Math.floor(Math.random() * placeholders.length)];

    console.log("Creating card at", { x, y }, "by", userName, "encryption ready:", !!encryption);

    const encryptedData = encryptCardData(
      placeholder,
      DEFAULT_COLOR.value,
      null,
      encryption
    );

    console.log("Encrypted:", encryptedData.substring(0, 30) + "...");

    try {
      const result = await createCardMutation({
        sessionId,
        encryptedData,
        position: { x, y },
        authorName: userName,
      });
      console.log("Card created successfully, ID:", result);
    } catch (error) {
      console.error("Failed to create card:", error);
      alert("Failed to create card: " + error);
    }
  };

  // Handle card drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, delta } = event;

    if (!delta) {
      setActiveId(null);
      return;
    }

    const card = cards.find((c) => c._id === active.id);
    if (!card) {
      setActiveId(null);
      return;
    }

    // Calculate new position in canvas coordinates
    // Delta from @dnd-kit is in viewport/screen coordinates, which matches
    // our canvas coordinate system since cards move 1:1 with mouse movement
    const newX = card.position.x + delta.x;
    const newY = card.position.y + delta.y;

    console.log("Drag end:", {
      cardId: card._id,
      oldPosition: card.position,
      delta,
      newPosition: { x: newX, y: newY },
      canvasOffset,
    });

    // Check if dropped on another card using bounding box overlap detection
    // Card dimensions: ~280px wide × ~140px tall (see Card.tsx styles)
    const CARD_WIDTH = 280;
    const CARD_HEIGHT = 140;
    const OVERLAP_THRESHOLD = 0.3; // 30% overlap required to group

    const droppedOnCard = cards.find((c) => {
      if (c._id === card._id) return false;

      // Calculate bounding boxes
      const cardA = {
        left: newX,
        right: newX + CARD_WIDTH,
        top: newY,
        bottom: newY + CARD_HEIGHT,
      };

      const cardB = {
        left: c.position.x,
        right: c.position.x + CARD_WIDTH,
        top: c.position.y,
        bottom: c.position.y + CARD_HEIGHT,
      };

      // Check for overlap
      const overlapX = Math.max(0, Math.min(cardA.right, cardB.right) - Math.max(cardA.left, cardB.left));
      const overlapY = Math.max(0, Math.min(cardA.bottom, cardB.bottom) - Math.max(cardA.top, cardB.top));
      const overlapArea = overlapX * overlapY;
      const cardArea = CARD_WIDTH * CARD_HEIGHT;

      // Group if overlap is at least 30% of a card's area
      return overlapArea >= cardArea * OVERLAP_THRESHOLD;
    });

    if (droppedOnCard) {
      console.log("Dropped on card:", droppedOnCard._id);

      // Calculate smart position for the dropped card within the group
      // Uses a cascading stack effect: each card offset by 20px right and 20px down
      const STACK_OFFSET_X = 20;
      const STACK_OFFSET_Y = 20;

      // Check if target card already has a group
      if (droppedOnCard.groupId) {
        // Add this card to existing group
        const group = groups.find((g) => g._id === droppedOnCard.groupId);
        const groupCards = cards.filter((c) => c.groupId === droppedOnCard.groupId);

        // Find the next available position in the stack
        // Position is based on the number of cards already in the group
        const stackIndex = groupCards.length; // This card will be the next in the stack
        const baseCard = groupCards[0] || droppedOnCard; // Use first card as base

        await addCardToGroupMutation({
          cardId: card._id,
          groupId: droppedOnCard.groupId,
        });

        await updateCardMutation({
          cardId: card._id,
          position: {
            x: baseCard.position.x + stackIndex * STACK_OFFSET_X,
            y: baseCard.position.y + stackIndex * STACK_OFFSET_Y,
          },
        });
      } else {
        // Create new group with both cards
        const encryptedData = encryption.encrypt({ name: "" }); // Empty name by default

        const groupId = await createGroupMutation({
          sessionId: sessionId!,
          encryptedData,
          position: droppedOnCard.position,
          cardIds: [droppedOnCard._id, card._id],
        });

        // Position second card with stack offset from first card
        await updateCardMutation({
          cardId: card._id,
          position: {
            x: droppedOnCard.position.x + STACK_OFFSET_X,
            y: droppedOnCard.position.y + STACK_OFFSET_Y,
          },
        });
      }
    } else {
      // Just update position
      await updateCardMutation({
        cardId: card._id,
        position: { x: newX, y: newY },
      });
    }

    setActiveId(null);
  };

  // Handle canvas clicks - blur any active inputs or start panning
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Don't pan if clicking on a card
    if (target.closest('[data-card]')) return;
    // Don't pan if user is dragging a card
    if (activeId) return;

    // Blur any focused input (saves card edits)
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.tagName === 'TEXTAREA') {
      activeElement.blur();
      // Don't start panning if we just blurred an input
      return;
    }

    e.preventDefault();
    let startX = e.clientX;
    let startY = e.clientY;
    const startOffsetX = canvasOffset.x;
    const startOffsetY = canvasOffset.y;
    let hasMoved = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved = true;
      }
      setCanvasOffset({ x: startOffsetX + dx, y: startOffsetY + dy });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const activeCard = activeId ? cards.find((c) => c._id === activeId) : null;

  if (Platform.OS !== "web") return null;

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#f9fafb",
      }}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
    >
      <div
        ref={canvasRef}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
          cursor: "grab",
        }}
      >
        {/* Centered swimlanes background */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "1280px",
            height: "1280px",
            backgroundImage: "url(/team-retro/swimlanes.svg)",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Group indicators (behind cards) */}
        {groups.map((group) => {
          const groupCards = cards.filter((c) => c.groupId === group._id);
          if (groupCards.length === 0) return null;

          // Calculate bounds of all cards in group
          const CARD_WIDTH = 280;
          const CARD_HEIGHT = 140;
          const minX = Math.min(...groupCards.map((c) => c.position.x));
          const minY = Math.min(...groupCards.map((c) => c.position.y));
          const maxX = Math.max(...groupCards.map((c) => c.position.x + CARD_WIDTH));
          const maxY = Math.max(...groupCards.map((c) => c.position.y + CARD_HEIGHT));

          return (
            <div
              key={group._id}
              style={{
                position: "absolute",
                left: minX - 16,
                top: minY - 16,
                width: maxX - minX + 32,
                height: maxY - minY + 32,
                border: "3px dashed #8b5cf6",
                borderRadius: "20px",
                backgroundColor: "rgba(139, 92, 246, 0.08)",
                pointerEvents: "none",
                zIndex: 0,
                boxShadow: "0 4px 12px rgba(139, 92, 246, 0.15)",
              }}
            >
              {/* Card count badge */}
              <div
                style={{
                  position: "absolute",
                  top: -12,
                  right: 12,
                  background: "#8b5cf6",
                  color: "#fff",
                  padding: "4px 10px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: "700",
                  boxShadow: "0 2px 8px rgba(139, 92, 246, 0.3)",
                }}
              >
                {groupCards.length} {groupCards.length === 1 ? "card" : "cards"}
              </div>

              {/* Group name (if set) */}
              {group.name && (
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    left: 12,
                    background: "#8b5cf6",
                    color: "#fff",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "700",
                    boxShadow: "0 2px 8px rgba(139, 92, 246, 0.3)",
                  }}
                >
                  {group.name}
                </div>
              )}
            </div>
          );
        })}

        {/* Cards canvas */}
        <DndContext
          onDragStart={({ active }) => setActiveId(active.id as string)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
          collisionDetection={closestCenter}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
            }}
          >
          {cards.map((card) => {
            const cardVotes = votes.filter((v) => v.cardId === card._id);
            const hasVoted = cardVotes.some((v) => v.userName === userName);
            const voters = cardVotes.map((v) => v.userName);

            return (
              <motion.div
                key={`${card._id}-${card.updatedAt}`}
                data-card
                style={{
                  position: "absolute",
                }}
                initial={false}
                animate={{
                  left: card.position.x,
                  top: card.position.y,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  mass: 0.8,
                }}
              >
                <Card
                  card={card}
                  votes={cardVotes.length}
                  hasVoted={hasVoted}
                  voters={voters}
                  encryption={encryption}
                />
              </motion.div>
            );
          })}
        </div>

          <DragOverlay>
            {activeId && activeCard ? (
              <div style={{ opacity: 0.8 }}>
                <Card
                  card={activeCard}
                  votes={votes.filter((v) => v.cardId === activeId).length}
                  hasVoted={votes.some((v) => v.cardId === activeId && v.userName === userName)}
                  voters={votes.filter((v) => v.cardId === activeId).map((v) => v.userName)}
                  encryption={encryption}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Instructions overlay */}
        {cards.length === 0 && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}>
            <Text style={styles.instructionText}>Double-click anywhere to create a card</Text>
            <Text style={styles.instructionSubtext}>or use the "Add Card" button</Text>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = StyleSheet.create({
  instructionText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#9ca3af",
    marginBottom: 8,
  },
  instructionSubtext: {
    fontSize: 14,
    color: "#d1d5db",
  },
});
