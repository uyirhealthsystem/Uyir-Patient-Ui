import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { requestBinary } from "../api/client";

function toBase64(bytes: ArrayBuffer) {
  const data = new Uint8Array(bytes);
  let binary = "";
  for (let offset = 0; offset < data.length; offset += 0x8000) {
    binary += String.fromCharCode(...data.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export async function shareReportFile(downloadPath: string, fileName: string, fileType: string | null) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Report sharing is not available on this device.");
  }
  const directory = FileSystem.cacheDirectory;
  if (!directory) {
    throw new Error("A temporary file location is not available on this device.");
  }

  const { bytes, contentType } = await requestBinary(downloadPath);
  const safeName = fileName.replace(/[\\/:*?"<>|]/g, "_");
  const uri = `${directory}${Date.now()}-${safeName}`;
  await FileSystem.writeAsStringAsync(uri, toBase64(bytes), {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(uri, {
    dialogTitle: fileName,
    mimeType: fileType ?? contentType ?? "application/octet-stream",
  });
}
