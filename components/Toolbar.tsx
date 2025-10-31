import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import useRetroStore from "../store/useRetroStore";
import { DEFAULT_COLOR, CARD_COLORS } from "../utils/colors";
import { SessionEncryption, encryptCardData } from "../utils/encryption";
import { useUserName } from "../hooks/useUser";
import Toast from "./Toast";

interface ToolbarProps {
  sessionCode: string;
  encryption: SessionEncryption;
}

export default function Toolbar({ sessionCode, encryption }: ToolbarProps) {
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardContent, setCardContent] = useState("");
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR.value);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const { width } = useWindowDimensions();

  const sessionId = useRetroStore((state) => state.sessionId);
  const userName = useRetroStore((state) => state.userName);
  const presence = useRetroStore((state) => state.presence);
  const isHost = useRetroStore((state) => state.isHost);
  const initialize = useRetroStore((state) => state.initialize);
  const { setUserName: persistUserName } = useUserName();

  // Determine if we should use compact layout (for smaller screens)
  const isCompact = width < 768;

  const createCardMutation = useMutation(api.cards.createCard);
  const session = useQuery(api.sessions.getSessionByCode, { code: sessionCode });

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  const handleRename = () => {
    if (!newUserName.trim()) return;

    // Update in store and localStorage
    initialize(sessionId, useRetroStore.getState().sessionCode, isHost, newUserName.trim());
    persistUserName(newUserName.trim());

    setShowRenameModal(false);
    setNewUserName("");
    showToast("Name updated!");
  };

  const handleAddCard = async () => {
    if (!cardContent.trim() || !sessionId || !userName) {
      console.error("Cannot add card:", { hasContent: !!cardContent.trim(), sessionId, userName });
      return;
    }

    console.log("Adding card:", cardContent.trim(), "by", userName);

    const encryptedData = encryptCardData(
      cardContent.trim(),
      selectedColor,
      null,
      encryption
    );

    console.log("Encrypted data:", encryptedData.substring(0, 20) + "...");

    // Place card in top-right corner (visible but out of way)
    const x = window.innerWidth - 350;
    const y = 100;

    try {
      await createCardMutation({
        sessionId,
        encryptedData,
        position: { x, y },
        authorName: userName,
      });
      console.log("Card added successfully");

      setCardContent("");
      setSelectedColor(DEFAULT_COLOR.value);
      setShowAddCard(false);
    } catch (error) {
      console.error("Failed to add card:", error);
      alert("Failed to create card. Please try again.");
    }
  };

  const copySessionLink = () => {
    if (Platform.OS === "web") {
      const link = `${window.location.origin}/team-retro/session/${sessionCode}`;
      navigator.clipboard.writeText(link);
      showToast("📋 Session link copied!");
    }
  };

  const copyHostLink = () => {
    if (Platform.OS === "web" && session?.hostToken) {
      const link = `${window.location.origin}/team-retro/session/${sessionCode}?h=${session.hostToken}`;
      navigator.clipboard.writeText(link);
      showToast("🔑 Host link copied!");
    }
  };

  // Get session data to find host
  const sessionHostName = session?.hostName;

  // Super compact for very small screens
  const isMobile = width < 480;

  return (
    <>
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />

      <View style={[styles.toolbar, isCompact && styles.toolbarCompact, isMobile && styles.toolbarMobile]}>
        {/* Row 1: Session info and user info */}
        <View style={[styles.topRow, isMobile && styles.topRowMobile]}>
          <View style={[styles.sessionInfo, isCompact && styles.sessionInfoCompact]}>
            <Text style={[styles.sessionCode, isMobile && styles.sessionCodeMobile]}>
              {sessionCode}
            </Text>
            <TouchableOpacity style={styles.copyButton} onPress={copySessionLink}>
              <Text style={styles.copyButtonText}>📋</Text>
            </TouchableOpacity>
            {isHost && (
              <TouchableOpacity style={[styles.hostLinkButton, isMobile && styles.hostLinkButtonMobile]} onPress={copyHostLink}>
                <Text style={styles.hostLinkButtonText}>🔑</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.userSection, isMobile && styles.userSectionMobile]}>
            <TouchableOpacity
              style={[styles.userNameButton, isMobile && styles.userNameButtonMobile]}
              onPress={() => {
                setNewUserName(userName || "");
                setShowRenameModal(true);
              }}
            >
              <Text style={[styles.userName, isMobile && styles.userNameMobile]} numberOfLines={1}>
                {userName}
              </Text>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>

            {isHost && !isMobile && (
              <View style={styles.hostBadge}>
                <Text style={styles.hostBadgeText}>👑 Host</Text>
              </View>
            )}
          </View>
        </View>

        {/* Row 2: Actions and presence */}
        <View style={[styles.bottomRow, isMobile && styles.bottomRowMobile]}>
          <TouchableOpacity
            style={[styles.addButton, isMobile && styles.addButtonMobile]}
            onPress={() => setShowAddCard(true)}
          >
            <Text style={styles.addButtonText}>{isMobile ? "➕" : "➕ Add Card"}</Text>
          </TouchableOpacity>

          {/* Presence indicators with crown for host */}
          {!isMobile && (
            <View style={styles.presenceContainer}>
              <Text style={styles.presenceLabel}>Online:</Text>
              <View style={styles.presenceAvatars}>
                {presence.map((p) => {
                  const isHostUser = p.userName === sessionHostName;
                  return (
                    <div key={p._id} title={p.userName} style={{ position: 'relative' }}>
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
                      {isHostUser && (
                        <View style={styles.crownBadge}>
                          <Text style={styles.crownIcon}>👑</Text>
                        </View>
                      )}
                    </div>
                  );
                })}
              </View>
              <Text style={styles.presenceCount}>({presence.length})</Text>
            </View>
          )}

          {/* Mobile: Show compact presence */}
          {isMobile && presence.length > 0 && (
            <View style={styles.presenceContainerMobile}>
              <View style={styles.presenceAvatars}>
                {presence.slice(0, 3).map((p) => {
                  const isHostUser = p.userName === sessionHostName;
                  return (
                    <div key={p._id} title={p.userName} style={{ position: 'relative' }}>
                      <View
                        style={[
                          styles.presenceAvatarMobile,
                          { backgroundColor: p.color },
                        ]}
                      >
                        <Text style={styles.presenceInitialMobile}>
                          {p.userName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      {isHostUser && (
                        <View style={styles.crownBadgeMobile}>
                          <Text style={styles.crownIconMobile}>👑</Text>
                        </View>
                      )}
                    </div>
                  );
                })}
              </View>
              <Text style={styles.presenceCountMobile}>
                {presence.length > 3 ? `+${presence.length - 3}` : `${presence.length}`}
              </Text>
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

      {/* Rename Modal */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Your Name</Text>

            <Text style={styles.label}>New Name</Text>
            <TextInput
              style={styles.modalInput}
              value={newUserName}
              onChangeText={setNewUserName}
              placeholder="Enter your name"
              placeholderTextColor="#9ca3af"
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowRenameModal(false);
                  setNewUserName("");
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleRename}
                disabled={!newUserName.trim()}
              >
                <Text style={styles.modalButtonTextPrimary}>Update</Text>
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
    flexDirection: "column",
    gap: 12,
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
  toolbarCompact: {
    padding: 12,
    gap: 10,
  },
  toolbarMobile: {
    padding: 10,
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  topRowMobile: {
    gap: 8,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  bottomRowMobile: {
    gap: 8,
    justifyContent: "center",
  },
  sessionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionInfoCompact: {
    gap: 6,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userSectionMobile: {
    gap: 4,
    flex: 1,
    justifyContent: "flex-end",
  },
  sessionCode: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: 1,
  },
  sessionCodeMobile: {
    fontSize: 13,
    letterSpacing: 0.5,
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
  hostLinkButtonMobile: {
    paddingHorizontal: 8,
    paddingVertical: 5,
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
  crownBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#fef3c7",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  crownIcon: {
    fontSize: 10,
  },
  userNameButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  userNameButtonMobile: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
    maxWidth: 140,
  },
  userName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  userNameMobile: {
    fontSize: 12,
  },
  editIcon: {
    fontSize: 12,
    opacity: 0.7,
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
  addButtonMobile: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  presenceContainerMobile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  presenceAvatarMobile: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  presenceInitialMobile: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  presenceCountMobile: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "600",
  },
  crownBadgeMobile: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  crownIconMobile: {
    fontSize: 8,
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
