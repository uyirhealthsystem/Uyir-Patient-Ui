// The auth state and actions screens use. State lives in the Redux store
// (authSlice); the actions dispatch the thunks in authThunks.
import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import type { Me } from "../profile/types";
import { meLoaded } from "./authSlice";
import * as thunks from "./authThunks";

export function useAuth() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);
  const me = useAppSelector((s) => s.auth.me);
  const accountEmail = useAppSelector((s) => s.auth.accountEmail);

  const actions = useMemo(
    () => ({
      login: (email: string, password: string) => dispatch(thunks.login({ email, password })).unwrap(),
      verifyLogin: (challengeId: string, otp: string) => dispatch(thunks.verifyLogin({ challengeId, otp })).unwrap(),
      loginWithGoogle: () => dispatch(thunks.loginWithGoogle()).unwrap(),
      logout: (everywhere?: boolean) => dispatch(thunks.logout(everywhere)).unwrap(),
      reloadMe: () => dispatch(thunks.reloadMe()).unwrap(),
      setMe: (m: Me) => {
        dispatch(meLoaded(m));
      },
    }),
    [dispatch],
  );

  return { status, me, accountEmail, ...actions };
}
