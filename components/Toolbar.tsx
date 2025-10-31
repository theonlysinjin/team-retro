import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Platform,
} from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import useRetroStore from "../store/useRetroStore";
import { DEFAULT_COLOR, CARD_COLORS } from "../utils/colors";
import { SessionEncryption, encryptCardData } from "../utils/encryption";

interface ToolbarProps {
  sessionCode: string;
  encryption: SessionEncryption;
}

export default function Toolbar({ sessionCode, encryption }: ToolbarProps) {
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardContent, setCardContent] = useState("");
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR.value);
  const [showHostLink, setShowHostLink] = useState(false);

  const sessionId = useRetroStore((state) => state.sessionId);
  const userName = useRetroStore((state) => state.userName);
  const presence = useRetroStore((state) => state.presence);
  const isHost = useRetroStore((state) => state.isHost);

  const createCardMutation = useMutation(api.cards.createCard);
  const session = useQuery(api.sessions.getSessionByCode, { code: sessionCode });

  const handleAddCard = async () => {
    if (!cardContent.trim() || !sessionId || !userName) return;

    const encryptedData = encryptCardData(
      cardContent.trim(),
      selectedColor,
      null,
      encryption
    );

    // Place card in top-right corner (visible but out of way)
    const x = window.innerWidth - 350;
    const y = 100;

    await createCardMutation({
      sessionId,
      encryptedData,
      position: { x, y },
      authorName: userName,
    });

    setCardContent("");
    setSelectedColor(DEFAULT_COLOR.value);
    setShowAddCard(false);
  };

  const copySessionLink = () => {
    if (Platform.OS === "web") {
      const link = `${window.location.origin}/team-retro/session/${sessionCode}`;
      navigator.clipboard.writeText(link);
      alert("Session link copied!");
    }
  };

  const copyHostLink = () => {
    if (Platform.OS === "web" && session?.hostToken) {
      const link = `${window.location.origin}/team-retro/session/${sessionCode}?h=${session.hostToken}`;
      navigator.clipboard.writeText(link);
      alert("🔑 Host link copied! Keep this private!");
    }
  };

  return (
    <>
      <View style={styles.toolbar}>
        <View style={styles.leftSection}>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionCode}>Code: {sessionCode}</Text>
            <TouchableOpacity style={styles.copyButton} onPress={copySessionLink}>
              <Text style={styles.copyButtonText}>📋 Copy Link</Text>
            </TouchableOpacity>
            {isHost && (
              <TouchableOpacity style={styles.hostLinkButton} onPress={copyHostLink}>
                <Text style={styles.hostLinkButtonText}>🔑 Host Link</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Presence indicators */}
          <View style={styles.presenceContainer}>
            <Text style={styles.presenceLabel}>Online:</Text>
            <View style={styles.presenceAvatars}>
              {presence.map((p) => (
                <div key={p._id} title={p.userName}>
                  <View
                    style={[
                      styles.presenceAvatar,
                      { backgroundColor: p.color },
                    ]}
                  >
                    <Text style={styles.presenceInitial}>
                      {p.userName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                </div>
              ))}
            </View>
            <Text style={styles.presenceCount}>({presence.length})</Text>
          </View>
        </View>

        <View style={styles.centerSection}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddCard(true)}
          >
            <Text style={styles.addButtonText}>➕ Add Card</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rightSection}>
          {isHost && (
            <View style={styles.hostBadge}>
              <Text style={styles.hostBadgeText}>👑 Host</Text>
            </View>
          )}
        </View>
      </View>

      {/* Add Card Modal */}
      <Modal
        visible={showAddCard}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddCard(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Card</Text>

            <Text style={styles.label}>Card Content</Text>
            <TextInput
              style={styles.modalInput}
              value={cardContent}
              onChangeText={setCardContent}
              placeholder="What would you like to share?"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              autoFocus
            />

            <Text style={styles.label}>Card Color</Text>
            <View style={styles.colorPicker}>
              {CARD_COLORS.map((color) => (
                <TouchableOpacity
                  key={color.value}
                  style={[
                    styles.colorOption,
                    {
                      backgroundColor: color.value,
                      borderColor: color.border,
                      borderWidth: color.value === selectedColor ? 4 : 2,
                    },
                  ]}
                  onPress={() => setSelectedColor(color.value)}
                />
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowAddCard(false);
                  setCardContent("");
                  setSelectedColor(DEFAULT_COLOR.value);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleAddCard}
                disabled={!cardContent.trim()}
              >
                <Text style={styles.modalButtonTextPrimary}>Add Card</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  leftSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  centerSection: {
    alignItems: "center",
  },
  rightSection: {
    flex: 1,
    alignItems: "flex-end",
  },
  sessionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionCode: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: 1,
  },
  copyButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
  },
  copyButtonText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  hostLinkButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fef3c7",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
  hostLinkButtonText: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "700",
  },
  presenceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  presenceLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  presenceAvatars: {
    flexDirection: "row",
    gap: -8,
  },
  presenceAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  presenceInitial: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  presenceCount: {
    fontSize: 12,
    color: "#6b7280",
  },
  addButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#6366f1",
    borderRadius: 8,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  hostBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fef3c7",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
  hostBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400e",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  colorPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  modalButtonPrimary: {
    backgroundColor: "#6366f1",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
