import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DocumentPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token");

  if (!token) {
    redirect("/login");
  }
  return <p>test</p>;
}
