import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { store } from "./src/app/store";
import { bootstrap } from "./src/features/auth/authThunks";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  // Restore the saved session once, on launch.
  useEffect(() => {
    void store.dispatch(bootstrap());
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
