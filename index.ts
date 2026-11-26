import { registerRootComponent } from "expo";
// Defines the background location task before anything else, so it also works when
// Android starts the app in the background only to deliver locations.
import "./src/features/emergency/patientTracking";
import App from "./App";

registerRootComponent(App);
