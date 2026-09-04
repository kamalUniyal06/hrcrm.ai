function ProfileOnboardingSkeleton() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="animate-pulse space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-slate-200" />
          <div className="space-y-2">
            <div className="h-3 w-36 rounded-full bg-slate-200" />
            <div className="h-4 w-64 rounded-full bg-slate-100" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-slate-100 bg-slate-50 p-3"
            >
              <div className="mb-3 h-3 w-20 rounded-full bg-slate-200" />
              <div className="h-4 w-32 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
          <div className="mb-3 h-4 w-48 rounded-full bg-slate-200" />
          <div className="mb-2 h-3 w-full max-w-2xl rounded-full bg-slate-100" />
          <div className="h-3 w-2/3 rounded-full bg-slate-100" />
        </div>
      </div>
    </section>
  );
}

export default ProfileOnboardingSkeleton;
