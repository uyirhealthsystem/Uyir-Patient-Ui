import { LabScanDiscovery } from "./LabScanScreen";
import type { AppScreen } from "../../navigation/types";

export default function SampleCollectionScreen({ navigation }: AppScreen<"SampleCollection">) {
  return <LabScanDiscovery navigation={navigation} sampleCollectionOnly />;
}
