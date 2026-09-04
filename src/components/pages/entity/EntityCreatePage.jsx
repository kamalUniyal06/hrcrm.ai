import {
    useLayout,
} from "../../../queries/layouts.queries";

import CreateRenderer
    from "../../create/CreateRenderer";

import EntityCreateProvider
    from "../../create/context/EntityCreateProvider";

import {
    LoadingProgress,
} from "@/components/Loading";


const EntityCreatePage = ({
    entity,
}) => {
    /*
     * ============================================================
     * LAYOUT
     * ============================================================
     */

    const {
        data: layout,
        isLoading: layoutLoading,
        error: layoutError,
    } = useLayout(
        entity,
        "create"
    );


    /*
     * ============================================================
     * LOADING
     * ============================================================
     */

    if (layoutLoading) {
        return (
            <div className="flex h-full min-h-[70vh] items-center justify-center">
                <div className="flex flex-col items-center">
                    <LoadingProgress
                        color="blue"
                        size="100"
                        stroke="5"
                    />
                </div>
            </div>
        );
    }


    /*
     * ============================================================
     * ERROR
     * ============================================================
     */

    if (layoutError) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                Something went wrong.
            </div>
        );
    }


    /*
     * ============================================================
     * NO LAYOUT
     * ============================================================
     */

    if (!layout) {
        return null;
    }


    /*
     * ============================================================
     * CREATE
     * ============================================================
     */

    return (
        <EntityCreateProvider
            layout={layout}
            entity={entity}
        >
            <CreateRenderer
                layout={layout}
                entity={entity}
            />
        </EntityCreateProvider>
    );
};


export default EntityCreatePage;