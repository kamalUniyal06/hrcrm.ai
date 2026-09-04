import { configureStore } from "@reduxjs/toolkit";
import ladgerReducer from "./Slices/ladger.js";
import unrepliedReducer from "./Slices/unrepliedEmails.js";
import favReducer from "./Slices/favEmailSlice.js";
import forwarededReducer from "./Slices/forwardedEmailSlice.js";
import dealsReducer from "./Slices/deals.js";
import offersReducer from "./Slices/offers.js";
import duplicateEmailReducer from "./Slices/duplicateEmailSlice";

import orderReducer from "./Slices/orders.js";
import viewEmailReducer from "./Slices/viewEmail.js";
import aiReplyReducer from "./Slices/aiReply.js";
import orderRemReducer from "./Slices/reminder.js";
import userReducer from "./Slices/userSlice.js";
import eventReducer from "./Slices/eventSlice.js";
import linkExchangeReducer from "./Slices/linkExchange.js";
import contactdefaulterReducer from "./Slices/contactdefaulterSlice";
import hotReducer from "./Slices/hotSlice.js";
import tagReducer from "./Slices/tag.js";
import syncReducer from "./Slices/syncSlice.js";
import reportReducer from "./Slices/reportSlice.js";
import brandTimelineReducer from "./Slices/brandTimeline.js";
import webManagerReducer from "./Slices/webManager.js";
import preferenceReducer from "./Slices/preferencesSlice.js";

export const store = configureStore({
  reducer: {
    ladger: ladgerReducer,
    unreplied: unrepliedReducer,
    fav: favReducer,
    duplicateEmails: duplicateEmailReducer,

    forwarded: forwarededReducer,
    deals: dealsReducer,
    orders: orderReducer,
    offers: offersReducer,
    viewEmail: viewEmailReducer,
    aiReply: aiReplyReducer,
    reminders: orderRemReducer,
    user: userReducer,
    events: eventReducer,
    linkExchange: linkExchangeReducer,
    hot: hotReducer,
    contactdefaulter: contactdefaulterReducer,
    user: userReducer,
    tag: tagReducer,
    sync: syncReducer,
    report: reportReducer,
    brandTimeline: brandTimelineReducer,
    webManager: webManagerReducer,
    preferences: preferenceReducer
  },
});
// store.js

store.subscribe(() => {
  const preferences =
    store.getState().preferences;

  const cleanedTables =
    Object.fromEntries(
      Object.entries(
        preferences.tables
      ).map(
        ([key, table]) => [
          key,
          {
            ...table,
            initialFiltersApplied:
              undefined,
          },
        ]
      )
    );

  localStorage.setItem(
    "preferences",
    JSON.stringify({
      ...preferences,
      tables:
        cleanedTables,
    })
  );
});