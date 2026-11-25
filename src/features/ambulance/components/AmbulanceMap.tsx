// Live map of one ambulance ride: the ambulance, the pickup (the patient) and the drop (e.g. the hospital).
// Data comes from the polled /track snapshot; the map re-frames itself as the ambulance moves, unless the
// patient has panned it themselves.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, type LatLng } from "react-native-maps";
import { colors, font, radius } from "../../../ui/theme";
import type { AmbulanceTrack } from "../types";

const EDGE = { top: 60, right: 48, bottom: 60, left: 48 };

function Pin({ icon, color }: { icon: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View style={[s.pin, { backgroundColor: color }]}>
      <Ionicons name={icon} size={16} color={colors.white} />
    </View>
  );
}

export function AmbulanceMap({ track, height = 260 }: { track: AmbulanceTrack; height?: number }) {
  const { booking: b, location, eta } = track;
  const map = useRef<MapView>(null);
  const [follow, setFollow] = useState(true);

  const pickup: LatLng = { latitude: b.pickup.lat, longitude: b.pickup.lng };
  const drop: LatLng | null = b.drop ? { latitude: b.drop.lat, longitude: b.drop.lng } : null;
  const ambulance: LatLng | null = location ? { latitude: location.lat, longitude: location.lng } : null;
  const onBoard = b.status === "PICKED_UP";
  // Where the ambulance is heading now: the patient, then (once aboard) the drop.
  const target = onBoard ? drop : pickup;

  const points = useMemo(
    () => [ambulance, onBoard ? null : pickup, drop].filter((p): p is LatLng => !!p),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ambulance?.latitude, ambulance?.longitude, onBoard, b.pickup.lat, b.pickup.lng, b.drop?.lat, b.drop?.lng],
  );

  const frame = () => {
    if (points.length > 1) map.current?.fitToCoordinates(points, { edgePadding: EDGE, animated: true });
    else if (points.length === 1) map.current?.animateToRegion({ ...points[0], latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400);
  };
  useEffect(() => {
    if (follow) frame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, follow]);

  const updatedAgo = location ? Math.max(0, Math.round((Date.now() - new Date(location.at).getTime()) / 1000)) : null;

  return (
    <View style={[s.wrap, { height }]}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...(ambulance ?? pickup), latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        onMapReady={frame}
        onPanDrag={() => setFollow(false)}
        toolbarEnabled={false}
        showsCompass={false}
      >
        {!onBoard ? (
          <Marker coordinate={pickup} title="Pickup" description={b.pickup.address ?? undefined} anchor={{ x: 0.5, y: 0.5 }}>
            <Pin icon="person" color={colors.primary} />
          </Marker>
        ) : null}
        {drop ? (
          <Marker coordinate={drop} title="Destination" description={b.drop?.address ?? undefined} anchor={{ x: 0.5, y: 0.5 }}>
            <Pin icon="business" color={colors.success} />
          </Marker>
        ) : null}
        {ambulance ? (
          <Marker coordinate={ambulance} title={track.driver?.plateNumber ?? "Ambulance"} anchor={{ x: 0.5, y: 0.5 }} flat>
            <Pin icon="medkit" color={colors.danger} />
          </Marker>
        ) : null}
        {ambulance && target ? (
          <Polyline coordinates={[ambulance, target]} strokeColor={colors.danger} strokeWidth={3} lineDashPattern={[8, 6]} />
        ) : null}
      </MapView>

      <View style={s.chip} pointerEvents="none">
        <Ionicons name={ambulance ? "radio-outline" : "time-outline"} size={14} color={ambulance ? colors.danger : colors.textMuted} />
        <Text style={s.chipText}>
          {!ambulance
            ? "Waiting for the ambulance's location…"
            : eta
              ? `${eta.minutes} min · ${eta.distanceKm.toFixed(1)} km ${onBoard ? "to destination" : "away"}`
              : onBoard ? "On the way to the destination" : "Ambulance location"}
        </Text>
      </View>
      {updatedAgo != null && updatedAgo > 60 ? (
        <View style={[s.chip, s.stale]} pointerEvents="none">
          <Text style={[s.chipText, { color: colors.warning }]}>{`Last seen ${Math.round(updatedAgo / 60)} min ago`}</Text>
        </View>
      ) : null}
      {!follow ? (
        <Pressable style={s.recenter} onPress={() => setFollow(true)} accessibilityLabel="Re-center map">
          <Ionicons name="locate" size={20} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.graySoft },
  pin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  chip: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stale: { top: 46, backgroundColor: colors.warningSoft, borderColor: colors.warningSoft },
  chipText: { fontSize: font.sm, fontWeight: "700", color: colors.text },
  recenter: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
