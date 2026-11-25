import type { NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { LoginChallenge } from "../features/auth/types";
import type { FamilyMember } from "../features/profile/types";
import type { MedicalKind } from "../features/records/api";

export type { MedicalKind };

export type AuthStackParams = {
  Login: undefined;
  Register: undefined;
  VerifyLogin: { challenge: LoginChallenge };
  ForgotPassword: { email?: string } | undefined;
};


export type AppStackParams = {
  Tabs: NavigatorScreenParams<TabParams> | undefined;
  // Hospitals & doctors
  Hospitals: undefined;
  HospitalDetail: { id: string };
  Doctors: { hospitalId?: string; hospitalName?: string; specialty?: string } | undefined;
  BookAppointment: { hospitalId: string; doctorId: string };
  // Emergency
  EmergencySos: undefined;
  EmergencyStatus: { bookingId: string; hospitalId: string };
  // Ambulance
  AmbulanceBook: { mode?: "EMERGENCY" | "SCHEDULED" } | undefined;
  AmbulanceDetail: { id: string };
  // Home-based care
  HomeCare: undefined;
  HomeCareBook: { serviceId: string };
  HomeCareDetail: { id: string };
  // Health records (userservice)
  MedicalList: { kind: MedicalKind };
  HealthRecords: undefined;
  HealthRecordDetail: { id: string };
  MedicalHistory: undefined;
  // Profile
  EditProfile: undefined;
  Family: undefined;
  FamilyMemberForm: { member?: FamilyMember } | undefined;
  Abha: undefined;
};

export type TabParams = {
  Home: undefined;
  Bookings: undefined;
  Records: undefined;
  Profile: undefined;
};

export type AuthScreen<K extends keyof AuthStackParams> = NativeStackScreenProps<AuthStackParams, K>;
export type AppScreen<K extends keyof AppStackParams> = NativeStackScreenProps<AppStackParams, K>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends AppStackParams {}
  }
}
