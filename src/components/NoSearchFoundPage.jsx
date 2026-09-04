import React, { useContext, useEffect, useState } from "react";
import {
  ladgerAction,
  manualEmailScan,
} from "../store/Slices/ladger";
import { useDispatch, useSelector } from "react-redux";
import { PageContext } from "../context/pageContext";
import { toast } from "react-toastify";
import { LoadingChase } from "./Loading";
import { Calendar, Eye, ScanSearch, UserPlus } from "lucide-react";
import { useThreadContext } from "../hooks/useThreadContext";
import { extractEmail } from "../assets/assets";
import { useQuery } from "@tanstack/react-query";
import { getLiveSearchData } from "../api/liveSearch.api";
import { createContactFromEmail } from "../api/contact.api";
import { useNavigate } from "react-router-dom";

export const NoSearchFoundPage = () => {
  const {
    manualScanLoading,
    error,
    manualScanResponse,
  } = useSelector((state) => state.ladger);

  const [currentMessageId, setCurrentMessageId] = useState(null);
  const [creatingContact, setCreatingContact] = useState(false);
  const [createError, setCreateError] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactSource, setContactSource] = useState("whatsapp");

  const { enteredEmail, setEnteredEmail } = useContext(PageContext);
  const { handleMove } = useThreadContext();
  const { data, isPending: noSearchFoundLoading } = useQuery({ queryKey: ['live-search', enteredEmail], queryFn: () => getLiveSearchData(enteredEmail) })
  const noSearchResultData = data?.data

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const email = extractEmail(enteredEmail || "")?.trim() || "";
    setContactEmail(email);
    setContactName(email.split("@")[0] || "");
    setCreateError("");
  }, [enteredEmail]);

  const handleCreateContact = async () => {
    const normalizedEmail = contactEmail.trim();
    const normalizedName = contactName.trim();

    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setCreateError("Enter a valid email address before creating a contact.");
      return;
    }

    if (!normalizedName) {
      setCreateError("Enter a contact name before creating the contact.");
      return;
    }

    setCreatingContact(true);
    setCreateError("");

    try {
      const response = await createContactFromEmail({
        email: normalizedEmail,
        name: normalizedName,
        source: contactSource,
      });
      const result = response?.data ?? response;

      if (!response?.success || result?.success === false) {
        const message = response?.error || result?.error || "Unable to create contact.";
        setCreateError(message);
        return;
      }

      const contactId = result?.contact_id;
      if (!contactId) {
        setCreateError("Contact was created, but no contact ID was returned.");
        return;
      }

      localStorage.setItem("searchTerm", normalizedEmail);
      setEnteredEmail(normalizedEmail);
      dispatch(ladgerAction.setTimeline(null));
      toast.success("Contact created successfully");
      navigate(`/contacts?email=${encodeURIComponent(normalizedEmail)}&id=${encodeURIComponent(contactId)}`);
    } catch (requestError) {
      setCreateError(
        requestError?.response?.data?.error ||
        requestError?.message ||
        "Unable to create contact. Please try again."
      );
    } finally {
      setCreatingContact(false);
    }
  };



  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(ladgerAction.clearAllErrors());
    }

    if (
      manualScanResponse &&
      manualScanResponse?.message_id == currentMessageId?.message_id
    ) {
      setEnteredEmail(currentMessageId?.customer_email);
      toast.success(manualScanResponse?.message)

      localStorage.setItem("searchTerm", currentMessageId?.customer_email);

      dispatch(ladgerAction.setTimeline(null));
    }
  }, [error, manualScanResponse, dispatch]);

  if (noSearchFoundLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <LoadingChase />
      </div>
    );
  }

  if (!noSearchResultData?.length) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-6 py-8 text-center sm:px-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <UserPlus className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Create a new contact</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              We could not find a contact or live-search result for this email. Add it to your CRM to get started.
            </p>

            <div className="mt-6 space-y-4 text-left">
              <div>
                <label htmlFor="contact-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Email address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  disabled={creatingContact}
                  onChange={(event) => setContactEmail(event.target.value)}
                  placeholder="contact@example.com"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label htmlFor="contact-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  value={contactName}
                  disabled={creatingContact}
                  onChange={(event) => setContactName(event.target.value)}
                  placeholder="Contact name"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label htmlFor="contact-source" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Source
                </label>
                <select
                  id="contact-source"
                  value={contactSource}
                  disabled={creatingContact}
                  onChange={(event) => setContactSource(event.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-gray-50"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="direct">Direct</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>

            {createError && (
              <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800">
                {createError}
              </div>
            )}

            <button
              type="button"
              disabled={creatingContact || !contactEmail.trim() || !contactName.trim()}
              onClick={handleCreateContact}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingContact ? <LoadingChase /> : <UserPlus className="h-4 w-4" />}
              {creatingContact ? "Creating contact..." : "Create contact"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">

      {/* Manual Scan Loader */}
      {manualScanLoading && (
        <div className="fixed inset-0 bg-black/20 flex flex-col items-center justify-center z-50 gap-4">
          <LoadingChase />
          <p className="text-white font-medium text-sm tracking-wide">
            Scanning email...
          </p>
        </div>
      )}

      <h1 className="text-center font-semibold text-gray-500">
        TimeLine Does not exists, Results from Live Search
      </h1>

      {noSearchResultData?.map((item) => (
        <div
          key={item.message_id}
          className="flex items-center justify-between gap-4
          bg-white rounded-xl shadow-sm border border-gray-100
          hover:bg-pink-50 transition cursor-pointer px-4 py-3"
        >
          {/* LEFT */}
          <div className="flex items-center gap-3 min-w-[220px]">
            <div
              className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500
              flex items-center justify-center text-white font-semibold"
            >
              {item.customer_email?.[0]?.toUpperCase()}
            </div>

            <div>
              {/* EMAIL SEARCH BUTTON */}
              <button
                disabled={manualScanLoading}
                onClick={() => {
                  setEnteredEmail(item.customer_email);

                  localStorage.setItem("searchTerm", item.customer_email);

                  dispatch(ladgerAction.setTimeline(null));
                }}
                className="text-sm font-medium text-gray-800 hover:underline disabled:opacity-50"
              >
                {item.customer_email}
              </button>

              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                {item.date_created}
              </div>
            </div>
          </div>

          {/* SUBJECT */}
          <div className="flex-1">
            <p className="text-sm text-gray-700 line-clamp-2">
              {item.subject}
            </p>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-2">

            {/* SCAN BUTTON */}
            <button
              disabled={manualScanLoading}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentMessageId(item);
                dispatch(manualEmailScan(item.message_id, item.customer_email, item.thread_id));
              }}
              className="px-3 py-1 text-xs rounded-md cursor-pointer bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50"
              title="Scan Email"
            >
              <ScanSearch className="w-5 h-5" />
            </button>

            {/* VIEW BUTTON */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMove({
                  email: extractEmail(item.customer_email),
                  threadId: item.thread_id,
                });
              }}
              className="px-3 py-1 rounded-md bg-blue-100 transition cursor-pointer"
              title="View"
            >
              <Eye className="w-5 h-5 text-blue-600" />
            </button>

          </div>
        </div>
      ))}
    </div>
  );
};

