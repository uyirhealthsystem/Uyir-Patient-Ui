import { useCallback, useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import { labScanApi } from "../../api/endpoints";
import { errorMessage } from "../../api/client";
import type { PatientHomeCollectionTracking } from "../../api/types";
import { dateTime, statusTone } from "../../lib/format";
import type { AppScreen } from "../../navigation/types";
import { Badge, Body, Button, Card, ErrorBox, H2, KV, Loading, Notice, Row, Screen, Title, humanize } from "../../ui/components";

export default function SampleCollectorTrackingScreen({ route }: AppScreen<"SampleCollectorTracking">) {
  const { id } = route.params;
  const [data, setData] = useState<PatientHomeCollectionTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTracking = useCallback(
    async (isRefresh = false, silent = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else if (!silent) {
        setLoading(true);
      }
      if (!silent) setError(null);
      try {
        const res = await labScanApi.homeCollectionTracking(id);
        setData(res);
      } catch (e) {
        if (!silent) {
          setError(errorMessage(e));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    loadTracking(false, false);
  }, [loadTracking]);

  const refresh = () => loadTracking(true, false);
  const reload = () => loadTracking(false, true);

  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    if (!data || ["COMPLETED", "CANCELLED"].includes(data.status)) return;
    const timer = setInterval(() => void reloadRef.current(), 15_000);
    return () => clearInterval(timer);
  }, [data?.status]);

  if (loading) return <Loading />;
  if (error || !data) {
    return (
      <Screen>
        <ErrorBox message={error ?? "Tracking is not available"} onRetry={refresh} />
      </Screen>
    );
  }

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
          {collector.phone ? (
            <Button
              title="Call collector"
              icon="call-outline"
              variant="secondary"
              onPress={() => void Linking.openURL(`tel:${collector.phone}`)}
            />
          ) : null}
          {collector.location ? (
            <>
              <KV k="Location updated" v={dateTime(collector.location.updatedAt)} />
              <Body muted>
                {collector.location.latitude.toFixed(5)}, {collector.location.longitude.toFixed(5)}
              </Body>
              <Button
                title="Open location in Maps"
                icon="map-outline"
                variant="outline"
                onPress={() =>
                  void Linking.openURL(
                    `https://maps.google.com/?q=${collector.location!.latitude},${collector.location!.longitude}`,
                  )
                }
              />
            </>
          ) : (
            <Body muted>The collector has not shared a live location yet.</Body>
          )}
        </Card>
      ) : (
        <Card>
          <H2>Waiting for collector assignment</H2>
          <Body muted>The lab will assign a collector and tracking will appear here.</Body>
        </Card>
      )}
      <Card>
        <H2>Collection updates</H2>
        {data.trackingEvents.length ? (
          data.trackingEvents.map((event) => (
            <Row key={event.trackingId} style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <Body>
                {humanize(event.status)}
                {event.notes ? ` · ${event.notes}` : ""}
              </Body>
              <Body muted>{dateTime(event.createdAt)}</Body>
            </Row>
          ))
        ) : (
          <Body muted>No tracking updates yet.</Body>
        )}
      </Card>
    </Screen>
  );
}