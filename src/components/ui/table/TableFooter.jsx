import { motion } from "framer-motion";
import { useTableContext } from "./Table";

const TableFooter = () => {
    const { count } = useTableContext();

    return (
        <motion.div
            layout
            className="flex items-center justify-end px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-t"
        >
            <span className="text-sm text-gray-600">
                Total Records:
                <span className="ml-2 font-semibold text-black">
                    {count.toLocaleString()}
                </span>
            </span>
        </motion.div>
    );
};

export default TableFooter;