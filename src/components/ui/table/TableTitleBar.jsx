import { ArrowLeft, BadgeInfo } from "lucide-react";
import TableFooter from "./TableFooter";
import { useNavigate } from "react-router-dom";
import IconButton from "../Buttons/IconButton";
import { useTableContext } from "./Table";
function TableTitleBar({ Icon, title, iconClass }) {
    const navigate = useNavigate();
    const { tableName } = useTableContext()

    return (
        <div className="flex items-center justify-between px-5 py-4 border-b bg-white shadow-sm rounded-t-xl text-primary">

            <div className={`flex items-center gap-3 `}>
                <IconButton
                    onClick={() => navigate(-1)}
                    className={`h-9 w-9 shrink-0 rounded-full border bg-white hover:bg-gray-100 transition flex items-center justify-center sm:h-10 sm:w-10`}
                    icon={ArrowLeft}
                    label="Back"
                    tooltipPosition="bottom"
                />
                <div className="p-2 rounded-lg flex items-center gap-3 ">

                    {/* <Icon className={`w-6 h-6 `} /> */}
                    <h2 className="text-xl font-semibold ">{tableName}</h2>
                </div>



                <button className="shrink-0 p-1 hover:bg-gray-100 rounded-md transition">
                    <BadgeInfo className="w-4 h-4 text-gray-500" />
                </button>
            </div>
            <TableFooter />
        </div>
    );
}

export default TableTitleBar;
