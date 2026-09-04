export function calculateStickyOffsets(columns) {

    let left = 0;

    return columns.map(column => {

        if (!column.sticky) {
            return {
                ...column,
                left: null
            };
        }

        const current = {
            ...column,
            left
        };

        left += column.width;

        return current;

    });

}