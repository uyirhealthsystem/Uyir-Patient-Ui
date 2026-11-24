// Where the refresh token survives app restarts.
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const REFRESH_KEY = "uyir.refreshToken";
// Fallback only: the email the user signed in with, for servers whose access
// token doesn't carry an `email` claim yet. The token's claim wins.
export const EMAIL_KEY = "uyir.accountEmail";

// SecureStore is native-only; on web (dev preview) fall back to memory.
const memory: Record<string, string> = {};
export const secureStore = {
  get: (k: string) => (Platform.OS === "web" ? Promise.resolve(memory[k] ?? null) : SecureStore.getItemAsync(k)),
  set: (k: string, v: string) => (Platform.OS === "web" ? Promise.resolve(void (memory[k] = v)) : SecureStore.setItemAsync(k, v)),
  del: (k: string) => (Platform.OS === "web" ? Promise.resolve(void delete memory[k]) : SecureStore.deleteItemAsync(k)),
};
