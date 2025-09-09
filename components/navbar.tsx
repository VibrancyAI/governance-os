import { auth, signOut } from "@/app/(auth)/auth";
import Link from "next/link";
import { History } from "./history";

export const Navbar = async () => {
  let session = await auth();

  return (
    <div className="bg-white/80 backdrop-blur-sm absolute top-0 left-0 w-dvw border-b border-zinc-200 py-2.5 px-4 justify-between flex flex-row items-center z-30 shadow-soft">
      <div className="flex flex-row gap-3 items-center">
        <History />
        <div className="text-sm text-zinc-700 font-medium">
        Governance OS
        </div>
      </div>

      {session ? (
        <div className="group py-1.5 px-2.5 rounded-md hover:bg-zinc-100 cursor-pointer relative border border-transparent hover:border-zinc-200 transition-colors">
          <div className="text-sm text-zinc-600 z-10">
            {session.user?.email}
          </div>
          <div className="flex-col absolute top-6 right-0 w-full pt-5 group-hover:flex hidden">
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button
                type="submit"
                className="text-sm w-full p-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : (
        <Link
          href="login"
          className="text-sm py-1.5 px-3 rounded-md bg-brand text-white hover:bg-brand-700 transition-colors shadow-soft"
        >
          Login
        </Link>
      )}
    </div>
  );
};
