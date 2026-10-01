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
import { LayoutDraftProvider } from "./LayoutDraftContext";

const tabs = [
    {
        id: "sidebar",
        label: "Sidebar",
        path: "sidebar",
    },
    {
        id: "views",
        label: "Detail & Edit View",
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
        <LayoutDraftProvider>
            <div className="layout-editor min-w-0 w-full">
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
                activationMode="manual"
                className="w-full"
            >
                <TabsList
                    className="
            h-auto group-data-horizontal/tabs:h-auto
            grid grid-cols-2 @min-[640px]/settings:flex
            w-full @min-[640px]/settings:w-fit
            max-w-full
            rounded-xl @min-[640px]/settings:rounded-full
            border
            border-border
            bg-background
            gap-1
            p-1.5 @min-[640px]/settings:p-2
          "
                >
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className="
                rounded-full
                min-h-10 @min-[640px]/settings:min-h-0
                min-w-0 whitespace-normal @min-[640px]/settings:whitespace-nowrap
                px-3 @min-[640px]/settings:px-6
                py-2 @min-[640px]/settings:py-0.5
                text-sm @min-[640px]/settings:text-[13px] @min-[640px]/settings:leading-[18px]
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
        </LayoutDraftProvider>
    );
};

export default Layout;
