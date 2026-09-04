// create/context/useEntityCreate.js

import { useContext } from "react";

import EntityCreateContext
    from "./EntityCreateContext";

const useEntityCreate = () => {
    const context =
        useContext(
            EntityCreateContext
        );

    if (!context) {
        throw new Error(
            "useEntityCreate must be used inside EntityCreateProvider"
        );
    }

    return context;
};

export default useEntityCreate;