import { useEffect, useRef } from "react";
import { Linking } from "react-native";
import { labScanApi } from "../../api/endpoints";
import { dateTime, statusTone } from "../../lib/format";
import { useLoad } from "../../lib/hooks";
import type { AppScreen } from "../../navigation/types";
import { Badge, Body, Button, Card, ErrorBox, H2, KV, Loading, Notice, Row, Screen, Title, humanize } from "../../ui/components";

export default function SampleCollectorTrackingScreen({ route }: AppScreen<"SampleCollectorTracking">) {
  const { id } = route.params;
  const { data, error, loading, refreshing, refresh, reload } = useLoad(() => labScanApi.homeCollectionTracking(id), [id]);
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    if (!data || ["COMPLETED", "CANCELLED"].includes(data.status)) return;
    const timer = setInterval(() => void reloadRef.current(), 15_000);
    return () => clearInterval(timer);
  }, [data?.status]);

  if (loading) return <Loading />;
  if (error || !data) return <Screen><ErrorBox message={error ?? "Tracking is not available"} onRetry={refresh} /></Screen>;

  const collector = data.collector;
  const active = !["COMPLETED", "CANCELLED"].includes(data.status);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Title>Sample collector</Title>
      <Badge label={humanize(data.status)} tone={statusTone(data.status)} />
      {active ? <Notice tone="blue">Tracking refreshes automatically while collection is active.</Notice> : null}
      {collector ? (
        <Card>
          <H2>{collector.name}</H2>
          {collector.phone ? <Button title="Call collector" icon="call-outline" variant="secondary" onPress={() => void Linking.openURL(`tel:${collector.phone}`)} /> : null}
          {collector.location ? (
            <>
              <KV k="Location updated" v={dateTime(collector.location.updatedAt)} />
              <Body muted>{collector.location.latitude.toFixed(5)}, {collector.location.longitude.toFixed(5)}</Body>
              <Button
                title="Open location in Maps"
                icon="map-outline"
                variant="outline"
                onPress={() => void Linking.openURL(`https://maps.google.com/?q=${collector.location!.latitude},${collector.location!.longitude}`)}
              />
            </>
          ) : <Body muted>The collector has not shared a live location yet.</Body>}
        </Card>
      ) : (
        <Card>
          <H2>Waiting for collector assignment</H2>
          <Body muted>The lab will assign a collector and tracking will appear here.</Body>
        </Card>
      )}
      <Card>
        <H2>Collection updates</H2>
        {data.trackingEvents.length ? data.trackingEvents.map((event) => (
          <Row key={event.trackingId} style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <Body>{humanize(event.status)}{event.notes ? ` · ${event.notes}` : ""}</Body>
            <Body muted>{dateTime(event.createdAt)}</Body>
          </Row>
        )) : <Body muted>No tracking updates yet.</Body>}
      </Card>
    </Screen>
  );
}
