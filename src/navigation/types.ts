import type { NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type {
  FamilyMember,
  LabScanAppointmentMode,
  LabScanAppointmentType,
  LoginChallenge,
} from "../api/types";

export type AuthStackParams = {
  Login: undefined;
  Register: undefined;
  VerifyLogin: { challenge: LoginChallenge };
  ForgotPassword: { email?: string } | undefined;
};

export type MedicalKind = "conditions" | "allergies" | "medications" | "vitals";

export type AppStackParams = {
  Tabs: NavigatorScreenParams<TabParams> | undefined;
  // Hospitals & doctors
  Hospitals: undefined;
  HospitalDetail: { id: string };
  Doctors: { hospitalId?: string; hospitalName?: string; specialty?: string } | undefined;
  BookAppointment: { hospitalId: string; doctorId: string };
  // Emergency
  EmergencySos: undefined;
  // Ambulance
  AmbulanceBook: { mode?: "EMERGENCY" | "SCHEDULED" } | undefined;
  AmbulanceDetail: { id: string };
  // Home-based care
  HomeCare: undefined;
  HomeCareBook: { serviceId: string };
  HomeCareDetail: { id: string };
  // Lab & Scan / patient sample collection
  LabScan: undefined;
  SampleCollection: undefined;
  LabScanCatalog: { kind: LabScanAppointmentType; centerId: string; centerName: string; initialMode?: LabScanAppointmentMode };
  LabScanBooking: { kind: LabScanAppointmentType; centerId: string; centerName: string; itemIds: string[]; mode?: LabScanAppointmentMode };
  LabScanDetail: { id: string };
  LabScanResults: { id: string };
  SampleCollectorTracking: { id: string };
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
