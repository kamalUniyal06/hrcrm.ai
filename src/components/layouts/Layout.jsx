import React from "react";
import {
    Outlet,
    useLocation,
    useNavigate,
} from "react-router-dom";

import {
    Tabs as ShadcnTabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

const tabs = [
    {
        id: "sidebar",
        label: "Sidebar",
        path: "sidebar",
    },
    {
        id: "views",
        label: "Deatil & Edit View",
        path: "views",
    },
    {
        id: "create-view",
        label: "Create View",
        path: "create-view",
    },
    {
        id: "table-view",
        label: "Table View",
        path: "table-view",
    },
];

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const activeTab =
        tabs.find((tab) =>
            location.pathname.endsWith(`/${tab.path}`),
        )?.id || "sidebar";

    const handleTabChange = (value) => {
        const tab = tabs.find(
            (item) => item.id === value,
        );

        if (!tab) return;

        navigate(`/settings/layout/${tab.path}`);
    };

    return (
        <div className="w-full">
            {/* ============================================================= */}
            {/* HEADER                                                        */}
            {/* ============================================================= */}

            <div className="mb-6">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                    Layout
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                    Customize how different parts of your
                    workspace are displayed.
                </p>
            </div>

            {/* ============================================================= */}
            {/* TABS                                                          */}
            {/* ============================================================= */}

            <ShadcnTabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="w-full"
            >
                <TabsList
                    className="
            h-auto
            w-fit
            max-w-full
            overflow-x-auto
            rounded-full
            border
            border-border
            bg-background
            p-1
          "
                >
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className="
                rounded-full
                px-5
                py-2
                text-sm
                font-medium
                text-muted-foreground
                transition-all

                hover:text-foreground

                data-[state=active]:bg-primary/10
                data-[state=active]:text-foreground
                data-[state=active]:ring-1
                data-[state=active]:ring-primary/40
                data-[state=active]:shadow-none
              "
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* ============================================================= */}
                {/* CURRENT TAB                                                   */}
                {/* ============================================================= */}

                <div className="mt-6">
                    <Outlet />
                </div>
            </ShadcnTabs>
        </div>
    );
};

export default Layout;