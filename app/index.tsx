import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import useRetroStore from "../store/useRetroStore";
import { useUserName } from "../hooks/useUser";

export default function Home() {
  const router = useRouter();
  const { userName: storedUserName, setUserName } = useUserName();
  const [userName, setUserNameLocal] = useState(storedUserName || "");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const initialize = useRetroStore((state) => state.initialize);

  const createSessionMutation = useMutation(api.sessions.createSession);
  const joinSessionMutation = useMutation(api.sessions.joinSession);
  const getSessionByCode = useQuery(api.sessions.getSessionByCode,
    joinCode.length === 6 ? { code: joinCode.toUpperCase() } : "skip"
  );

  const handleCreateSession = async () => {
    if (!userName.trim()) {
      setError("Please enter your name");
      return;
    }

    setError("");
    setLoading(true);
    setUserName(userName);

    try {
      const result = await createSessionMutation({ hostName: userName });

      // Initialize store
      initialize(result.sessionId, result.code, true, userName);

      // Navigate to session with host token
      router.push(`/session/${result.code}?h=${result.hostToken}`);
    } catch (err) {
      console.error("Failed to create session:", err);
      setError("Failed to create session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async () => {
    if (!userName.trim()) {
      setError("Please enter your name");
      return;
    }

    if (!joinCode.trim() || joinCode.length !== 6) {
      setError("Please enter a valid 6-character session code");
      return;
    }

    if (!getSessionByCode) {
      setError("Session not found. Please check the code.");
      return;
    }

    setError("");
    setLoading(true);
    setUserName(userName);

    try {
      // Join the session
      await joinSessionMutation({
        sessionId: getSessionByCode._id,
        userName,
      });

      // Initialize store
      initialize(getSessionByCode._id, getSessionByCode.code, false, userName);

      // Navigate to session
      router.push(`/session/${getSessionByCode.code}`);
    } catch (err) {
      console.error("Failed to join session:", err);
      setError("Failed to join session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Team Retro</Text>
        <Text style={styles.subtitle}>
          Collaborate in real-time with your team
        </Text>
        <Text style={styles.securityNote}>
          🔒 End-to-end encrypted • Private • Secure
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            value={userName}
            onChangeText={setUserNameLocal}
            placeholder="Enter your name"
            placeholderTextColor="#9ca3af"
            autoCapitalize="words"
            editable={!loading}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Choose an option</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleCreateSession}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create New Session</Text>
            )}
          </TouchableOpacity>

          <View style={styles.joinSection}>
            <Text style={styles.label}>Join Existing Session</Text>
            <TextInput
              style={styles.input}
              value={joinCode}
              onChangeText={(text) => setJoinCode(text.toUpperCase())}
              placeholder="Enter 6-character code"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              maxLength={6}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleJoinSession}
              disabled={loading || joinCode.length !== 6}
            >
              {loading ? (
                <ActivityIndicator color="#6366f1" />
              ) : (
                <Text style={styles.secondaryButtonText}>Join Session</Text>
              )}
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.features}>
          <Text style={styles.featureTitle}>Features</Text>
          <Text style={styles.feature}>✓ Real-time collaboration via Convex</Text>
          <Text style={styles.feature}>✓ End-to-end encrypted content</Text>
          <Text style={styles.feature}>✓ See who's online with presence</Text>
          <Text style={styles.feature}>✓ Material Design interface</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  content: {
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 8,
    textAlign: "center",
  },
  securityNote: {
    fontSize: 14,
    color: "#10b981",
    marginBottom: 32,
    textAlign: "center",
    fontWeight: "600",
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#9ca3af",
    fontSize: 14,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: "#6366f1",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#6366f1",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#6366f1",
    fontSize: 16,
    fontWeight: "600",
  },
  joinSection: {
    marginTop: 16,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  features: {
    marginTop: 32,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  feature: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
});
