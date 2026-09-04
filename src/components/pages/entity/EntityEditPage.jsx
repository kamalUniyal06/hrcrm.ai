import { useEntityRecord } from "../../../hooks/useEntity";
import { useLayout } from "../../../queries/layouts.queries";

import EditRenderer from "../../edit/EditRenderer";
import EntityEditProvider from "../../edit/context/EntityEditProvider";
import { LoadingProgress } from "@/components/Loading";

const EntityEditPage = ({
    entity,
    email,
}) => {
    const {
        data: layout,
        isLoading: layoutLoading,
        error: layoutError,
    } = useLayout(entity, 'detail');

    const {
        data: record,
        isLoading: recordLoading,
        error: recordError,
    } = useEntityRecord({
        request: layout?.request,
        entity,
        recordInfo: {
            email
        },
        enabled: !!layout,
    });


    if (layoutLoading || recordLoading) {
        return (
            <div className="flex h-full min-h-[70vh] items-center justify-center">
                <div className="flex flex-col items-center">
                    <LoadingProgress color="blue" size="100" stroke="5" />
                </div>
            </div>
        );
    }

    if (layoutError || recordError) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                Something went wrong.
            </div>
        );
    }

    if (!layout || !record) {
        return null;
    }

    return (
        <EntityEditProvider
            layout={layout}
            record={record}
            entity={entity}
            email={email}
        >
            <EditRenderer
                layout={layout}
                record={record}
                entity={entity}
            />
        </EntityEditProvider>
    );
};

export default EntityEditPage;