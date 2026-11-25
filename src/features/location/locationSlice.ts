// The patient's current place (where help should come), shared by every screen
// that needs it: emergency SOS, the emergency ambulance, ambulance booking.
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { geocode, getCurrentPosition, LocationError, reverseGeocode, type LocationErrorCode } from "../../lib/location";
import type { Place } from "../../services/types";

export type LocationStatus = "idle" | "locating" | "ready" | "error";

export interface LocationState {
  place: Place | null;
  /** "gps" = from the device; "typed" = the patient typed the address. */
  source: "gps" | "typed" | null;
  status: LocationStatus;
  error: { code: LocationErrorCode | "NOT_FOUND"; message: string } | null;
}

const initialState: LocationState = { place: null, source: null, status: "idle", error: null };

type Rejected = { code: LocationErrorCode | "NOT_FOUND"; message: string };

/** Reads the device location (and its address, best effort). */
export const locateMe = createAsyncThunk<Place, { force?: boolean } | void, { state: { location: LocationState }; rejectValue: Rejected }>(
  "location/locateMe",
  async (arg, { rejectWithValue }) => {
    try {
      const c = await getCurrentPosition({ maxAgeMs: arg && arg.force ? 0 : 60_000 });
      const address = await reverseGeocode(c);
      return { lat: c.latitude, lng: c.longitude, address: address ?? `${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}` };
    } catch (e) {
      if (e instanceof LocationError) return rejectWithValue({ code: e.code, message: e.message });
      return rejectWithValue({ code: "UNAVAILABLE", message: e instanceof Error ? e.message : "Location unavailable." });
    }
  },
  // One lookup at a time: several components may ask at once.
  { condition: (_arg, { getState }) => getState().location.status !== "locating" },
);

/** Uses an address the patient typed instead of the device location. */
export const setTypedAddress = createAsyncThunk<Place, string, { rejectValue: Rejected }>(
  "location/typed",
  async (address, { rejectWithValue }) => {
    const text = address.trim();
    const c = text.length >= 5 ? await geocode(text) : undefined;
    if (!c) return rejectWithValue({ code: "NOT_FOUND", message: "We couldn't find that address. Add the area and city, e.g. \"12 Anna Salai, T. Nagar, Chennai\"." });
    return { lat: c.latitude, lng: c.longitude, address: text };
  },
);

const locationSlice = createSlice({
  name: "location",
  initialState,
  reducers: {
    placeCleared: () => initialState,
    placeSet(state, { payload }: PayloadAction<Place>) {
      state.place = payload;
      state.source = "typed";
      state.status = "ready";
      state.error = null;
    },
  },
  extraReducers: (b) => {
    for (const thunk of [locateMe, setTypedAddress]) {
      b.addCase(thunk.pending, (state) => {
        state.status = "locating";
        state.error = null;
      });
      b.addCase(thunk.fulfilled, (state, { payload }) => {
        state.place = payload;
        state.source = thunk === locateMe ? "gps" : "typed";
        state.status = "ready";
      });
      b.addCase(thunk.rejected, (state, { payload, error }) => {
        // Keep an earlier place: a failed refresh shouldn't lose a good pickup.
        state.status = state.place ? "ready" : "error";
        state.error = payload ?? { code: "UNAVAILABLE", message: error.message ?? "Location unavailable." };
      });
    }
  },
});

export const { placeCleared, placeSet } = locationSlice.actions;
export const locationReducer = locationSlice.reducer;
