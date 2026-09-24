import { LandingAdminClientLazy } from "./landing-admin-client-lazy";

export const metadata = { title: "Landing" };

export const dynamic = "force-dynamic";

export default function LandingAdminPage() {
  return <LandingAdminClientLazy />;
}
