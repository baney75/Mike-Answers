import { useMemo } from "react";
import { useUser } from "@clerk/clerk-react";

import App from "./App";
import { ClerkAuthControls } from "./ClerkAuthControls";

export function AuthedApp() {
  const { user, isSignedIn } = useUser();

  const authState = useMemo(
    () => ({
      enabled: true,
      signedIn: Boolean(isSignedIn),
      displayName: user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Signed in",
      email: user?.primaryEmailAddress?.emailAddress ?? undefined,
      avatarUrl: user?.imageUrl,
      syncReady: false,
    }),
    [isSignedIn, user],
  );

  return <App authState={authState} accountControls={<ClerkAuthControls />} />;
}
