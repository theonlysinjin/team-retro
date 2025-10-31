import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import useRetroStore from "../../store/useRetroStore";
import { useSessionData, usePresenceHeartbeat } from "../../hooks/useSession";
import { useUserName } from "../../hooks/useUser";
import Board from "../../components/Board";
import Toolbar from "../../components/Toolbar";

export default function Session() {
  const { id, h } = useLocalSearchParams<{ id: string; h?: string }>();
  const router = useRouter();

  const { userName: storedUserName, setUserName } = useUserName();
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState(storedUserName || "");
  const [isHostByToken, setIsHostByToken] = useState(false);

  const sessionId = useRetroStore((state) => state.sessionId);
  const sessionCode = useRetroStore((state) => state.sessionCode);
  const userName = useRetroStore((state) => state.userName);
  const initialize = useRetroStore((state) => state.initialize);

  const joinSessionMutation = useMutation(api.sessions.joinSession);

  // Sync nameInput with stored name when it loads from localStorage
  useEffect(() => {
    if (storedUserName && !nameInput) {
      setNameInput(storedUserName);
    }
  }, [storedUserName]);

  // Get session by code
  const sessionByCode = useQuery(
    api.sessions.getSessionByCode,
    id ? { code: id.toUpperCase() } : "skip"
  );

  // Get session by host token (if h param exists)
  const sessionByToken = useQuery(
    api.sessions.getSessionByHostToken,
    h ? { hostToken: h } : "skip"
  );

  // Determine which session to use
  const session = sessionByToken || sessionByCode;

  // Check if user is host via token
  useEffect(() => {
    if (sessionByToken && h) {
      setIsHostByToken(true);
      // Always prompt for name if host
      if (!userName) {
        setShowNameModal(true);
      }
    } else if (!storedUserName && !userName) {
      setShowNameModal(true);
    }
  }, [sessionByToken, h, storedUserName, userName]);

  // Initialize if we have all the data
  useEffect(() => {
    if (session && !sessionId && userName) {
      const isHost = isHostByToken || session.hostName === userName;
      initialize(session._id, session.code, isHost, userName);
    }
  }, [session, sessionId, userName, isHostByToken, initialize]);

  // Subscribe to session data (cards, votes, etc) with encryption
  const { encryption } = useSessionData(sessionId, sessionCode);

  // Send presence heartbeats
  usePresenceHeartbeat(sessionId, userName);

  const handleJoinSession = async () => {
    if (!nameInput.trim() || !session) return;

    setUserName(nameInput.trim());

    try {
      // Join the session in Convex
      await joinSessionMutation({
        sessionId: session._id,
        userName: nameInput.trim(),
      });

      // Initialize local state
      const isHost = isHostByToken;
      initialize(session._id, session.code, isHost, nameInput.trim());

      setShowNameModal(false);
    } catch (error) {
      console.error("Failed to join session:", error);
      alert("Failed to join session. Please try again.");
    }
  };

  // Show loading while fetching session
  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading session...</Text>
      </View>
    );
  }

  // Show name modal if user hasn't entered name
  if (showNameModal || !userName) {
    return (
      <Modal visible={true} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isHostByToken ? "🔑 Host Access" : "Join Retrospective"}
            </Text>
            <Text style={styles.modalSubtitle}>
              Session: <Text style={styles.sessionCode}>{session.code}</Text>
            </Text>
            {!isHostByToken && (
              <Text style={styles.modalSubtitle}>
                Hosted by: <Text style={styles.hostName}>{session.hostName}</Text>
              </Text>
            )}
            {isHostByToken && (
              <Text style={styles.hostBadge}>
                You have host privileges for this session
              </Text>
            )}

            <View style={styles.nameHeader}>
              <Text style={styles.label}>Your Name</Text>
              {storedUserName && nameInput === storedUserName && (
                <Text style={styles.welcomeBack}>Welcome back!</Text>
              )}
            </View>
            <TextInput
              style={styles.input}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder={storedUserName ? "Your name (editable)" : "Enter your name"}
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              autoFocus
              onSubmitEditing={handleJoinSession}
            />

            <TouchableOpacity
              style={[styles.button, !nameInput.trim() && styles.buttonDisabled]}
              onPress={handleJoinSession}
              disabled={!nameInput.trim()}
            >
              <Text style={styles.buttonText}>
                {isHostByToken ? "Start as Host" : "Join Session"}
              </Text>
            </TouchableOpacity>

            {!isHostByToken && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.push("/")}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  // Show loading while connecting
  if (!sessionId || !encryption) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Connecting...</Text>
      </View>
    );
  }

  // Show the board
  return (
    <View style={styles.container}>
      <Toolbar sessionCode={session.code} encryption={encryption} />
      <Board encryption={encryption} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
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
    padding: 32,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
    textAlign: "center",
  },
  sessionCode: {
    fontWeight: "700",
    color: "#6366f1",
    letterSpacing: 1,
  },
  hostName: {
    fontWeight: "600",
    color: "#111827",
  },
  hostBadge: {
    fontSize: 13,
    color: "#92400e",
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 8,
    fontWeight: "600",
  },
  nameHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  welcomeBack: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10b981",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 20,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#6366f1",
    alignItems: "center",
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: "#9ca3af",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    padding: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "600",
  },
});
