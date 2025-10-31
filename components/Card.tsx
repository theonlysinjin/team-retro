import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Card as CardType } from "../types";
import { CARD_COLORS } from "../utils/colors";
import { SessionEncryption, encryptCardData } from "../utils/encryption";
import useRetroStore from "../store/useRetroStore";

interface CardProps {
  card: CardType;
  votes: number;
  hasVoted: boolean;
  voters: string[];
  encryption: SessionEncryption;
}

export default function Card({ card, votes, hasVoted, voters, encryption }: CardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(card.content);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showVoters, setShowVoters] = useState(false);

  const sessionId = useRetroStore((state) => state.sessionId);
  const userName = useRetroStore((state) => state.userName);
  const addVoteOptimistic = useRetroStore((state) => state.addVoteOptimistic);
  const removeVoteOptimistic = useRetroStore((state) => state.removeVoteOptimistic);

  const updateCardMutation = useMutation(api.cards.updateCard);
  const deleteCardMutation = useMutation(api.cards.deleteCard);
  const addVoteMutation = useMutation(api.cards.addVote);
  const removeVoteMutation = useMutation(api.cards.removeVote);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card._id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const handleSave = async () => {
    if (editContent.trim() && editContent !== card.content) {
      const encryptedData = encryptCardData(
        editContent.trim(),
        card.color,
        card.category || null,
        encryption
      );

      await updateCardMutation({
        cardId: card._id,
        encryptedData,
      });
    }
    setIsEditing(false);
  };

  const handleColorChange = async (color: string) => {
    const encryptedData = encryptCardData(
      card.content,
      color,
      card.category || null,
      encryption
    );

    await updateCardMutation({
      cardId: card._id,
      encryptedData,
    });
    setShowColorPicker(false);
  };

  const handleVoteToggle = () => {
    if (!sessionId || !userName) return;

    // Optimistic update - instant UI feedback
    if (hasVoted) {
      removeVoteOptimistic(card._id, userName);
      // Sync in background
      removeVoteMutation({ cardId: card._id, userName }).catch((error) => {
        console.error("Vote remove error:", error);
        // Vote will be re-synced from Convex
      });
    } else {
      addVoteOptimistic(card._id, userName);
      // Sync in background
      addVoteMutation({ cardId: card._id, sessionId, userName }).catch((error) => {
        console.error("Vote add error:", error);
        // Vote will be re-synced from Convex
      });
    }
  };

  const handleDelete = async () => {
    if (confirm("Delete this card?")) {
      await deleteCardMutation({ cardId: card._id });
    }
  };

  const colorConfig = CARD_COLORS.find((c) => c.value === card.color) || CARD_COLORS[0];

  if (Platform.OS === "web") {
    return (
      <div ref={setNodeRef} style={style}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: isDragging ? 0.5 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: colorConfig.value,
                borderLeftColor: colorConfig.border,
                borderLeftWidth: 4,
              },
            ]}
          >
            {/* Drag handle */}
            <div {...attributes} {...listeners} style={{ cursor: "grab", width: "100%", touchAction: "none" }}>
              <View style={styles.dragHandle}>
                <View style={styles.dragIndicator} />
              </View>
            </div>

            {/* Card content */}
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editContent}
                onChangeText={setEditContent}
                multiline
                autoFocus
                onBlur={handleSave}
              />
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={styles.content}>{card.content}</Text>
              </TouchableOpacity>
            )}

            {/* Author */}
            <Text style={styles.author}>— {card.authorName}</Text>

            {/* Footer */}
            <View style={styles.footer}>
              {/* Vote button with voter list */}
              <div style={{ position: "relative" }}>
                <TouchableOpacity
                  style={[
                    styles.voteButton,
                    hasVoted && styles.voteButtonActive,
                  ]}
                  onPress={handleVoteToggle}
                  onMouseEnter={() => setShowVoters(true)}
                  onMouseLeave={() => setShowVoters(false)}
                >
                  <Text style={styles.voteIcon}>👍</Text>
                  {votes > 0 && <Text style={styles.voteCount}>{votes}</Text>}
                </TouchableOpacity>

                {/* Voter tooltip */}
                {showVoters && voters.length > 0 && (
                  <View style={styles.voterTooltip}>
                    {voters.map((voter, idx) => (
                      <Text key={idx} style={styles.voterName}>
                        {voter}
                      </Text>
                    ))}
                  </View>
                )}
              </div>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowColorPicker(!showColorPicker)}
                >
                  <Text style={styles.actionIcon}>🎨</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleDelete}
                >
                  <Text style={styles.actionIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Color picker */}
            {showColorPicker && (
              <View style={styles.colorPicker}>
                {CARD_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color.value}
                    style={[
                      styles.colorOption,
                      {
                        backgroundColor: color.value,
                        borderColor: color.border,
                        borderWidth: color.value === card.color ? 3 : 2,
                      },
                    ]}
                    onPress={() => handleColorChange(color.value)}
                  />
                ))}
              </View>
            )}
          </View>
        </motion.div>
      </div>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    minHeight: 140,
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dragHandle: {
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  dragIndicator: {
    width: 32,
    height: 4,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    borderRadius: 2,
  },
  input: {
    fontSize: 15,
    color: "#1f2937",
    minHeight: 60,
    paddingVertical: 4,
    outlineStyle: "none" as any,
    lineHeight: 22,
  },
  content: {
    fontSize: 15,
    color: "#1f2937",
    lineHeight: 22,
    minHeight: 44,
  },
  author: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 12,
    fontStyle: "italic",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.08)",
  },
  voteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  voteButtonActive: {
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#6366f1",
  },
  voteIcon: {
    fontSize: 18,
  },
  voteCount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6366f1",
  },
  voterTooltip: {
    position: "absolute",
    bottom: 40,
    left: 0,
    backgroundColor: "#111827",
    padding: 8,
    borderRadius: 6,
    minWidth: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1000,
  },
  voterName: {
    fontSize: 12,
    color: "#fff",
    marginBottom: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  actionIcon: {
    fontSize: 16,
  },
  colorPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
});
