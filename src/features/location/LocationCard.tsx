import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { Button, Card, IconBox, Row } from "../../ui/components";
import { TextField } from "../../ui/pickers";
import { colors } from "../../ui/theme";
import { useCurrentLocation } from "./useCurrentLocation";

/**
 * Where the patient is: status, the address, and a way out of every failure
 * (retry, turn location on / open settings, or type the address).
 */
export function LocationCard({ label = "YOUR LOCATION", auto = true }: { label?: string; auto?: boolean }) {
  const loc = useCurrentLocation({ auto });
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const ok = !!loc.place;
  const code = loc.error?.code;

  return (
    <Card style={{ padding: 12, gap: 8, backgroundColor: ok ? colors.successSoft : loc.error ? colors.dangerSoft : colors.bg, borderColor: ok ? colors.success : loc.error ? colors.dangerLine : colors.border }}>
      <Row style={{ gap: 10 }}>
        <IconBox icon={ok ? "checkmark-circle" : loc.error ? "alert-circle" : "locate-outline"} tone={ok ? "green" : loc.error ? "red" : "primary"} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: colors.textMuted }}>
            {label}
            {ok && loc.source === "typed" ? " · TYPED" : ""}
            {ok && loc.locating ? " · UPDATING…" : ""}
          </Text>
          <Text style={{ fontSize: 14, color: colors.text }} numberOfLines={2}>
            {loc.place?.address ?? (loc.locating ? "Finding your location…" : loc.error ? "Not found yet" : "Not set yet")}
          </Text>
        </View>
      </Row>

      {loc.error ? <Text style={{ fontSize: 12.5, color: colors.danger }}>{loc.error.message}</Text> : null}

      <Row style={{ gap: 8, flexWrap: "wrap" }}>
        <View style={{ flex: 1, minWidth: 140 }}>
          <Button title={ok ? "Refresh location" : "Use my location"} icon="locate-outline" variant="outline" small onPress={loc.locate} loading={loc.locating} />
        </View>
        {code === "PERMISSION_BLOCKED" || code === "SERVICES_OFF" ? (
          <View style={{ flex: 1, minWidth: 140 }}>
            <Button title="Open settings" icon="settings-outline" variant="secondary" small onPress={() => Linking.openSettings()} />
          </View>
        ) : null}
        {!typing ? (
          <View style={{ flex: 1, minWidth: 140 }}>
            <Button title="Type address" icon="create-outline" variant="ghost" small onPress={() => setTyping(true)} />
          </View>
        ) : null}
      </Row>

      {typing ? (
        <View style={{ gap: 6 }}>
          <TextField
            label="Address"
            icon="pin-outline"
            value={text}
            onChangeText={setText}
            placeholder="House no., street, area, city"
            returnKeyType="search"
            onSubmitEditing={() => loc.setAddress(text)}
          />
          <Button title="Use this address" small onPress={() => loc.setAddress(text)} loading={loc.locating} disabled={text.trim().length < 5} />
        </View>
      ) : null}
    </Card>
  );
}
