import { useEffect, useRef } from "react";

export default function useInfiniteLoader({
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
}) {
    const loaderRef = useRef(null);

    useEffect(() => {
        if (!loaderRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (
                    entry.isIntersecting &&
                    hasNextPage &&
                    !isFetchingNextPage
                ) {
                    fetchNextPage();
                }
            },
            {
                root: null,
                rootMargin: "200px",
                threshold: 0,
            }
        );

        observer.observe(loaderRef.current);

        return () => observer.disconnect();
    }, [
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
    ]);

    return loaderRef;
}