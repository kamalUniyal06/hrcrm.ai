import { useTableContext } from "./Table";
import TableCell from "./TableCell";

export default function TableRow({
    row,
}) {
    const {
        stickyColumns,
        gridTemplate,
    } = useTableContext();

    return (
        <div
            className="
        grid
        border-b
        hover:bg-slate-50
        transition-colors
      "
            style={{
                gridTemplateColumns:
                    gridTemplate,
            }}
        >
            {stickyColumns.map((column) => (
                <TableCell
                    key={column.accessor}
                    row={row}
                    column={column}
                />
            ))}
        </div>
    );
}