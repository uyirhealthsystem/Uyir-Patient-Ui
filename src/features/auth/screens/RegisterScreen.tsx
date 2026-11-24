import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput } from "react-native";
import { authApi } from "../api";
import { useAuth } from "../useAuth";
import { useAction } from "../../../lib/hooks";
import type { AuthScreen } from "../../../navigation/types";
import { colors } from "../../../ui/theme";
import { auth } from "../components/authStyles";
import { GoogleButton, OrDivider } from "../components/GoogleButton";
import { PasswordInput } from "../components/PasswordInput";

export default function RegisterScreen({ navigation }: AuthScreen<"Register">) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { busy, error, setError, run } = useAction();

  const submit = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    run(async () => {
      await authApi.register(email.trim(), password);
      // Patient accounts are active immediately - sign straight in.
      const challenge = await login(email, password);
      if (challenge) navigation.replace("VerifyLogin", { challenge });
    });
  };

  const input = (props: React.ComponentProps<typeof TextInput>, first = false) => (
    <TextInput
      placeholderTextColor="#9CA3AF"
      selectionColor={colors.focus}
      autoCapitalize="none"
      autoCorrect={false}
      editable={!busy}
      style={[auth.input, { marginTop: first ? 28 : 12 }]}
      {...props}
    />
  );

  return (
    <KeyboardAvoidingView style={auth.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[auth.body, { justifyContent: "flex-start" }]} keyboardShouldPersistTaps="handled">
        <Text style={auth.title}>Create your account</Text>
        <Text style={auth.subtitle}>Book doctors, call an ambulance, arrange home care and keep your family's records in one place.</Text>

        {input({ placeholder: "Email", value: email, onChangeText: setEmail, keyboardType: "email-address", autoComplete: "email" }, true)}
        <PasswordInput placeholder="Password (at least 8 characters)" value={password} onChangeText={setPassword} autoComplete="new-password" editable={!busy} style={{ marginTop: 12 }} />
        <PasswordInput placeholder="Confirm password" value={confirm} onChangeText={setConfirm} autoComplete="new-password" editable={!busy} onSubmitEditing={submit} style={{ marginTop: 12 }} />
        {confirm && confirm !== password ? <Text style={auth.error}>Passwords don't match yet.</Text> : null}

        {error ? <Text style={auth.error}>{error}</Text> : null}

        <Pressable onPress={submit} disabled={busy} style={[auth.primary, busy && { opacity: 0.6 }]}>
          <Text style={auth.primaryText}>{busy ? "Creating account..." : "Create account"}</Text>
        </Pressable>

        <OrDivider />
        <GoogleButton />

        <Pressable onPress={() => navigation.goBack()} disabled={busy} style={auth.footerLink}>
          <Text style={auth.footerText}>
            Already have an account? <Text style={auth.footerStrong}>Sign in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
