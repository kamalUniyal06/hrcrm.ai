export const THEMES = [
    {
        id: "default",
        name: "Default",
        description: "Default CRM theme",
        colors: {
            primary: "#030213",
            secondary: "#033081",
            accent: "#0b6bf7",
        },
    },
    {
        id: "red",
        name: "Red",
        description: "Bold red workspace",
        colors: {
            primary: "#450a0a",
            secondary: "#b91c1c",
            accent: "#ef4444",
        },
    },
    {
        id: "green",
        name: "Green",
        description: "Fresh green workspace",
        colors: {
            primary: "#052e16",
            secondary: "#15803d",
            accent: "#16a34a",
        },
    },
    {
        id: "blue",
        name: "Blue",
        description: "Clean blue workspace",
        colors: {
            primary: "#0f172a",
            secondary: "#1d4ed8",
            accent: "#2563eb",
        },
    },
    {
        id: "purple",
        name: "Purple",
        description: "Modern purple workspace",
        colors: {
            primary: "#2e1065",
            secondary: "#6d28d9",
            accent: "#7c3aed",
        },
    },
];


/**
 * Set application theme
 *
 * Example:
 * setTheme("red")
 *
 * This sets:
 * <html data-theme="red">
 */
export const setTheme = (theme) => {
    const validTheme = THEMES.some(
        (item) => item.id === theme
    );

    const selectedTheme = validTheme
        ? theme
        : "default";

    document.documentElement.setAttribute(
        "data-theme",
        selectedTheme
    );

    localStorage.setItem(
        "app-theme",
        selectedTheme
    );

    return selectedTheme;
};


/**
 * Get currently selected theme
 */
export const getTheme = () => {
    return (
        localStorage.getItem("app-theme") ||
        document.documentElement.getAttribute(
            "data-theme"
        ) ||
        "default"
    );
};


/**
 * Initialize theme when application loads
 */
export const initializeTheme = () => {
    const theme = getTheme();

    document.documentElement.setAttribute(
        "data-theme",
        theme
    );

    return theme;
};