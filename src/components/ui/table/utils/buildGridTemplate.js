export function buildGridTemplate(columns) {
    return columns
        .map(col => `${col.width}px`)
        .join(" ");
}