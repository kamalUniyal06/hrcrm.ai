export function ContactDetailSkeleton() {
    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-[#faf5ff] via-[#f0f9ff] to-[#fdf2f8] py-12 px-4 animate-pulse">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Hero */}
                <div className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-3xl p-8 shadow-2xl">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-full bg-gray-200" />

                        <div className="flex-1 space-y-3">
                            <div className="h-8 w-64 bg-gray-200 rounded-lg" />
                            <div className="h-5 w-40 bg-gray-200 rounded-lg" />
                        </div>

                        <div className="w-12 h-12 rounded-xl bg-gray-200" />
                    </div>
                </div>

                {/* Contact Info */}
                <div className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-3xl p-8 shadow-2xl">
                    <div className="h-8 w-56 bg-gray-200 rounded-lg mb-8" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <SkeletonInfo key={i} />
                        ))}
                    </div>
                </div>

                {/* Deals */}
                <div className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-3xl p-8 shadow-2xl">

                    <div className="h-8 w-48 bg-gray-200 rounded-lg mb-8" />

                    <div className="grid md:grid-cols-3 gap-4 mb-8">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="bg-white/30 border border-white/60 rounded-2xl p-5"
                            >
                                <div className="h-5 w-24 bg-gray-200 rounded mb-3" />
                                <div className="h-8 w-20 bg-gray-200 rounded" />
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div
                                key={i}
                                className="grid grid-cols-12 gap-4 p-4 rounded-2xl bg-white/30 border border-white/60"
                            >
                                <div className="col-span-1 h-10 bg-gray-200 rounded-full" />
                                <div className="col-span-3 h-10 bg-gray-200 rounded-xl" />
                                <div className="col-span-3 h-10 bg-gray-200 rounded-xl" />
                                <div className="col-span-5 h-10 bg-gray-200 rounded-xl" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Addresses */}
                <div className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-3xl p-8 shadow-2xl">
                    <div className="h-8 w-40 bg-gray-200 rounded-lg mb-8" />

                    <div className="space-y-4">
                        <SkeletonInfo full />
                        <SkeletonInfo full />
                    </div>
                </div>

            </div>
        </div>
    );
}

function SkeletonInfo({ full = false }) {
    return (
        <div
            className={`backdrop-blur-md bg-white/30 border border-white/60 rounded-2xl p-4 flex gap-4 ${full ? "col-span-full" : ""
                }`}
        >
            <div className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0" />

            <div className="flex-1">
                <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
                <div className="h-5 w-40 bg-gray-200 rounded" />
            </div>
        </div>
    );
}