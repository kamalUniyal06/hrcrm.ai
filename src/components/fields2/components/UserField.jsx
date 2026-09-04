// fields/components/UserField.jsx

const UserField = (props) => {
    return (
        <RelationField
            {...props}
            field={{
                ...props.field,
                relation: "users",
            }}
        />
    );
};

export default UserField;