import { createContext, useContext } from "react";
import type { PortalUser } from "@/lib/api/portal/auth";

const PortalUserContext = createContext<PortalUser | null>(null);

export const PortalUserProvider = PortalUserContext.Provider;

/** The signed-in patient. Only valid under the /portal layout (outside login). */
export function usePortalUser(): PortalUser {
  const user = useContext(PortalUserContext);
  if (!user)
    throw new Error("usePortalUser must be used inside the portal layout");
  return user;
}
