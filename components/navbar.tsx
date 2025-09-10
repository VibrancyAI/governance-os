import { auth, signOut } from "@/app/(auth)/auth";
import Link from "next/link";
import { listOrganizationsForUser, getMembership, getOrgMembers, getUserProfilesByEmails } from "@/app/db";
import { cookies } from "next/headers";
import InviteDialog from "./org-invite-dialog";
import OrgSwitcher from "./org-switcher";
import DeleteOrgButton from "./delete-org-button";
import ProfileModalButton from "./profile-modal-button";
import OrgSettingsModalButton from "./org-settings-modal-button";
import CurrentOrgName from "./current-org-name";

export const Navbar = async () => {
  let session = await auth();
  const email = session?.user?.email || null;

  let orgs: Array<{ orgId: string; role: string }> = [];
  let currentOrgId: string | null = null;
  if (email) {
    const rows = await listOrganizationsForUser(email);
    orgs = rows.map((r: any) => ({ orgId: r.orgId, role: r.role }));
    currentOrgId = cookies().get("orgId")?.value || rows[0]?.orgId || null;
  }

  const members = currentOrgId ? await getOrgMembers({ orgId: currentOrgId }) : [];
  const memberEmails = members.map((m: any) => m.userEmail);
  const profiles = memberEmails.length > 0 ? await getUserProfilesByEmails({ emails: memberEmails }) : [];
  const emailToProfile = new Map(profiles.map((p: any) => [p.email, p]));
  const isOwner = currentOrgId && email ? ((await getMembership({ orgId: currentOrgId, email }))?.role === "owner") : false;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 absolute top-0 left-0 w-dvw border-b border-blue-500 py-2.5 px-4 justify-between flex flex-row items-center z-30 shadow-soft">
      <div className="flex flex-row gap-3 items-center">
        <div className="text-sm text-white font-bold">Governance OS</div>
        {email && (
          <div className="flex items-center gap-2">
            <CurrentOrgName />
            <OrgSwitcher />
          </div>
        )}
      </div>

      {session ? (
        <div className="flex items-center gap-3">
          {email && <InviteDialog />}

          {/* Stacked member avatars */}
          <div className="flex -space-x-2 mr-1">
            {memberEmails.slice(0, 5).map((e) => {
              const p: any = emailToProfile.get(e);
              const label = p?.displayName || e.split("@")[0];
              const initials = label.split(/[\s._-]/).filter(Boolean).slice(0,2).map((s: string) => s[0]?.toUpperCase() || "").join("") || label.slice(0,2).toUpperCase();
              const url = p?.avatarUrl as string | undefined;
              return (
                <div key={e} className="w-7 h-7 rounded-full border-2 border-blue-600 bg-white overflow-hidden flex items-center justify-center text-[10px] font-semibold text-blue-700">
                  {url ? (<img src={url} alt={label} className="w-full h-full object-cover" />) : initials}
                </div>
              );
            })}
          </div>

          <DeleteOrgButton currentOrgId={currentOrgId} userEmail={email} />

          <div className="group py-1.5 px-2.5 rounded-md hover:bg-blue-500 cursor-pointer relative border border-transparent hover:border-blue-400 transition-colors">
          <div className="text-sm text-blue-100 hover:text-white z-10">
            {session.user?.email}
          </div>
          <div className="flex-col absolute top-6 right-0 w-full pt-5 group-hover:flex hidden">
            <div className="flex flex-col gap-1 bg-white rounded-md border border-zinc-200 p-1 shadow-soft">
              <ProfileModalButton />
              {isOwner && (
                <OrgSettingsModalButton />
              )}
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

