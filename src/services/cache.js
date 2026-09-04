const viewMails = {};
const threadMails = {};
const ledgers = {};
const ledgers_child = {};
const contacts = {};
const duplicateEmails = {};
const mailer_summary = {};

const cacheStore = {
    viewMails,
    threadMails,
    ledgers,
    ledgers_child,
    contacts,
    mailer_summary,
    duplicateEmails
};


export const setCache = (section, key, data) => {
    if (!cacheStore[section]) {
        console.warn(`Invalid cache section: ${section}`);
        return;
    }

    cacheStore[section][key] = data;
};

export const getCache = (section, key) => {
    if (!cacheStore[section]) {
        console.warn(`Invalid cache section: ${section}`);
        return null;
    }

    return cacheStore[section][key] || null;
};


export const clearCache = (section, key) => {
    if (cacheStore[section]?.[key]) {
        delete cacheStore[section][key];
    }
};


export const clearSectionCache = (section) => {
    if (cacheStore[section]) {
        cacheStore[section] = {};
    }
};