import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { locateMe, setTypedAddress } from "./locationSlice";

/**
 * The shared current place. With `auto`, looks the location up again every time
 * the screen opens, because the patient may have moved since the last screen. The
 * previous place stays visible ("Updating…") until the new one arrives. An
 * address the patient typed is kept as it is.
 */
export function useCurrentLocation({ auto = false } = {}) {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.location);

  useEffect(() => {
    if (auto && state.source !== "typed") void dispatch(locateMe({ force: true }));
    // Only on mount: a failure shows its own retry button rather than looping.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  const locate = useCallback(() => dispatch(locateMe({ force: true })), [dispatch]);
  const setAddress = useCallback((address: string) => dispatch(setTypedAddress(address)), [dispatch]);

  return { ...state, locating: state.status === "locating", locate, setAddress };
}
