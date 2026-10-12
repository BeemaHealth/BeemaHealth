import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "to"> & { to: string };

/**
 * Link for portal paths. Portal screens are owned by different files, so the
 * destination is a plain string instead of the generated route union.
 */
export function PortalLink({ to, ...rest }: Props) {
  return <Link to={to as "/"} {...rest} />;
}
