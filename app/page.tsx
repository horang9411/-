import { redirect } from "next/navigation";

import { getCurrentEmployee } from "@/lib/auth/session";

export default async function Home() {
  const employee = await getCurrentEmployee();
  redirect(employee ? "/calendar" : "/login");
}
