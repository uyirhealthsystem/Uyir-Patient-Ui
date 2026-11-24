import { useCallback, useEffect, useState } from "react";
import { authApi } from "../api";
import { useAuth } from "../useAuth";
import { useAction } from "../../../lib/hooks";
import type { AuthScreen } from "../../../navigation/types";
import { Body, Button, ErrorBox, IconBox, Notice, Screen, Title } from "../../../ui/components";
import { OtpField } from "../../../ui/form";

export default function VerifyLoginScreen({ route }: AuthScreen<"VerifyLogin">) {
  const { verifyLogin } = useAuth();
  const [challenge, setChallenge] = useState(route.params.challenge);
  const [otp, setOtp] = useState("");
  const [now, setNow] = useState(Date.now());
  const [info, setInfo] = useState<string | null>(null);
  const verify = useAction();
  const resend = useAction();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const waitSec = Math.max(0, Math.ceil((new Date(challenge.resendAvailableAt).getTime() - now) / 1000));

  const { run: runVerify, setError: setVerifyError } = verify;
  const submit = useCallback(
    (code: string) => {
      if (code.length !== challenge.codeLength) return setVerifyError(`Enter the ${challenge.codeLength}-digit code.`);
      runVerify(() => verifyLogin(challenge.challengeId, code));
    },
    [challenge, runVerify, setVerifyError, verifyLogin],
  );

  const doResend = () =>
    resend.run(async () => {
      const c = await authApi.resendLogin(challenge.challengeId);
      setChallenge(c);
      setOtp("");
      setInfo(`A new code was sent to ${c.email}.`);
    });

  return (
    <Screen>
      <IconBox icon="mail-open-outline" size={56} />
      <Title>Check your email</Title>
      <Body muted>
        We sent a {challenge.codeLength}-digit sign-in code to {challenge.email}. It signs you in as soon as you type it.
      </Body>
      <OtpField
        length={challenge.codeLength}
        value={otp}
        onChange={(v) => {
          setOtp(v);
          verify.setError(null);
        }}
        onComplete={submit}
        error={verify.error ?? undefined}
      />
      {resend.error ? <ErrorBox message={resend.error} /> : null}
      {info ? <Notice tone="green">{info}</Notice> : null}
      <Button title="Verify and sign in" onPress={() => submit(otp)} loading={verify.busy} disabled={otp.length !== challenge.codeLength} />
      <Button
        title={waitSec > 0 ? `Resend code in ${waitSec}s` : "Resend code"}
        icon="refresh-outline"
        variant="ghost"
        onPress={doResend}
        disabled={waitSec > 0}
        loading={resend.busy}
      />
    </Screen>
  );
}
