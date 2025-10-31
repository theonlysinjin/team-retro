import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Platform } from "react-native";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL || "");

function RootLayoutContent() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Handle 404.html redirect from GitHub Pages
    if (Platform.OS === "web" && segments.length === 0) {
      const redirect = sessionStorage.getItem('redirect');
      if (redirect) {
        sessionStorage.removeItem('redirect');
        // Remove /team-retro prefix if present
        const path = redirect.replace('/team-retro', '');
        if (path && path !== '/' && path.length > 0) {
          router.replace(path as any);
        }
      }
    }
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#6366f1",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Team Retro" }} />
      <Stack.Screen name="session/[id]" options={{ title: "Team Retro" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <RootLayoutContent />
    </ConvexProvider>
  );
}
