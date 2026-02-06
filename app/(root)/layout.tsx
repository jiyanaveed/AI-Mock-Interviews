import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { isAuthenticated, getCurrentUser, signOut } from "@/lib/actions/auth.action";
import { Button } from "@/components/ui/button";

const Layout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();
  if (!isUserAuthenticated) redirect("/sign-in");

  const user = await getCurrentUser();

  const handleSignOut = async () => {
    "use server";
    await signOut();
    redirect("/sign-in");
  };

  return (
    <div className="root-layout">
      <nav className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="MockMate Logo" width={38} height={32} />
          <h2 className="text-primary-100">PrepWise</h2>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-dark-300/50 border border-dark-400">
            <div className="flex flex-col items-end max-sm:hidden">
              <span className="text-white-100 font-medium text-sm">
                {user?.name}
              </span>
              <span className="text-white-200 text-xs">
                {user?.email}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-dark-100 font-semibold text-sm">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
          <form action={handleSignOut}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="hover:bg-red-500/10 hover:border-red-500 hover:text-red-500 transition-colors"
            >
              Sign Out
            </Button>
          </form>
        </div>
      </nav>

      {children}
    </div>
  );
};

export default Layout;