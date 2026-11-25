import { useCallback, useEffect, useState } from "react";
import { labScanApi } from "../../api/endpoints";
import { errorMessage } from "../../api/client";
import type { LabScanReport } from "../../api/types";
import { shareReportFile } from "../../lib/reportFiles";
import { dateTime, statusTone } from "../../lib/format";
import { useAction } from "../../lib/hooks";
import type { AppScreen } from "../../navigation/types";
import { Badge, Body, Button, Card, Empty, ErrorBox, H2, Loading, Notice, Screen, humanize } from "../../ui/components";

export default function LabScanResultsScreen({ route }: AppScreen<"LabScanResults">) {
  const { id } = route.params;
  const [data, setData] = useState<LabScanReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const download = useAction();

  const loadReports = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const rows = await labScanApi.reports(id);
        setData(rows ?? []);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    loadReports(false);
  }, [loadReports]);

  const refresh = () => loadReports(true);

  if (loading) return <Loading />;
  if (error) return <Screen><ErrorBox message={error} onRetry={refresh} /></Screen>;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {data.length === 0 ? (
        <Empty
          title="No results yet"
          subtitle="The lab or scan center will publish reports here when ready."
          icon="hourglass-outline"
        />
      ) : null}
      {data.map((report) => (
        <Card key={report.reportId}>
          <H2>{report.appointmentTest?.labTest.testCatalog.name ?? "Report"}</H2>
          <Badge label={humanize(report.status)} tone={statusTone(report.status)} />
          {report.reportNotes ? <Body>{report.reportNotes}</Body> : <Body muted>No additional notes.</Body>}
          {report.uploadedAt ? <Body muted>Uploaded {dateTime(report.uploadedAt)}</Body> : null}
          {report.sentAt ? <Body muted>Shared {dateTime(report.sentAt)}</Body> : null}
          {(report.files ?? []).map((file) => (
            <Card key={file.reportFileId} style={{ marginTop: 4 }}>
              <H2>{file.fileName}</H2>
              <Body muted>
                {file.fileType ?? "Report file"}
                {file.fileSize ? ` · ${(file.fileSize / 1024).toFixed(0)} KB` : ""}
              </Body>
              <Button
                title="Open or share report"
                icon="download-outline"
                variant="secondary"
                loading={download.busy}
                onPress={() => download.run(() => shareReportFile(file.downloadPath, file.fileName, file.fileType))}
              />
              {download.error ? <ErrorBox message={download.error} /> : null}
            </Card>
          ))}
          {!(report.files?.length) ? <Notice>Report details are pending file upload.</Notice> : null}
        </Card>
      ))}
    </Screen>
  );
}