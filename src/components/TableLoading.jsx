function TableLoading({ rows = 5, cols = 6 }) {
    return (
        <div className="w-full overflow-x-auto animate-pulse">
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        {Array.from({ length: cols }).map((_, i) => (
                            <th key={i} className="px-4 py-3">
                                <div className="h-4 bg-gray-300 rounded w-24"></div>
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {Array.from({ length: rows }).map((_, rowIdx) => (
                        <tr key={rowIdx} className="border-t">
                            {Array.from({ length: cols }).map((_, colIdx) => (
                                <td key={colIdx} className="px-4 py-4">
                                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default TableLoading;
