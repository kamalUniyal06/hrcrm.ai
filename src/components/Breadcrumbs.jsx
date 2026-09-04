import { Link, useMatches } from "react-router-dom";

const Breadcrumbs = () => {
    const matches = useMatches();
    console.log("matches", matches)
    const breadcrumbs = matches
        .filter((match) => match.handle?.breadcrumb)
        .map((match) => {
            const breadcrumb =
                typeof match.handle.breadcrumb === "function"
                    ? match.handle.breadcrumb(match)
                    : match.handle.breadcrumb;

            return {
                ...match,
                breadcrumb,
            };
        });

    return (
        <nav className="flex items-center gap-2 text-sm p-2">
            {breadcrumbs.length >= 2 && breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                    <div key={item.id} className="flex items-center gap-2">
                        {index > 0 && (
                            <span className="text-gray-400">
                                {'>'}
                            </span>
                        )}

                        {isLast ? (
                            <span className="font-medium text-gray-900">
                                {item.breadcrumb}
                            </span>
                        ) : (
                            <Link
                                to={item.pathname}
                                className="text-gray-500 hover:text-gray-900"
                            >
                                {item.breadcrumb}
                            </Link>
                        )}
                    </div>
                );
            })}
        </nav>
    );
};

export default Breadcrumbs;