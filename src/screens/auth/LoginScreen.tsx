import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../auth/AuthContext";
import { useAction } from "../../lib/hooks";
import type { AuthScreen } from "../../navigation/types";
import { colors } from "../../ui/theme";
import { auth } from "./authStyles";
import { GoogleButton, OrDivider } from "./GoogleButton";
import { PasswordInput } from "./PasswordInput";

export default function LoginScreen({ navigation }: AuthScreen<"Login">) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, setError, run } = useAction();

  const submit = () => {
    if (!email.trim() || !password) return setError("Please enter email and password");
    run(async () => {
      const challenge = await login(email, password);
      if (challenge) navigation.navigate("VerifyLogin", { challenge });
    });
  };

  return (
    <SafeAreaView style={auth.page}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={auth.body} keyboardShouldPersistTaps="handled">
          <View style={auth.brandBox}>
            <Text style={auth.brand}>Uyir</Text>
            <Text style={auth.brandSub}>Patient</Text>
          </View>

          <Text style={auth.title}>Welcome back</Text>
          <Text style={auth.subtitle}>Sign in to book care and manage your family's health.</Text>

          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!busy}
            placeholderTextColor="#9CA3AF"
            selectionColor={colors.focus}
            style={[auth.input, { marginTop: 28 }]}
          />
          <PasswordInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            autoComplete="password"
            editable={!busy}
            returnKeyType="go"
            onSubmitEditing={submit}
            style={{ marginTop: 12 }}
          />

          {error ? <Text style={auth.error}>{error}</Text> : null}

          <Pressable onPress={() => navigation.navigate("ForgotPassword", { email: email.trim() })} disabled={busy} style={auth.linkRight}>
            <Text style={auth.link}>Forgot password?</Text>
          </Pressable>

          <Pressable onPress={submit} disabled={busy} style={[auth.primary, busy && { opacity: 0.6 }]}>
            <Text style={auth.primaryText}>{busy ? "Signing in..." : "Sign in"}</Text>
          </Pressable>

          <OrDivider />
          <GoogleButton />

          <Pressable onPress={() => navigation.navigate("Register")} disabled={busy} style={auth.footerLink}>
            <Text style={auth.footerText}>
              New to Uyir? <Text style={auth.footerStrong}>Create an account</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
