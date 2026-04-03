import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";

export default async function DocumentPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token");

  if (!token) {
    redirect("/login");
  }
  return (
    <>
      <PageHeader
        title="Documents"
        subtitle="Manage your files and view recently uploaded documents"
      />
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Your documents will appear here.
        </p>
      </div>
    </>
  );
}
