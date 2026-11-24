import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { Ionicons, Loading, type IconName } from "../ui/components";
import { colors } from "../ui/theme";
import type { AppStackParams, AuthStackParams, TabParams } from "./types";

import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import VerifyLoginScreen from "../screens/auth/VerifyLoginScreen";
import OnboardingScreen from "../screens/onboarding/OnboardingScreen";

import HomeScreen from "../screens/home/HomeScreen";
import BookingsScreen from "../screens/bookings/BookingsScreen";
import RecordsScreen from "../screens/records/RecordsScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";

import BookAppointmentScreen from "../screens/hospital/BookAppointmentScreen";
import DoctorsScreen from "../screens/hospital/DoctorsScreen";
import EmergencySosScreen from "../screens/hospital/EmergencySosScreen";
import HospitalDetailScreen from "../screens/hospital/HospitalDetailScreen";
import HospitalsScreen from "../screens/hospital/HospitalsScreen";

import AmbulanceBookScreen from "../screens/ambulance/AmbulanceBookScreen";
import AmbulanceDetailScreen from "../screens/ambulance/AmbulanceDetailScreen";

import HomeCareBookScreen from "../screens/homecare/HomeCareBookScreen";
import HomeCareDetailScreen from "../screens/homecare/HomeCareDetailScreen";
import HomeCareScreen from "../screens/homecare/HomeCareScreen";
import LabScanScreen from "../screens/labscan/LabScanScreen";
import SampleCollectionScreen from "../screens/labscan/SampleCollectionScreen";
import LabScanCatalogScreen from "../screens/labscan/LabScanCatalogScreen";
import LabScanBookingScreen from "../screens/labscan/LabScanBookingScreen";
import LabScanDetailScreen from "../screens/labscan/LabScanDetailScreen";
import LabScanResultsScreen from "../screens/labscan/LabScanResultsScreen";
import SampleCollectorTrackingScreen from "../screens/labscan/SampleCollectorTrackingScreen";

import HealthRecordDetailScreen from "../screens/records/HealthRecordDetailScreen";
import HealthRecordsScreen from "../screens/records/HealthRecordsScreen";
import MedicalHistoryScreen from "../screens/records/MedicalHistoryScreen";
import MedicalListScreen from "../screens/records/MedicalListScreen";

import AbhaScreen from "../screens/profile/AbhaScreen";
import EditProfileScreen from "../screens/profile/EditProfileScreen";
import FamilyMemberFormScreen from "../screens/profile/FamilyMemberFormScreen";
import FamilyScreen from "../screens/profile/FamilyScreen";

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
