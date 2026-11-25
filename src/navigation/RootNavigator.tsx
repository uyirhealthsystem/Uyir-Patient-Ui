import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../features/auth/useAuth";
import { Ionicons, Loading, type IconName } from "../ui/components";
import { colors } from "../ui/theme";
import type { AppStackParams, AuthStackParams, TabParams } from "./types";

import ForgotPasswordScreen from "../features/auth/screens/ForgotPasswordScreen";
import LoginScreen from "../features/auth/screens/LoginScreen";
import RegisterScreen from "../features/auth/screens/RegisterScreen";
import VerifyLoginScreen from "../features/auth/screens/VerifyLoginScreen";
import OnboardingScreen from "../features/onboarding/screens/OnboardingScreen";

import HomeScreen from "../features/home/screens/HomeScreen";
import BookingsScreen from "../features/bookings/screens/BookingsScreen";
import RecordsScreen from "../features/records/screens/RecordsScreen";
import ProfileScreen from "../features/profile/screens/ProfileScreen";

import BookAppointmentScreen from "../features/hospital/screens/BookAppointmentScreen";
import DoctorsScreen from "../features/hospital/screens/DoctorsScreen";
import EmergencySosScreen from "../features/emergency/screens/EmergencySosScreen";
import EmergencyStatusScreen from "../features/emergency/screens/EmergencyStatusScreen";
import HospitalDetailScreen from "../features/hospital/screens/HospitalDetailScreen";
import HospitalsScreen from "../features/hospital/screens/HospitalsScreen";

import AmbulanceBookScreen from "../features/ambulance/screens/AmbulanceBookScreen";
import AmbulanceDetailScreen from "../features/ambulance/screens/AmbulanceDetailScreen";

import HomeCareBookScreen from "../features/homecare/screens/HomeCareBookScreen";
import HomeCareDetailScreen from "../features/homecare/screens/HomeCareDetailScreen";
import HomeCareScreen from "../features/homecare/screens/HomeCareScreen";
import LabScanScreen from "../screens/labscan/LabScanScreen";
import SampleCollectionScreen from "../screens/labscan/SampleCollectionScreen";
import LabScanCatalogScreen from "../screens/labscan/LabScanCatalogScreen";
import LabScanBookingScreen from "../screens/labscan/LabScanBookingScreen";
import LabScanDetailScreen from "../screens/labscan/LabScanDetailScreen";
import LabScanResultsScreen from "../screens/labscan/LabScanResultsScreen";
import SampleCollectorTrackingScreen from "../screens/labscan/SampleCollectorTrackingScreen";

import HealthRecordDetailScreen from "../features/records/screens/HealthRecordDetailScreen";
import HealthRecordsScreen from "../features/records/screens/HealthRecordsScreen";
import MedicalHistoryScreen from "../features/records/screens/MedicalHistoryScreen";
import MedicalListScreen from "../features/records/screens/MedicalListScreen";

import AbhaScreen from "../features/profile/screens/AbhaScreen";
import EditProfileScreen from "../features/profile/screens/EditProfileScreen";
import FamilyMemberFormScreen from "../features/profile/screens/FamilyMemberFormScreen";
import FamilyScreen from "../features/profile/screens/FamilyScreen";

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const AppStack = createNativeStackNavigator<AppStackParams>();
const Tab = createBottomTabNavigator<TabParams>();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.bg, card: colors.card, border: colors.border, text: colors.text },
};
// Header like the service provider app's screens: white, bold ink title, dark chevron.
const header = {
  headerTintColor: colors.text,
  headerTitleStyle: { color: colors.text, fontWeight: "800", fontSize: 18 },
  headerStyle: { backgroundColor: colors.card },
  headerShadowVisible: true,
  headerBackButtonDisplayMode: "minimal",
  contentStyle: { backgroundColor: colors.bg },
} as const;

// Outline when inactive, filled when active - same as the provider app's tabs.
const TAB_ICONS: Record<keyof TabParams, [IconName, IconName]> = {
  Home: ["home-outline", "home"],
  Bookings: ["calendar-outline", "calendar"],
  Records: ["document-text-outline", "document-text"],
  Profile: ["person-circle-outline", "person-circle"],
};

function Tabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontWeight: "800", fontSize: 18 },
        headerStyle: { backgroundColor: colors.card },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#7B8798",
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 58 + insets.bottom,
          paddingBottom: 6 + insets.bottom,
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.card,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: "700" },
        tabBarIcon: ({ color, size, focused }) => <Ionicons name={TAB_ICONS[route.name][focused ? 1 : 0]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Home", headerShown: false }} />
      <Tab.Screen name="Bookings" component={BookingsScreen} options={{ title: "Bookings", headerTitle: "My bookings" }} />
      <Tab.Screen name="Records" component={RecordsScreen} options={{ title: "Records", headerTitle: "Health records" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { status } = useAuth();
  if (status === "booting") return <Loading label="Starting Uyir…" />;

  return (
    <NavigationContainer theme={theme}>
      {status === "signedOut" ? (
        <AuthStack.Navigator screenOptions={header}>
          <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: "Create account" }} />
          <AuthStack.Screen name="VerifyLogin" component={VerifyLoginScreen} options={{ title: "Verify sign-in" }} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: "Reset password" }} />
        </AuthStack.Navigator>
      ) : status === "onboarding" ? (
        <OnboardingScreen />
      ) : (
        <AppStack.Navigator screenOptions={header}>
          <AppStack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <AppStack.Screen name="Hospitals" component={HospitalsScreen} options={{ title: "Hospitals" }} />
          <AppStack.Screen name="HospitalDetail" component={HospitalDetailScreen} options={{ title: "Hospital" }} />
          <AppStack.Screen name="Doctors" component={DoctorsScreen} options={{ title: "Find a doctor" }} />
          <AppStack.Screen name="BookAppointment" component={BookAppointmentScreen} options={{ title: "Book appointment" }} />
          <AppStack.Screen name="EmergencySos" component={EmergencySosScreen} options={{ title: "Emergency SOS" }} />
          <AppStack.Screen name="EmergencyStatus" component={EmergencyStatusScreen} options={{ title: "Emergency" }} />
          <AppStack.Screen name="AmbulanceBook" component={AmbulanceBookScreen} options={{ title: "Book ambulance" }} />
          <AppStack.Screen name="AmbulanceDetail" component={AmbulanceDetailScreen} options={{ title: "Ambulance booking" }} />
          <AppStack.Screen name="HomeCare" component={HomeCareScreen} options={{ title: "Home care" }} />
          <AppStack.Screen name="HomeCareBook" component={HomeCareBookScreen} options={{ title: "Book home care" }} />
          <AppStack.Screen name="HomeCareDetail" component={HomeCareDetailScreen} options={{ title: "Home care booking" }} />
          <AppStack.Screen name="LabScan" component={LabScanScreen} options={{ title: "Lab & Scan" }} />
          <AppStack.Screen name="SampleCollection" component={SampleCollectionScreen} options={{ title: "Sample collection" }} />
          <AppStack.Screen name="LabScanCatalog" component={LabScanCatalogScreen} options={{ title: "Choose tests or scans" }} />
          <AppStack.Screen name="LabScanBooking" component={LabScanBookingScreen} options={{ title: "Book Lab & Scan" }} />
          <AppStack.Screen name="LabScanDetail" component={LabScanDetailScreen} options={{ title: "Lab & Scan booking" }} />
          <AppStack.Screen name="LabScanResults" component={LabScanResultsScreen} options={{ title: "Test results" }} />
          <AppStack.Screen name="SampleCollectorTracking" component={SampleCollectorTrackingScreen} options={{ title: "Sample collector" }} />
          <AppStack.Screen name="MedicalList" component={MedicalListScreen} />
          <AppStack.Screen name="HealthRecords" component={HealthRecordsScreen} options={{ title: "Provider records" }} />
          <AppStack.Screen name="HealthRecordDetail" component={HealthRecordDetailScreen} options={{ title: "Record" }} />
          <AppStack.Screen name="MedicalHistory" component={MedicalHistoryScreen} options={{ title: "Medical summary" }} />
          <AppStack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "Edit profile" }} />
          <AppStack.Screen name="Family" component={FamilyScreen} options={{ title: "Family members" }} />
          <AppStack.Screen name="FamilyMemberForm" component={FamilyMemberFormScreen} options={{ title: "Family member" }} />
          <AppStack.Screen name="Abha" component={AbhaScreen} options={{ title: "ABHA" }} />
        </AppStack.Navigator>
      )}
    </NavigationContainer>
  );
}
