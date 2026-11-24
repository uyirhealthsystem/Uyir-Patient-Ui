import { useState } from "react";
import { usersApi } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthContext";
import { dateOnly } from "../../lib/format";
import { useAction, useLoad } from "../../lib/hooks";
import { Body, Button, Card, ErrorBox, H2, KV, Loading, Notice, Screen } from "../../ui/components";
import { Chips, OtpField } from "../../ui/form";
import { PhoneField, SecretField, TextField } from "../../ui/pickers";

type Step = "intro" | "aadhaar" | "aadhaarOtp" | "mobileOtp" | "address" | "done";

export default function AbhaScreen() {
  const { me } = useAuth();
  const links = useLoad(() => usersApi.abha.links(), []);
  const self = links.data?.find((l) => !l.subject || l.subject === "self");
  const [step, setStep] = useState<Step>("intro");
  const [consent, setConsent] = useState<{ version: string; text: string } | null>(null);
  const [aadhaar, setAadhaar] = useState("");
  const [otp, setOtp] = useState("");
  const [mobile, setMobile] = useState((me?.profile.phone ?? "").replace(/\D/g, "").slice(-10));
  const [suggestions, setSuggestions] = useState<{ list: string[]; suffix: string } | null>(null);
  const [address, setAddress] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const act = useAction();

  const afterCreate = async (next: "MOBILE_VERIFY" | "ABHA_ADDRESS" | "DONE") => {
    setOtp("");
    if (next === "MOBILE_VERIFY") {
      await usersApi.abha.sendMobileOtp();
      setInfo(`We sent an OTP to ${mobile}.`);
      setStep("mobileOtp");
    } else if (next === "ABHA_ADDRESS") {
      const s = await usersApi.abha.addressSuggestions();
      setSuggestions({ list: s.suggestions, suffix: s.suffix });
      setStep("address");
    } else {
      setStep("done");
      links.reload();
    }
  };

  const start = () =>
    act.run(async () => {
      await usersApi.abha.grantSharingConsent();
      setConsent(await usersApi.abha.consentText());
      setStep("aadhaar");
    });

  const sendAadhaarOtp = () =>
    act.run(async () => {
      if (!/^\d{12}$/.test(aadhaar)) throw new Error("Enter your 12-digit Aadhaar number.");
      const r = await usersApi.abha.sendAadhaarOtp(aadhaar, consent!.version);
      setInfo(r.message);
      setStep("aadhaarOtp");
    });

  const verifyAadhaar = () =>
    act.run(async () => {
      if (!/^\d{6}$/.test(otp)) throw new Error("Enter the 6-digit OTP.");
      if (!/^\d{10}$/.test(mobile.replace(/\D/g, "").slice(-10))) throw new Error("Enter your 10-digit mobile number.");
      const r = await usersApi.abha.verifyAadhaarOtp(otp, mobile.replace(/\D/g, "").slice(-10));
      await afterCreate(r.next);
    });

  const verifyMobile = () =>
    act.run(async () => {
      if (!/^\d{6}$/.test(otp)) throw new Error("Enter the 6-digit OTP.");
      const r = await usersApi.abha.verifyMobileOtp(otp);
      await afterCreate(r.next);
    });

  const chooseAddress = () =>
    act.run(async () => {
      if (!/^(?=.{8,18}$)[a-zA-Z0-9]+(?:[._][a-zA-Z0-9]+)?$/.test(address)) {
        throw new Error("8-18 letters or digits, with at most one '.' or '_' in the middle.");
      }
      await usersApi.abha.chooseAddress(address);
      await afterCreate("DONE");
    });

  const cancel = () =>
    act.run(async () => {
      await usersApi.abha.cancelCreation().catch(() => undefined);
      setStep("intro");
      setOtp("");
      setInfo(null);
    });

  if (links.loading) return <Loading />;

  if (self && step !== "address") {
    return (
      <Screen>
        <Notice tone="green">Your ABHA is linked.</Notice>
        <Card>
          <KV k="ABHA number" v={self.abhaNumber ?? undefined} />
          <KV k="ABHA address" v={self.abhaAddress ?? undefined} />
          <KV k="Verified" v={self.verifiedAt ? dateOnly(self.verifiedAt) : undefined} />
        </Card>
        <Body muted>Hospitals connected to ABDM can now share records with you; they appear under Health records › Provider records.</Body>
      </Screen>
    );
  }

  return (
    <Screen>
      {links.error ? <ErrorBox message={links.error} onRetry={links.refresh} /> : null}
      {info && step !== "intro" ? <Notice>{info}</Notice> : null}

      {step === "intro" ? (
        <>
          <H2>Create your ABHA</H2>
          <Body>
            ABHA is your free national health ID. With it, hospitals and labs across India can share your records with you securely. You'll
            need your Aadhaar number and the mobile linked to it.
          </Body>
          <Button title="Create ABHA with Aadhaar" onPress={start} loading={act.busy} />
        </>
      ) : null}

      {step === "aadhaar" && consent ? (
        <>
          <Card>
            <H2>Aadhaar consent</H2>
            <Body muted>{consent.text}</Body>
          </Card>
          <SecretField
            label="Aadhaar number"
            icon="card-outline"
            value={aadhaar.replace(/(\d{4})(?=\d)/g, "$1 ")}
            onChangeText={(t) => setAadhaar(t.replace(/\D/g, "").slice(0, 12))}
            keyboardType="number-pad"
            maxLength={14}
            placeholder="1234 5678 9012"
            hint={`${aadhaar.length}/12 digits`}
          />
          <Button title="I agree — send OTP" icon="send-outline" onPress={sendAadhaarOtp} loading={act.busy} disabled={aadhaar.length !== 12} />
        </>
      ) : null}

      {step === "aadhaarOtp" ? (
        <>
          <OtpField label="OTP sent to your Aadhaar-linked mobile" value={otp} onChange={setOtp} />
          <PhoneField label="Mobile number for your ABHA" value={mobile} onChange={setMobile} />
          <Button title="Verify and create ABHA" onPress={verifyAadhaar} loading={act.busy} />
        </>
      ) : null}

      {step === "mobileOtp" ? (
        <>
          <OtpField label="Mobile OTP" value={otp} onChange={setOtp} />
          <Button title="Verify mobile" onPress={verifyMobile} loading={act.busy} />
          <Button title="Resend OTP" variant="ghost" onPress={() => act.run(() => usersApi.abha.sendMobileOtp())} />
        </>
      ) : null}

      {step === "address" && suggestions ? (
        <>
          <H2>Choose your ABHA address</H2>
          <Body muted>Like an email for your health records, ending in {suggestions.suffix}.</Body>
          {suggestions.list.length ? <Chips label="Tap a suggestion" options={suggestions.list.map((x) => ({ value: x, label: x }))} value={address} onChange={(v) => setAddress(v ?? "")} /> : null}
          <TextField label="Or type your own" icon="at-outline" value={address} onChangeText={(t) => setAddress(t.trim())} autoCapitalize="none" autoCorrect={false} suffix={suggestions.suffix} hint="8-18 letters or digits; one '.' or '_' allowed in the middle." />
          <Button title="Use this address" onPress={chooseAddress} loading={act.busy} />
        </>
      ) : null}

      {step === "done" ? <Notice tone="green">Your ABHA is ready and linked.</Notice> : null}

      {act.error ? <ErrorBox message={act.error} /> : null}
      {["aadhaar", "aadhaarOtp", "mobileOtp"].includes(step) ? <Button title="Cancel" variant="ghost" onPress={cancel} /> : null}
    </Screen>
  );
}
