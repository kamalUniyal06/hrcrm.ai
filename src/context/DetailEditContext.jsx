import { createContext, useContext, useState } from "react";

const DetailEditContext = createContext(null);

export const DetailEditProvider = ({ children }) => {
    const [editingField, setEditingField] = useState(null);

    const startEditing = (fieldKey) => {
        setEditingField(fieldKey);
    };

    const stopEditing = () => {
        setEditingField(null);
    };

    const isEditing = (fieldKey) => {
        return editingField === fieldKey;
    };

    return (
        <DetailEditContext.Provider
            value={{
                editingField,
                startEditing,
                stopEditing,
                isEditing,
            }}
        >
            {children}
        </DetailEditContext.Provider>
    );
};

export const useDetailEdit = () => {
    const context = useContext(DetailEditContext);

    if (!context) {
        throw new Error(
            "useDetailEdit must be used inside DetailEditProvider"
        );
    }

    return context;
};