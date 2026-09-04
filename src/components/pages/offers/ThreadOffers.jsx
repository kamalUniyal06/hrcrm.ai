import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Pencil, Plus, Timer, Trash2 } from "lucide-react";
import SummaryCard from "../../SummaryCard";
import PageHeader from "../../PageHeader";
import useModule from "../../../hooks/useModule";
import { CREATE_DEAL_API_KEY } from "../../../store/constants";
import { buildTable } from "../../Preview";
import { useThreadContext } from "../../../hooks/useThreadContext";
import {
  deleteOffer,
  offersAction,
  updateOffer,
} from "../../../store/Slices/offers";
import { LoadingChase } from "../../Loading";
import { toast } from "react-toastify";
import { Save, Send, X, Loader2 } from "lucide-react";
import IconButton from "../../ui/Buttons/IconButton";
import { extractEmail } from "../../../assets/assets";
import { useDealsByEmail } from "../../../queries/deals.queries";
import { offerKeys, useOffersByEmail } from "../../../queries/offers.queries";
import { useContact } from "../../../queries/contact.queries";
import { useTemplateByName } from "../../../queries/template.queries";
import { queryClient } from "../../../lib/queryClient";
import { useWebsites } from "../../../queries/web.queries";
import Cell from "../../ui/table/RecordCell";

export default function ThreadOffers({ email, id }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [send, setSend] = useState(false);
  const [currentOffers, setCurrentOffers] = useState([]);
  const [selectedOffers, setSelectedOffers] = useState([]);

  const [editingIds, setEditingIds] = useState([]);
  const [editDataMap, setEditDataMap] = useState({});

  const { data: webSitesData } = useWebsites();
  const websiteLists = webSitesData?.data ?? [];
  const { deleteOfferId, deleting, updating, message, error } =
    useSelector((state) => state.offers);
  const { data } = useContact(email)
  const threadId = data?.contact?.thread_id
  const { data: dealsData, isPending: dealsLoading, isError: dealsError } = useDealsByEmail(email);
  const { data: offersData, isPending: offersLoading, isError: offersError } = useOffersByEmail(email);
  const offers = offersData?.data ?? []
  const deals = dealsData?.data ?? []
  const { showBrandTimeline, contacts } = useSelector((state) => state.brandTimeline);
  const { handleMove } = useThreadContext();

  const [validWebsite, setValidWebsite] = useState({});

  // 🔥 TEMPLATE FETCH
  const { data: templateData } = useTemplateByName("OfferORG");
  const toggleSelect = (id) => {
    setSelectedOffers((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
    if (editingIds.length > 0) {
      if (!selectedOffers.includes(id)) {
        const selectedData = currentOffers.find(o => o.id == id);

        setEditingIds(prev => [...prev, id]);
        setEditDataMap(prev => ({ ...prev, [id]: { ...selectedData } }));
      }
      else {
        setEditingIds(prev => prev.filter(p => p != id));
        setEditDataMap(prev => {
          const { [id]: _, ...rest } = prev
          return rest
        });
      }

    }
  };
  const handleSelectAll = () => {
    if (selectedOffers.length === currentOffers.length) {
      setSelectedOffers([]);
      setEditingIds([]);
      setEditDataMap({});
    } else {
      setSelectedOffers(currentOffers.map((o) => o.id));
    }
  };
  useEffect(() => {
    const currentOffers = offers
    const currentDeals = deals
    const valid = {}
    const currentContacts = showBrandTimeline ? contacts : [{ email1: email }]
    currentContacts.forEach(contact => {
      let threadOffers = showBrandTimeline ? currentOffers.filter(offer => extractEmail(offer?.real_name ?? offer.email_c) == contact?.email1) : currentOffers
      let threadDeals = showBrandTimeline ? currentDeals.filter(deal => extractEmail(deal?.real_name ?? deal.email) == contact?.email1) : currentDeals
      return valid[contact?.email1] = websiteLists.filter((w) => {
        const usedInOffers = threadOffers.some((o) => o.website === w && !editingIds.includes(o.id));
        const usedInDeals = threadDeals.some((d) => d.website_c === w);
        return !usedInOffers && !usedInDeals;
      });
    })
    let activeOffers = id ? currentOffers.filter((o) => o.id == id) : currentOffers.filter((o) => o.offer_status == "active");
    setValidWebsite(valid);
    setCurrentOffers(activeOffers);
  }, [offers, deals, editingIds, email, id]);

  // 🔥 INLINE EDIT HANDLERS
  const handleEdit = (offers) => {
    const ids = offers.map(o => o.id);

    const dataMap = {};
    offers.forEach(o => {
      dataMap[o.id] = { ...o };
    });

    setEditingIds(ids);
    setEditDataMap(dataMap);
  };

  const handleSave = (offers, isSend = false) => {
    setSend(isSend); // 🔥 track intent
    dispatch(updateOffer({ offers }));
  };

  const handleDelete = (id, offer) => {
    dispatch(deleteOffer(id, offer));
  };

  const handleCreate = (itemEmail) => { navigate(`/offers/create?email=${itemEmail}`) };

  const handlePreview = (offersData = currentOffers) => {
    let html = templateData?.[0]?.body_html || "";

    const tableHtml = buildTable(
      offersData,
      "Offers",
      "website",
      "our_offer_c",
    );
    const email = extractEmail(offersData[0]?.real_name ?? offersData[0]?.email_c)

    html = html
      .replace("{{USER_EMAIL}}", email)
      .replace("{{TABLE}}", tableHtml);
    const itemThreadId = showBrandTimeline ? contacts.find(contact => contact.email1 == email)?.thread_id : threadId

    handleMove({ email, threadId: itemThreadId, reply: html });
  };
  useEffect(() => {
    if (!updating) {
      setEditingIds([]);
      setSelectedOffers([])
      setEditDataMap({})
    }

    if (message) {
      queryClient.invalidateQueries({ queryKey: offerKeys.all })

      toast.success(message);
      if (message?.includes("Updated")) {
        if (send) {
          handlePreview(editingIds.map(id => editDataMap[id]));
          setSend(false);
        }
        dispatch(offersAction.clearAllMessages());
      }
    }

    if (error) {
      toast.error(error);
      setSend(false); // reset on error too
      dispatch(offersAction.clearAllErrors());
    }
  }, [updating, message, error]);
  const isMultiEditValid = editingIds.every(id => {
    const data = editDataMap[id];
    return (
      data?.website &&
      Number(data?.client_offer_c) >= 0 &&
      Number(data?.our_offer_c) > 0
    );
  });
  return (
    /* Stacks until `lg`, which is where SummaryCard switches to its fixed
       `lg:w-80`. Side by side any earlier and the card — `w-full` plus
       `shrink-0` — claims the whole row and squeezes the table to nothing. */
    <div className="w-full flex flex-col gap-4 lg:flex-row lg:gap-6 lg:items-start">
      <div className="min-w-0 flex-1 relative border rounded-2xl p-3 sm:p-6 bg-white shadow-sm">
        <PageHeader title={"OFFERS"} onAdd={() => handleCreate(email)} />
        {offersLoading && (
          <div className="space-y-3 mt-4">
            {Array.from({
              length: 2,
            }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-gray-100 animate-pulse"
              />
            ))}
          </div>
        )}
        {offersError && (
          <div className="py-8 text-center text-red-500">
            Failed to load Offers
          </div>
        )}
        {selectedOffers.length > 0 && (
          <div className="mb-4 flex items-center justify-end rounded-xl">
            <div className="flex flex-wrap justify-end gap-2 sm:gap-3">

              {editingIds.length > 0 ? (
                <>
                  <IconButton
                    icon={Save}
                    label="Save"
                    onClick={() => handleSave(editingIds.map(id => editDataMap[id]), false)}
                    loading={updating && !send}
                    disabled={!isMultiEditValid}
                    className="bg-blue-100 hover:bg-blue-200"
                  />

                  <IconButton
                    icon={Send}
                    label="Save & Send"
                    onClick={() => handleSave(editingIds.map(id => editDataMap[id]), true)}
                    disabled={!isMultiEditValid}

                    loading={updating && send}

                    className="bg-green-100 hover:bg-green-200"
                  />
                  <IconButton
                    icon={X}
                    label="Cancel"
                    onClick={() => setEditingIds([])}
                    className="bg-red-100 hover:bg-red-200"
                  />
                </>
              ) : (
                <>
                  <IconButton
                    icon={Pencil}
                    label="Edit"
                    onClick={() => {
                      const selectedData = currentOffers.filter(o =>
                        selectedOffers.includes(o.id)
                      );
                      handleEdit(selectedData);
                    }}
                    className="bg-blue-100 hover:bg-blue-200"
                  />

                  <IconButton
                    icon={Send}
                    label="Send"
                    onClick={() => {
                      const selectedData = currentOffers.filter(o =>
                        selectedOffers.includes(o.id)
                      );
                      handlePreview(selectedData);
                    }}
                    className="bg-green-100 hover:bg-green-200"
                  />

                  <IconButton
                    icon={Trash2}
                    label="Delete"
                    onClick={() => {
                      selectedOffers.forEach(id => {
                        const offer = currentOffers.find(o => o.id === id);
                        handleDelete(id, offer);
                      });
                      setSelectedOffers([]);
                    }}
                    className="bg-red-100 hover:bg-red-200"
                  />
                </>
              )}
            </div>
          </div>
        )}
        {/* HEADER — grid only from `lg`; the stacked cards label themselves */}
        <div className={`hidden lg:grid ${showBrandTimeline ? "lg:grid-cols-13" : "lg:grid-cols-12"} px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b`}>
          {!showBrandTimeline && <div onClick={handleSelectAll} className="col-span-1 cursor-pointer ">
            <input
              type="checkbox"
              checked={selectedOffers.length === currentOffers.length}

            />
          </div>}


          <div className="col-span-2">Created At </div>
          <div className="col-span-3">Website</div>
          {showBrandTimeline && <div className="col-span-2">Email</div>}
          <div className="col-span-2 text-center">Client Offer</div>
          <div className="col-span-2 text-center">Our Offer</div>
          <div className="col-span-2 text-center ml-auto">Actions</div>
        </div>

        {/* SELECT ALL — the header checkbox is hidden below `lg` */}
        {!showBrandTimeline && currentOffers.length > 0 && (
          <button
            type="button"
            onClick={handleSelectAll}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-1 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden"
          >
            <input
              type="checkbox"
              readOnly
              checked={selectedOffers.length === currentOffers.length}
            />
            Select all
          </button>
        )}

        {/* ROWS */}
        <div className="space-y-2 mt-2">
          {currentOffers.length === 0 && (
            <div className="text-center text-gray-400 py-6">
              No offers found
            </div>
          )}

          {currentOffers.map((offer, index) => {
            const isEditing = editingIds.includes(offer.id);
            const editData = editDataMap[offer.id] || {};
            const itemEmail = showBrandTimeline ? extractEmail(offer.real_name ?? offer.email_c) : email
            const itemThreadId = showBrandTimeline ? contacts.find(contact => contact.email1 == itemEmail)?.thread_id : threadId
            return (
              <motion.div
                key={offer.id}
                className={`flex flex-col gap-2 px-3 py-3 bg-gray-50 rounded-xl border lg:grid ${showBrandTimeline ? "lg:grid-cols-13" : "lg:grid-cols-12"} lg:items-center lg:gap-0 lg:px-4`}
              >
                {/* No */}
                {!showBrandTimeline && <div onClick={() => toggleSelect(offer.id)}
                  className="flex items-center gap-2 font-semibold text-gray-500 cursor-pointer lg:col-span-1 lg:block">
                  <input
                    type="checkbox"
                    checked={selectedOffers.includes(offer.id)}
                    readOnly
                  />
                  <span className="text-xs uppercase tracking-wide lg:hidden">Select</span>
                </div>}
                <Cell label="Created At" className="lg:col-span-2">
                  <div className="flex min-w-0 gap-1 items-center">
                    <Timer size={16} className="shrink-0" />
                    <span className="truncate">{offer.date_entered || "-"}</span>
                  </div>
                </Cell>

                {/* Website */}
                <Cell label="Website" className="min-w-0 lg:col-span-3">
                  {isEditing ? (
                    <select
                      value={editData.website}
                      onChange={(e) =>
                        setEditDataMap(prev => ({
                          ...prev,
                          [offer.id]: {
                            ...prev[offer.id],
                            website: e.target.value,
                          }
                        }))
                      }
                      className="min-w-0 max-w-full border rounded-lg px-2 py-1 lg:w-full"
                    >
                      {validWebsite[itemEmail]?.map((site, i) => (
                        <option key={i} value={site}>
                          {site}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span title={offer.website} className="min-w-0 text-blue-600 truncate block">
                      {offer.website}
                    </span>
                  )}
                </Cell>
                {showBrandTimeline && (
                  <Cell label="Email" className="min-w-0 lg:col-span-2">
                    <span title={itemEmail} className="min-w-0 truncate block">{itemEmail}</span>
                  </Cell>
                )}

                {/* Client Offer */}
                <Cell label="Client Offer" className="lg:col-span-2 lg:text-center">
                  <span>${offer.client_offer_c || "-"}</span>
                </Cell>

                {/* Our Offer */}
                <Cell label="Our Offer" className="lg:col-span-2 lg:text-center">
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.our_offer_c}
                      min={1}
                      onChange={(e) =>
                        setEditDataMap(prev => ({
                          ...prev,
                          [offer.id]: {
                            ...prev[offer.id],
                            our_offer_c: e.target.value,
                          }
                        }))
                      }
                      className="w-20 border rounded px-2 py-1 text-center"
                    />
                  ) : (
                    <span className="text-green-600">
                      ${offer.our_offer_c || "-"}
                    </span>
                  )}
                </Cell>

                {/* Actions */}
                <Cell
                  label="Actions"
                  className="border-t border-gray-200 pt-2 lg:col-span-2 lg:border-0 lg:pt-0 lg:ml-auto"
                >
                  <div className="flex flex-wrap justify-end gap-2 lg:justify-center">
                  {selectedOffers.length == 0 ? (isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      <IconButton
                        icon={Save}
                        label="Save"
                        loading={editingIds.includes(offer.id) && updating && !send}
                        onClick={() => handleSave([editData], false)}
                        disabled={!isMultiEditValid || selectedOffers.length > 0}
                      />

                      <IconButton
                        icon={Send}
                        label="Save & Send"
                        loading={editingIds.includes(offer.id) && updating && send}
                        onClick={() => handleSave([editData], true)}
                        disabled={!isMultiEditValid || selectedOffers.length > 0}
                      />

                      <IconButton
                        icon={X}
                        label="Cancel"
                        onClick={() => setEditingIds([])}
                        className="bg-red-100 hover:bg-red-200"
                        disabled={selectedOffers.length > 0}
                      />
                    </div>
                  ) : (
                    <>
                      {showBrandTimeline && <IconButton
                        icon={Plus}
                        label="Create"
                        onClick={() => handleCreate(itemEmail)}
                        className="bg-green-100 hover:bg-green-200 text-green-600"

                      />}


                      <IconButton
                        onClick={() => handleEdit([offer])}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-600"
                        icon={Pencil}
                        label={"Edit"}
                      />
                      <IconButton
                        icon={Trash2}
                        label={"Delete"}
                        onClick={() => handleDelete(offer.id, offer)}
                        className="p-2.5 rounded-lg bg-red-100 text-red-600"
                        disabled={deleting && deleteOfferId === offer.id}
                        loading={deleting && deleteOfferId === offer.id}
                      />
                    </>
                  )) : "-"}
                  </div>
                </Cell>
              </motion.div>
            );
          })}
        </div>
      </div>
      {!showBrandTimeline && <SummaryCard
        data={currentOffers}
        type={"offers"}
        websiteKey={"website"}
        amountKey={"our_offer_c"}
      >
        <button
          disabled={currentOffers.length === 0 || editingIds.length > 0}
          onClick={() => handlePreview()}
          className={`flex-1 py-3 rounded-xl font-medium text-white transition
          ${currentOffers.length === 0 || editingIds.length > 0
              ? "bg-gray-300"
              : "bg-indigo-600 hover:bg-indigo-700"
            }`}
        >
          Preview
        </button>
      </SummaryCard>}
      {/* 🔥 SUMMARY */}

    </div>
  );
}
