import * as WebBrowser from "expo-web-browser";

/** Open a payment-provider checkout in an in-app browser; resolves when the user closes it. */
export async function openCheckout(url: string) {
  await WebBrowser.openBrowserAsync(url, { dismissButtonStyle: "done", showTitle: true });
}
