import { useState } from "react";
import { authApi } from "../../api/endpoints";
import { useAction } from "../../lib/hooks";
import type { AuthScreen } from "../../navigation/types";
import { Body, Button, ErrorBox, IconBox, Notice, Screen, Title } from "../../ui/components";
import { OtpField } from "../../ui/form";
import { SecretField, TextField } from "../../ui/pickers";

export default function ForgotPasswordScreen({ navigation, route }: AuthScreen<"ForgotPassword">) {
  const [email, setEmail] = useState(route.params?.email ?? "");
  const [step, setStep] = useState<"request" | "reset" | "done">("request");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { busy, error, setError, run } = useAction();

  const request = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    run(async () => {
      await authApi.forgotPassword(email.trim());
      setOtp("");
      setStep("reset");
    });
  };

  const reset = () => {
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit code from the email.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    run(async () => {
      await authApi.resetPassword(email.trim(), otp, password);
      setStep("done");
    });
  };

  if (step === "done") {
    return (
      <Screen>
        <IconBox icon="checkmark-circle-outline" tone="green" size={56} />
        <Title>Password changed</Title>
        <Notice tone="green">Your password was reset and every device was signed out. Sign in with the new password.</Notice>
        <Button title="Back to sign in" onPress={() => navigation.navigate("Login")} />
      </Screen>
    );
  }

  const strong = password.length >= 8;
  return (
    <Screen>
      <IconBox icon="key-outline" size={56} />
      <Title>Reset password</Title>
      {step === "request" ? (
        <>
          <Body muted>Enter the email you signed up with. If an account exists, we'll email a 6-digit reset code.</Body>
          <TextField label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" returnKeyType="send" onSubmitEditing={request} />
          {error ? <ErrorBox message={error} /> : null}
          <Button title="Send reset code" icon="send-outline" onPress={request} loading={busy} />
        </>
      ) : (
        <>
          <Body muted>If {email.trim()} has an account, a code is on its way.</Body>
          <OtpField label="Reset code" value={otp} onChange={setOtp} />
          <SecretField label="New password" icon="lock-closed-outline" value={password} onChangeText={setPassword} autoComplete="new-password" hint={password ? (strong ? "✓ Long enough" : `${8 - password.length} more characters`) : "At least 8 characters"} />
          <SecretField label="Type it again" icon="lock-closed-outline" value={confirm} onChangeText={setConfirm} autoComplete="new-password" error={confirm && confirm !== password ? "Doesn't match yet" : undefined} onSubmitEditing={reset} />
          {error ? <ErrorBox message={error} /> : null}
          <Button title="Change password" icon="checkmark" onPress={reset} loading={busy} />
          <Button title="Send a new code" icon="refresh-outline" variant="ghost" onPress={request} />
        </>
      )}
    </Screen>
  );
}
