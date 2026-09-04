import { useMemo, useState } from "react";
import {
  Bug,
  Cable,
  ChartBarStackedIcon,
  Cpu,
  CreditCard,
  Database,
  FileCog,
  GamepadIcon,
  Globe,
  Joystick,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  Recycle,
  Search,
  Settings2,
  User,
  Users,
  Wallet,
  X,
  LayoutDashboard,
  Palette,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

/* ==========================================================================
   SETTINGS MENU
   ========================================================================== */

const menuItems = [
  /* ------------------------------------------------------------------------
     PREFERENCES
     ------------------------------------------------------------------------ */

  {
    group: "Preferences",
    title: "Layout",
    subtitle: "Customize workspace layout",
    icon: LayoutDashboard,
    link: "layout",
  }
];

/* ==========================================================================
   GROUP ORDER
   ========================================================================== */

const groupOrder = [
  "Preferences"
];

/* ==========================================================================
   SETTINGS PAGE
   ========================================================================== */

export function SettingsPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");

  const location = useLocation();

  const isSettingsHome = /\/settings\/?$/.test(
    location.pathname,
  );

  /* ------------------------------------------------------------------------
     FILTER SETTINGS
     ------------------------------------------------------------------------ */

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return menuItems;

    return menuItems.filter(
      ({ title, subtitle, group }) =>
        `${title} ${subtitle} ${group}`
          .toLowerCase()
          .includes(query),
    );
  }, [search]);

  /* ------------------------------------------------------------------------
     GROUP SETTINGS
     ------------------------------------------------------------------------ */

  const groupedItems = useMemo(() => {
    return groupOrder
      .map((group) => ({
        group,
        items: filteredItems.filter(
          (item) => item.group === group,
        ),
      }))
      .filter(({ items }) => items.length > 0);
  }, [filteredItems]);

  return (
    <div className="flex h-[calc(100vh-2rem)] min-h-[640px] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      {/* ================================================================== */}
      {/* SIDEBAR                                                            */}
      {/* ================================================================== */}

      <aside
        className={`
          ${collapsed
            ? "w-[76px]"
            : "w-[310px]"
          }

          flex
          shrink-0
          flex-col
          border-r
          border-border
          bg-card
          transition-[width]
          duration-300
          ease-in-out
        `}
      >
        {/* ================================================================ */}
        {/* HEADER                                                           */}
        {/* ================================================================ */}

        <div
          className={`
            flex
            h-20
            items-center
            border-b
            border-border

            ${collapsed
              ? "justify-center px-3"
              : "justify-between px-5"
            }
          `}
        >
          <div
            className={`
              min-w-0
              items-center
              gap-3

              ${collapsed
                ? "hidden"
                : "flex"
              }
            `}
          >
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-gradient-to-b
                from-sidebar-primary
                from-0%
                via-sidebar-primary
                via-2%
                to-sidebar-secondary
                to-100%
                text-white
                shadow-sm
              "
            >
              <Settings2 className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1
                className="
                  truncate
                  text-lg
                  font-semibold
                  tracking-tight
                "
              >
                Settings
              </h1>

              <p
                className="
                  text-xs
                  text-muted-foreground
                "
              >
                Workspace management
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setCollapsed((value) => !value)
            }
            className="
              flex
              h-9
              w-9
              shrink-0
              cursor-pointer
              items-center
              justify-center
              rounded-lg
              border
              border-border
              bg-background
              text-muted-foreground
              transition-colors
              hover:bg-accent
              hover:text-accent-foreground
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
            "
            aria-label={
              collapsed
                ? "Expand settings sidebar"
                : "Collapse settings sidebar"
            }
            title={
              collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* ================================================================ */}
        {/* SEARCH                                                           */}
        {/* ================================================================ */}

        {!collapsed && (
          <div
            className="
              border-b
              border-border
              p-4
            "
          >
            <label className="relative block">
              <Search
                className="
                  pointer-events-none
                  absolute
                  left-3
                  top-1/2
                  h-4
                  w-4
                  -translate-y-1/2
                  text-muted-foreground
                "
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search settings..."
                className="
                  h-10
                  w-full
                  rounded-lg
                  border
                  border-border
                  bg-input-background
                  pl-9
                  pr-9
                  text-sm
                  text-foreground
                  outline-none
                  transition
                  placeholder:text-muted-foreground
                  focus:border-primary/50
                  focus:ring-2
                  focus:ring-ring/20
                "
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="
                    absolute
                    right-2
                    top-1/2
                    flex
                    h-6
                    w-6
                    -translate-y-1/2
                    cursor-pointer
                    items-center
                    justify-center
                    rounded-md
                    text-muted-foreground
                    hover:bg-accent
                    hover:text-accent-foreground
                  "
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </label>
          </div>
        )}

        {/* ================================================================ */}
        {/* NAVIGATION                                                       */}
        {/* ================================================================ */}

        <nav
          className="
            custom-scrollbar
            flex-1
            overflow-y-auto
            p-3
          "
          aria-label="Settings navigation"
        >
          {!collapsed && (
            <p
              className="
                mb-3
                px-2
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.14em]
                text-muted-foreground
              "
            >
              Settings
            </p>
          )}

          {/* ============================================================= */}
          {/* GROUPS                                                        */}
          {/* ============================================================= */}

          <div className="space-y-5">
            {groupedItems.map(
              ({ group, items }) => (
                <div key={group}>
                  {/* ----------------------------------------------------- */}
                  {/* GROUP TITLE                                            */}
                  {/* ----------------------------------------------------- */}

                  {!collapsed && (
                    <div className="mb-1.5 px-2">
                      <p
                        className="
                          text-[10px]
                          font-semibold
                          uppercase
                          tracking-[0.12em]
                          text-muted-foreground/70
                        "
                      >
                        {group}
                      </p>
                    </div>
                  )}

                  {/* ----------------------------------------------------- */}
                  {/* GROUP ITEMS                                             */}
                  {/* ----------------------------------------------------- */}

                  <div className="space-y-1">
                    {items.map((item) => {
                      const Icon = item.icon;

                      return (
                        <NavLink
                          key={`${item.title}-${item.link}`}
                          to={item.link}
                          title={
                            collapsed
                              ? item.title
                              : undefined
                          }
                          className={({
                            isActive,
                          }) =>
                            `
                            group
                            flex
                            rounded-xl
                            transition-all
                            duration-200
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-ring

                            ${collapsed
                              ? "h-12 items-center justify-center"
                              : "items-center gap-3 px-3 py-2.5"
                            }

                            ${isActive
                              ? "bg-gradient-to-b from-sidebar-primary from-0% via-sidebar-primary via-2% to-sidebar-secondary to-100% text-white shadow-sm"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            }
                          `
                          }
                        >
                          <Icon
                            className="
                              h-[18px]
                              w-[18px]
                              shrink-0
                            "
                          />

                          {!collapsed && (
                            <div className="min-w-0">
                              <p
                                className="
                                  truncate
                                  text-sm
                                  font-medium
                                  leading-5
                                "
                              >
                                {item.title}
                              </p>

                              <p
                                className="
                                  truncate
                                  text-xs
                                  leading-4
                                  opacity-70
                                "
                              >
                                {item.subtitle}
                              </p>
                            </div>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </div>

          {/* ============================================================= */}
          {/* NO RESULTS                                                     */}
          {/* ============================================================= */}

          {!collapsed &&
            filteredItems.length === 0 && (
              <div
                className="
                  px-3
                  py-10
                  text-center
                "
              >
                <Search
                  className="
                    mx-auto
                    mb-3
                    h-6
                    w-6
                    text-muted-foreground
                  "
                />

                <p className="text-sm font-medium">
                  No settings found
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-muted-foreground
                  "
                >
                  Try a different search term.
                </p>
              </div>
            )}
        </nav>

        {/* ================================================================ */}
        {/* FOOTER                                                           */}
        {/* ================================================================ */}

        {!collapsed && (
          <div
            className="
              border-t
              border-border
              px-5
              py-4
              text-xs
              text-muted-foreground
            "
          >
            {menuItems.length} settings available
          </div>
        )}
      </aside>

      {/* ================================================================== */}
      {/* CONTENT                                                            */}
      {/* ================================================================== */}

      <main
        className="
          custom-scrollbar
          min-w-0
          flex-1
          overflow-y-auto
          bg-background/45
        "
      >
        {isSettingsHome ? (
          <div
            className="
              flex
              min-h-full
              items-center
              justify-center
              p-8
            "
          >
            <div className="max-w-md text-center">
              <div
                className="
                  mx-auto
                  mb-5
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-border
                  bg-card
                  text-primary
                  shadow-sm
                "
              >
                <Settings2 className="h-7 w-7" />
              </div>

              <h2
                className="
                  text-2xl
                  font-semibold
                  tracking-tight
                  text-foreground
                "
              >
                Manage your workspace
              </h2>

              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-muted-foreground
                "
              >
                Choose a setting from the sidebar
                to configure your workspace.
              </p>
            </div>
          </div>
        ) : (
          <div className="min-h-full p-6">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
}