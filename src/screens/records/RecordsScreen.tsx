import { useNavigation } from "@react-navigation/native";
import { Body, MenuItem, Panel, Screen } from "../../ui/components";

export default function RecordsScreen() {
  const nav = useNavigation();
  return (
    <Screen>
      <Body muted>Your health records and your family's, kept private. Every view is logged.</Body>
      <Panel>
        <MenuItem icon="reader-outline" title="Medical summary" subtitle="Everything at a glance" onPress={() => nav.navigate("MedicalHistory")} />
        <MenuItem icon="pulse-outline" title="Conditions" subtitle="Diagnoses, active and resolved" onPress={() => nav.navigate("MedicalList", { kind: "conditions" })} />
        <MenuItem icon="warning-outline" tone="amber" title="Allergies" subtitle="Food, drug, environment" onPress={() => nav.navigate("MedicalList", { kind: "allergies" })} />
        <MenuItem icon="medkit-outline" tone="green" title="Medications" subtitle="Current and past" onPress={() => nav.navigate("MedicalList", { kind: "medications" })} />
        <MenuItem icon="heart-outline" tone="red" title="Vitals" subtitle="BP, sugar, SpO₂, weight…" onPress={() => nav.navigate("MedicalList", { kind: "vitals" })} />
        <MenuItem icon="business-outline" tone="violet" title="Provider records" subtitle="Shared by hospitals and doctors" onPress={() => nav.navigate("HealthRecords")} last />
      </Panel>
    </Screen>
  );
}
