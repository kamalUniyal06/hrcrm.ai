// fields/components/UnknownField.jsx

const UnknownField = ({
    field,
    value,
}) => {
    return (
        <span className="text-gray-500">
            {value ?? "-"}
        </span>
    );
};

export default UnknownField;