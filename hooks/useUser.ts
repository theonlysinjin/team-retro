import { useState, useEffect } from "react";
import { Platform } from "react-native";

const USER_NAME_KEY = "sprint_retro_user_name";

export function useUserName() {
  const [userName, setUserNameState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user name from storage on mount
    if (Platform.OS === "web") {
      const stored = localStorage.getItem(USER_NAME_KEY);
      setUserNameState(stored);
    }
    setLoading(false);
  }, []);

  const setUserName = (name: string) => {
    setUserNameState(name);
    if (Platform.OS === "web") {
      localStorage.setItem(USER_NAME_KEY, name);
    }
  };

  const clearUserName = () => {
    setUserNameState(null);
    if (Platform.OS === "web") {
      localStorage.removeItem(USER_NAME_KEY);
    }
  };

  return { userName, setUserName, clearUserName, loading };
}
