import { useContext } from "react";
import EntityEditContext from "./EntityEditContext";

const useEntityEdit = () => {
    const context =
        useContext(EntityEditContext);

    if (!context) {
        throw new Error(
            "useEntityEdit must be used inside EntityEditProvider"
        );
    }

    return context;
};

export default useEntityEdit;