import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { DndContext, DragEndEvent, DragOverlay, closestCenter } from "@dnd-kit/core";
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
  const canvasZoom = useRetroStore((state) => state.canvasZoom);
  const setCanvasOffset = useRetroStore((state) => state.setCanvasOffset);
  const setCanvasZoom = useRetroStore((state) => state.setCanvasZoom);

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

  // Handle wheel with native listener to avoid passive event issues
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelNative = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        const newZoom = Math.max(0.5, Math.min(2, canvasZoom + delta));
        setCanvasZoom(newZoom);
      } else {
        // Pan
        e.preventDefault();
        setCanvasOffset({
          x: canvasOffset.x - e.deltaX,
          y: canvasOffset.y - e.deltaY,
        });
      }
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelNative);
  }, [canvasOffset, canvasZoom, setCanvasOffset, setCanvasZoom]);

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

    const newX = card.position.x + delta.x;
    const newY = card.position.y + delta.y;

    // Check if dropped on another card (within 80px)
    const droppedOnCard = cards.find((c) => {
      if (c._id === card._id) return false;
      const dx = Math.abs(c.position.x - newX);
      const dy = Math.abs(c.position.y - newY);
      return dx < 80 && dy < 80;
    });

    if (droppedOnCard) {
      console.log("Dropped on card:", droppedOnCard._id);

      // Check if target card already has a group
      if (droppedOnCard.groupId) {
        // Add this card to existing group
        await addCardToGroupMutation({
          cardId: card._id,
          groupId: droppedOnCard.groupId,
        });

        // Position near the target card
        await updateCardMutation({
          cardId: card._id,
          position: { x: droppedOnCard.position.x + 15, y: droppedOnCard.position.y + 15 },
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

        // Position cards in the group
        await updateCardMutation({
          cardId: card._id,
          position: { x: droppedOnCard.position.x + 15, y: droppedOnCard.position.y + 15 },
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
          const minX = Math.min(...groupCards.map((c) => c.position.x));
          const minY = Math.min(...groupCards.map((c) => c.position.y));
          const maxX = Math.max(...groupCards.map((c) => c.position.x + 280));
          const maxY = Math.max(...groupCards.map((c) => c.position.y + 140));

          return (
            <div
              key={group._id}
              style={{
                position: "absolute",
                left: minX - 12,
                top: minY - 12,
                width: maxX - minX + 24,
                height: maxY - minY + 24,
                border: "2px dashed #6366f1",
                borderRadius: "16px",
                backgroundColor: "rgba(99, 102, 241, 0.05)",
                pointerEvents: "none",
                zIndex: 0,
              }}
            >
              {group.name && (
                <div
                  style={{
                    position: "absolute",
                    top: -8,
                    left: 12,
                    background: "#6366f1",
                    color: "#fff",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "700",
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
              <div
                key={`${card._id}-${card.updatedAt}`}
                data-card
                style={{
                  position: "absolute",
                  left: card.position.x,
                  top: card.position.y,
                }}
              >
                <Card
                  card={card}
                  votes={cardVotes.length}
                  hasVoted={hasVoted}
                  voters={voters}
                  encryption={encryption}
                />
              </div>
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
