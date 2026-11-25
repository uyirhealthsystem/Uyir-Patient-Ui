// What the patient chose during an SOS, kept while they move between screens.
// Server truth (booking status, the ambulance) comes from RTK Query; this only
// holds choices the server doesn't store.
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { EmergencyCondition } from "./types";

export interface EmergencyState {
  condition: EmergencyCondition | null;
  /** Hospitals that turned this emergency down: hidden when the patient picks another. */
  rejectedHospitalIds: string[];
  /** Emergency booking ids where the patient said they don't need an ambulance. */
  ambulanceDeclined: string[];
}

const initialState: EmergencyState = { condition: null, rejectedHospitalIds: [], ambulanceDeclined: [] };

const emergencySlice = createSlice({
  name: "emergency",
  initialState,
  reducers: {
    conditionChosen(state, { payload }: PayloadAction<EmergencyCondition>) {
      if (state.condition?.code !== payload.code) state.rejectedHospitalIds = [];
      state.condition = payload;
    },
    hospitalRejected(state, { payload }: PayloadAction<string>) {
      if (!state.rejectedHospitalIds.includes(payload)) state.rejectedHospitalIds.push(payload);
    },
    ambulanceDeclined(state, { payload }: PayloadAction<string>) {
      if (!state.ambulanceDeclined.includes(payload)) state.ambulanceDeclined.push(payload);
    },
    ambulanceWanted(state, { payload }: PayloadAction<string>) {
      state.ambulanceDeclined = state.ambulanceDeclined.filter((id) => id !== payload);
    },
    emergencyReset: () => initialState,
  },
});

export const { conditionChosen, hospitalRejected, ambulanceDeclined, ambulanceWanted, emergencyReset } = emergencySlice.actions;
export const emergencyReducer = emergencySlice.reducer;
