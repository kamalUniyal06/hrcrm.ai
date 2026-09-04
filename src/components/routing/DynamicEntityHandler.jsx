// src/routes/DynamicResourceHandler.jsx

import { useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

// Pages
import EntityListPage from "../pages/entity/EntityListPage";
import EntityCreatePage from "../pages/entity/EntityCreatePage";
import EntityViewPage from "../pages/entity/EntityViewPage";
import EntityEditPage from "../pages/entity/EntityEditPage";
import EntityNotFoundPage from "../pages/entity/EntityNotFoundPage";

// Queries
// import { useResourceDefinition } from "@/queries/resource.query";

export default function DynamicEntityHandler({ mode = "list" }) {
    const { entity, email, view } = useParams();

    const location = useLocation();
    const navigate = useNavigate();



    /**
     * Load resource metadata
     */
    // const { data, isLoading } = useEntityDefinition(resource);

    // if (isLoading) {
    //     return <PageLoader />;
    // }

    // if (!data) {
    //     return <EntityNotFoundPage />;
    // }

    switch (mode) {
        case "list":
            return (
                <EntityListPage entity={entity} view={view} />
            );

        case "create":
            return (
                <EntityCreatePage entity={entity} />
            );

        case "detail":
            return (
                <EntityViewPage
                    entity={entity}
                    email={email} />
            );

        case "edit":
            return (
                <EntityEditPage
                    entity={entity}
                    email={email}
                />
            );

        case "custom":
            return (
                <EntityViewPage
                    entity={entity}
                // id={route.id}
                // section={route.section}
                />
            );

        default:
            return <EntityNotFoundPage />;
    }
}