import { Sidebar } from "@/components/sidebar";
import { AuthProvider } from "@/components/auth-provider";
import { getCurrentUser } from "@/lib/auth/get-user";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <AuthProvider>
      <div className="h-full relative">
        <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900">
          <Sidebar />
        </div>
        <main className="md:pl-72">
          <div className="flex items-center p-4 border-b justify-end gap-x-4">
            <div className="flex items-center gap-x-2">
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold">
                {user.name?.charAt(0) || "U"}
              </div>
              <span className="text-sm font-medium">{user.name}</span>
            </div>
          </div>
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
