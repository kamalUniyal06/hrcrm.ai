import { useDispatch, useSelector } from "react-redux";

import { selectTablePreference, initializeTable, } from "../store/Slices/preferencesSlice";

import { useEffect } from "react";

export const useTablePreference = (table) => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(initializeTable(table));
    }, [dispatch, table]);

    return useSelector(selectTablePreference(table));
};