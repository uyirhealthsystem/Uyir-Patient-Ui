import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { bootOnce } from "./src/app/boot";
import { store } from "./src/app/store";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  // Restore the saved session once, on launch (shared with the background location task).
  useEffect(() => {
    void bootOnce();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </SafeAreaProvider>
    </Provider>
  );
}
