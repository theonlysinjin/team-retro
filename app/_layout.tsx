import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Platform } from "react-native";
import AppHeader from "../components/AppHeader";

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
        header: () => <AppHeader />,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="session/[id]" />
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
