import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { useEraseAccountMutation } from "../api";
import { useAuth } from "../../auth/useAuth";
import { dateOnly } from "../../../lib/format";
import { useAction } from "../../../lib/hooks";
import { Avatar, Body, Button, Card, ErrorBox, H2, KV, MenuItem, Panel, Screen, humanize, styles } from "../../../ui/components";
import { colors } from "../../../ui/theme";

export default function ProfileScreen() {
  const nav = useNavigation();
  const { me, logout, reloadMe } = useAuth();
  const [erasing, setErasing] = useState(false);
  const [confirm, setConfirm] = useState("");
  const erase = useAction();
  const [eraseAccount] = useEraseAccountMutation();
  if (!me) return null;
  const p = me.profile;

  const doErase = () =>
    erase.run(async () => {
      await eraseAccount().unwrap();
      await logout(true);
    });

  return (
    <Screen onRefresh={reloadMe}>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar name={p.fullName} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{p.fullName}</Text>
          <Text style={{ fontSize: 12.5, color: colors.textMuted, marginTop: 2 }}>Patient ID {me.user.patientNumber}</Text>
        </View>
      </Card>

      <Panel title="Personal details" icon="person-outline">
        <KV k="Email" v={p.email} />
        <KV k="Mobile" v={p.phone} />
        <KV k="Date of birth" v={p.dateOfBirth ? `${dateOnly(p.dateOfBirth)}${p.age != null ? ` (${p.age} yrs)` : ""}` : undefined} />
        <KV k="Gender" v={p.gender ? humanize(p.gender) : undefined} />
        <KV k="Blood group" v={p.bloodGroup} />
        <KV k="Address" v={p.address} />
        <KV k="District" v={p.district} />
        <KV k="PIN code" v={p.pinCode} />
        <Button title="Edit profile" icon="create-outline" variant="secondary" small onPress={() => nav.navigate("EditProfile")} style={{ marginTop: 4 }} />
      </Panel>

      <Panel>
        <MenuItem icon="people-outline" title="Family members" subtitle="Book care and keep records for them" onPress={() => nav.navigate("Family")} />
        <MenuItem icon="id-card-outline" tone="violet" title="ABHA" subtitle="Ayushman Bharat Health Account" onPress={() => nav.navigate("Abha")} last />
      </Panel>

      <Panel>
        <MenuItem icon="log-out-outline" tone="gray" title="Sign out" onPress={() => logout()} />
        <MenuItem
          icon="phone-portrait-outline"
          tone="gray"
          title="Sign out of all devices"
          onPress={() =>
            Alert.alert("Sign out everywhere?", "Every phone and browser signed in to your account will be signed out.", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign out all", style: "destructive", onPress: () => logout(true) },
            ])
          }
        />
        <MenuItem icon="trash-outline" tone="red" title="Delete my data" subtitle="Permanently erase everything" onPress={() => setErasing(true)} last />
      </Panel>

      {erasing ? (
        <Card style={{ borderColor: colors.dangerLine }}>
          <H2>Delete my data</H2>
          <Body>This permanently erases your profile, family members and every health record stored with Uyir. It cannot be undone.</Body>
          <Body muted>Type DELETE to confirm.</Body>
          <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} autoCapitalize="characters" />
          {erase.error ? <ErrorBox message={erase.error} /> : null}
          <Button title="Erase everything" icon="trash-outline" variant="danger" disabled={confirm !== "DELETE"} loading={erase.busy} onPress={doErase} />
          <Button title="Cancel" variant="ghost" onPress={() => setErasing(false)} />
        </Card>
      ) : null}
    </Screen>
  );
}
