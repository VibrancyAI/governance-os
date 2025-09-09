export function Form({
  action,
  children,
}: {
  action: any;
  children: React.ReactNode;
}) {
  return (
    <form action={action} className="flex flex-col gap-4 px-4 sm:px-16 pb-8">
      <div>
        <label
          htmlFor="email"
          className="block text-sm text-zinc-700"
        >
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="user@acme.com"
          autoComplete="email"
          required
          className="mt-1 block w-full appearance-none rounded-md bg-white border border-zinc-200 px-3 py-2 placeholder-zinc-400 focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none sm:text-sm transition-all"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm text-zinc-700"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mt-1 block w-full appearance-none rounded-md bg-white border border-zinc-200 px-3 py-2 placeholder-zinc-400 focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none sm:text-sm transition-all"
        />
      </div>
      {children}
    </form>
  );
}
