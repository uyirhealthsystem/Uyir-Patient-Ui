// Design tokens matched to the Uyir service provider app, so patients and
// providers see one product: brand blue #173FD1 (provider login/brand), the
// provider app's light blue-grey background, white bordered cards and its
// status colours.
import { Platform, type ViewStyle } from "react-native";

export const colors = {
  primary: "#173FD1",
  primaryDark: "#0F35A8",
  primarySoft: "#E8EEFF",
  focus: "#2563EB",

  danger: "#D1304A",
  dangerSoft: "#FDE8EC",
  dangerLine: "#F7C7D0",
  warning: "#B96A00",
  warningSoft: "#FFF3DC",
  success: "#0E9F6E",
  successSoft: "#E3F6EE",
  info: "#0B63CE",
  infoSoft: "#E8F1FC",
  violet: "#6D3FD6",
  violetSoft: "#F0EAFE",

  text: "#14233B",
  textMuted: "#66758B",
  placeholder: "#9AA6B7",
  gray: "#8795A8",
  graySoft: "#EEF1F5",
  border: "#E2E8F0",
  inputBorder: "#E1E5EC",
  inputBg: "#F8FAFD",
  bg: "#F4F7FB",
  card: "#FFFFFF",
  white: "#FFFFFF",
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };
export const font = { xs: 11.5, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26 };

export const shadow = Platform.select<ViewStyle>({
  ios: { shadowColor: "#0F2747", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 1.5 },
  default: {},
})!;
