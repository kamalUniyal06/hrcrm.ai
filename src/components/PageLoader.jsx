import { LoadingChase } from "./Loading";

export default function PageLoader() {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Blur + dark overlay */}
            <div className="absolute inset-0 bg-black/10 " />

            {/* Loader */}
            <div className="relative z-10 flex flex-col items-center gap-4">
                <LoadingChase />
                {/* <p className="text-black font-semibold tracking-wide">
                    {message}
                </p> */}
            </div>
        </div>
    );
}