import React, { useState, useRef, useEffect } from "react";
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
  const canvasOffset = useRetroStore((state) => state.canvasOffset);
  const canvasZoom = useRetroStore((state) => state.canvasZoom);
  const setCanvasOffset = useRetroStore((state) => state.setCanvasOffset);
  const setCanvasZoom = useRetroStore((state) => state.setCanvasZoom);

  const createCardMutation = useMutation(api.cards.createCard);
  const updateCardMutation = useMutation(api.cards.updateCard);

  // Auto-scroll to center on first load
  useEffect(() => {
    if (containerRef.current && !hasScrolled) {
      const container = containerRef.current;
      // Center the swimlanes (3000 - 720) / 2 = 1140
      container.scrollLeft = 1140;
      // Center vertically (3000 - 1280) / 2 = 860
      container.scrollTop = 860;
      setHasScrolled(true);
    }
  }, [hasScrolled]);

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

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - canvasOffset.x) / canvasZoom;
    const y = (e.clientY - rect.top - canvasOffset.y) / canvasZoom;

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
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;

    if (!delta) return;

    const card = cards.find((c) => c._id === active.id);
    if (!card) return;

    const newX = card.position.x + delta.x / canvasZoom;
    const newY = card.position.y + delta.y / canvasZoom;

    // Check if dropped on another card (within 50px)
    const droppedOnCard = cards.find((c) => {
      if (c._id === card._id) return false;
      const dx = Math.abs(c.position.x - newX);
      const dy = Math.abs(c.position.y - newY);
      return dx < 50 && dy < 50;
    });

    let finalPosition: { x: number; y: number };

    if (droppedOnCard) {
      // Snap to same position with offset for grouping
      finalPosition = {
        x: droppedOnCard.position.x + 20,
        y: droppedOnCard.position.y + 20
      };
      console.log("Grouped with card:", droppedOnCard._id);
    } else {
      finalPosition = { x: newX, y: newY };
    }

    // Update position in Convex - will sync back immediately
    updateCardMutation({
      cardId: card._id,
      position: finalPosition,
    });

    setActiveId(null);
  };

  // Handle canvas pan
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-card]')) return;

    // Implement panning
    let startX = e.clientX;
    let startY = e.clientY;
    const startOffsetX = canvasOffset.x;
    const startOffsetY = canvasOffset.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setCanvasOffset({ x: startOffsetX + dx, y: startOffsetY + dy });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      const newZoom = Math.max(0.5, Math.min(2, canvasZoom + delta));
      setCanvasZoom(newZoom);
    }
  };

  const activeCard = activeId ? cards.find((c) => c._id === activeId) : null;

  if (Platform.OS !== "web") return null;

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: "relative",
        overflow: "auto",
        backgroundColor: "#f9fafb",
      }}
    >
      <div
        ref={canvasRef}
        style={{
          position: "relative",
          width: "3000px",
          height: "3000px",
          cursor: "grab",
        }}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
      >
        {/* Centered swimlanes background */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "720px",
            height: "1280px",
            backgroundImage: "url(/team-retro/swimlanes.svg)",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Cards canvas */}
        <DndContext
          onDragStart={({ active }) => setActiveId(active.id as string)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
          collisionDetection={closestCenter}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
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
