import { Stack } from "expo-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL || "");

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
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
    </ConvexProvider>
  );
}
