import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Pencil, Trash2, Timer } from "lucide-react";
import SummaryCard from "../../SummaryCard";
import PageHeader from "../../PageHeader";
import { buildTable } from "../../Preview";
import { useThreadContext } from "../../../hooks/useThreadContext";
import { toast } from "react-toastify";
import { Save, Send, X, Loader2 } from "lucide-react";
import IconButton from "../../ui/Buttons/IconButton";
import {
  dealsAction,
  deleteDeal,
  updateDeal,
} from "../../../store/Slices/deals";
import { extractEmail } from "../../../assets/assets";
import { useTemplateByName } from "../../../queries/template.queries";
import { useContact } from "../../../queries/contact.queries";
import { useOffersByEmail } from "../../../queries/offers.queries";
import { dealKeys, useDealsByEmail } from "../../../queries/deals.queries";
import { queryClient } from "../../../lib/queryClient";
import { useWebsites } from "../../../queries/web.queries";
import Cell from "../../ui/table/RecordCell";

export default function ThreadDeals({ email, id }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [send, setSend] = useState(false);
  const { data } = useContact(email)
  const threadId = data?.contact?.thread_id
  const [currentDeals, setCurrentDeals] = useState([]);
  const [selectedDeals, setSelectedDeals] = useState([]);
  const [editingIds, setEditingIds] = useState([]);
  const [editDataMap, setEditDataMap] = useState({});

  const { data: webSitesData } = useWebsites();
  const websiteLists = webSitesData?.data ?? [];
  const { showBrandTimeline, contacts } = useSelector((state) => state.brandTimeline);

  const { deleting, updating, message, error, deleteDealId } = useSelector((state) => state.deals);
  const { data: dealsData, isPending: dealsLoading, isError: dealsError } = useDealsByEmail(email);
  const { data: offersData, isPending: offersLoading, isError: offersError } = useOffersByEmail(email);
  const { handleMove } = useThreadContext();

  const [validWebsite, setValidWebsite] = useState({});

  // 🔥 TEMPLATE FETCH
  const { data: templateData } = useTemplateByName("DealORG");

  useEffect(() => {
    const currentOffers = offersData?.data ?? [];
    const currentDeals = dealsData?.data ?? [];
    const valid = {}
    const currentContacts = showBrandTimeline ? contacts : [{ email1: email }]
    currentContacts.forEach(contact => {
      let threadOffers = showBrandTimeline ? currentOffers.filter(offer => extractEmail(offer?.real_name ?? offer.email_c) == contact?.email1) : currentOffers
      let threadDeals = showBrandTimeline ? currentDeals.filter(deal => extractEmail(deal?.real_name ?? deal.email) == contact?.email1) : currentDeals
      return valid[contact?.email1] = websiteLists.filter((w) => {
        const usedInOffers = threadOffers.some((o) => o.website === w);
        const usedInDeals = threadDeals.some((d) => d.website_c === w && !editingIds.includes(d.id));
        return !usedInOffers && !usedInDeals;
      });
    })
    let activeDeals = id ? currentDeals.filter((o) => o.id == id) : currentDeals.filter((o) => o?.status == "active");
    setValidWebsite(valid);
    setCurrentDeals(activeDeals);
  }, [offersData, dealsData, editingIds, email, id]);
  const toggleSelect = (id) => {
    setSelectedDeals((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
    if (editingIds.length > 0) {
      if (!selectedDeals.includes(id)) {
        const selectedData = currentDeals.find(o => o.id == id);

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
    if (selectedDeals.length === currentDeals.length) {
      setSelectedDeals([]);
      setEditingIds([]);
      setEditDataMap({});
    } else {
      setSelectedDeals(currentDeals.map((d) => d.id));
    }
  };
  // 🔥 INLINE EDIT HANDLERS
  const handleEdit = (deals) => {
    const ids = deals.map((d) => d.id);

    const map = {};
    deals.forEach((d) => {
      map[d.id] = { ...d };
    });

    setEditingIds(ids);
    setEditDataMap(map);
  };
  const handleSave = (deals, isSend = false) => {
    setSend(isSend); // 🔥 track intent
    dispatch(updateDeal({ deals }));
  };

  const handleDelete = (deal, id) => {
    dispatch(deleteDeal(deal, id));
  };

  const handleCreate = (itemEmail) => {
    navigate(`/deals/create?email=${itemEmail}`);
  };

  const handlePreview = (dealsData = currentDeals) => {
    let html = templateData?.[0]?.body_html || "";

    const tableHtml = buildTable(dealsData, "Deals", "website_c", "dealamount");
    const email = extractEmail(dealsData[0]?.real_name ?? dealsData[0]?.email)

    html = html
      .replace("{{USER_EMAIL}}", email)
      .replace("{{TABLE}}", tableHtml);
    const itemThreadId = showBrandTimeline ? contacts.find(contact => contact.email1 == email)?.thread_id : threadId
    handleMove({ email, threadId: itemThreadId, reply: html });
  };
  useEffect(() => {
    if (!updating) {
      setEditingIds([]);
      setSelectedDeals([]);
      setEditDataMap({});
    }

    if (message) {
      queryClient.invalidateQueries({ queryKey: dealKeys.all })
      toast.success(message);
      if (message?.includes("Updated")) {
        if (send) {
          handlePreview(editingIds.map(id => editDataMap[id]));
          setSend(false);
        }
      }

      dispatch(dealsAction.clearAllMessages());
    }

    if (error) {
      toast.error(error);
      setSend(false); // reset on error too
      dispatch(dealsAction.clearAllErrors());
    }
  }, [updating, message, error]);

  const isMultiEditValid = editingIds.every(id => {
    const data = editDataMap[id];
    return (
      data.dealamount === "" ||
      data.dealamount === null ||
      Number(data.dealamount) <= 0
    );
  });
  return (
    /* Stacks until `lg`, which is where SummaryCard switches to its fixed
       `lg:w-80`. Side by side any earlier and the card — `w-full` plus
       `shrink-0` — claims the whole row and squeezes the table to nothing. */
    <div className="w-full flex flex-col gap-4 lg:flex-row lg:gap-6 lg:items-start">
      {/* 🔥 TABLE */}
      <div className="min-w-0 flex-1 relative border rounded-2xl p-3 sm:p-6 bg-white shadow-sm">
        <PageHeader title={"DEALS"} onAdd={() => handleCreate(email)} />
        {dealsLoading && (
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
        {dealsError && (
          <div className="py-8 text-center text-red-500">
            Failed to load deals
          </div>
        )}
        {selectedDeals.length > 0 && (
          <div className="mb-4 flex flex-wrap justify-end gap-2 sm:gap-3">

            {editingIds.length > 0 ? (
              <>
                <IconButton
                  icon={Save}
                  label="Save"
                  className="bg-blue-100 hover:bg-blue-200"
                  loading={updating && !send}
                  disabled={isMultiEditValid}

                  onClick={() =>
                    handleSave(editingIds.map(id => editDataMap[id]), false)
                  }
                />

                <IconButton
                  icon={Send}
                  label="Save & Send"
                  className="bg-green-100 hover:bg-green-200"
                  loading={updating && send}
                  disabled={isMultiEditValid}

                  onClick={() =>
                    handleSave(editingIds.map(id => editDataMap[id]), true)
                  }
                />

                <IconButton
                  icon={X}
                  label="Cancel"
                  className="bg-red-100 hover:bg-red-200"

                  onClick={() => {
                    setEditingIds([]);
                    setEditDataMap({});
                  }}
                />
              </>
            ) : (
              <>
                <IconButton
                  icon={Pencil}
                  label="Edit"
                  onClick={() =>
                    handleEdit(
                      currentDeals.filter(d =>
                        selectedDeals.includes(d.id)
                      )
                    )
                  }
                  className="bg-blue-100 hover:bg-blue-200"

                />
                <IconButton
                  icon={Send}
                  label="Send"
                  onClick={() =>
                    handlePreview(
                      currentDeals.filter(d =>
                        selectedDeals.includes(d.id)
                      )
                    )
                  }
                  className="bg-green-100 hover:bg-green-200"

                />
                <IconButton
                  icon={Trash2}
                  label="Delete"
                  onClick={() => {
                    selectedDeals.forEach(id => {
                      const deal = currentDeals.find(d => d.id === id);
                      handleDelete(deal, id);
                    });
                  }}
                  className="bg-red-100 hover:bg-red-200"

                />


              </>
            )}

          </div>
        )}
        {/* HEADER — grid only from `lg`; the stacked cards label themselves */}
        <div className={`hidden lg:grid ${showBrandTimeline ? "lg:grid-cols-13" : "lg:grid-cols-12"} px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b`}>
          {!showBrandTimeline && <div onClick={handleSelectAll} className="col-span-1 cursor-pointer ">
            <input
              type="checkbox"
              checked={selectedDeals.length === currentDeals.length}

            />
          </div>}
          <div className="col-span-2">Created At</div>
          <div className="col-span-3">Website</div>
          {showBrandTimeline && <div className="col-span-2">Email</div>}
          <div className="col-span-2 text-center">Deal Amount</div>
          <div className="col-span-2 text-center">Note</div>
          <div className="col-span-2 text-center ml-auto">Actions</div>
        </div>

        {/* SELECT ALL — the header checkbox is hidden below `lg` */}
        {!showBrandTimeline && currentDeals.length > 0 && (
          <button
            type="button"
            onClick={handleSelectAll}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-1 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden"
          >
            <input
              type="checkbox"
              readOnly
              checked={selectedDeals.length === currentDeals.length}
            />
            Select all
          </button>
        )}

        {/* ROWS */}
        <div className="space-y-2 mt-2">
          {currentDeals.length === 0 && (
            <div className="text-center text-gray-400 py-6">No Deal found</div>
          )}

          {currentDeals.map((deal) => {
            const isEditing = editingIds.includes(deal.id);
            const editData = editDataMap[deal.id] || {};
            const itemEmail = showBrandTimeline ? extractEmail(deal.real_name ?? deal.email) : email
            const itemThreadId = showBrandTimeline ? contacts.find(contact => contact.email1 == itemEmail)?.thread_id : threadId
            return (
              <motion.div
                key={deal.id}
                className={`flex flex-col gap-2 px-3 py-3 bg-gray-50 rounded-xl border lg:grid ${showBrandTimeline ? "lg:grid-cols-13" : "lg:grid-cols-12"} lg:items-center lg:gap-0 lg:px-4`}
              >
                {!showBrandTimeline && <div onClick={() => toggleSelect(deal.id)}
                  className="flex items-center gap-2 font-semibold text-gray-500 cursor-pointer lg:col-span-1 lg:block">
                  <input
                    type="checkbox"
                    checked={selectedDeals.includes(deal.id)}
                    readOnly
                  />
                  <span className="text-xs uppercase tracking-wide lg:hidden">Select</span>
                </div>}
                <Cell label="Created At" className="lg:col-span-2">
                  <div className="flex min-w-0 gap-1 items-center">
                    <Timer size={16} className="shrink-0" />
                    <span className="truncate">{deal.date_entered || "-"}</span>
                  </div>
                </Cell>
                {/* Website */}
                <Cell label="Website" className="min-w-0 lg:col-span-3">
                  {isEditing ? (
                    <select
                      value={editData.website_c}
                      onChange={(e) =>
                        setEditDataMap(prev => ({
                          ...prev,
                          [deal.id]: {
                            ...prev[deal.id],
                            website_c: e.target.value,
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
                    <span title={deal.website_c} className="min-w-0 text-blue-600 truncate block">
                      {deal.website_c}
                    </span>
                  )}
                </Cell>
                {showBrandTimeline && (
                  <Cell label="Email" className="min-w-0 lg:col-span-2">
                    <span title={itemEmail} className="min-w-0 truncate block">{itemEmail}</span>
                  </Cell>
                )}
                {/* Deal Amount */}
                <Cell label="Deal Amount" className="lg:col-span-2 lg:text-center">
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.dealamount}
                      min={1}
                      onChange={(e) =>
                        setEditDataMap(prev => ({
                          ...prev,
                          [deal.id]: {
                            ...prev[deal.id],
                            dealamount: e.target.value,
                          }
                        }))
                      }
                      className="w-20 border rounded px-2 py-1 text-center"
                    />
                  ) : (
                    <span>${deal.dealamount || "-"}</span>
                  )}
                </Cell>

                {/* Note */}
                <Cell label="Note" className="min-w-0 lg:col-span-2 lg:text-center">
                  {isEditing ? (
                    <input
                      type="textarea"
                      value={editData.note}
                      onChange={(e) =>
                        setEditDataMap(prev => ({
                          ...prev,
                          [deal.id]: {
                            ...prev[deal.id],
                            note: e.target.value,
                          }
                        }))
                      }
                      className="w-20 border rounded px-2 py-1 text-center"
                    />
                  ) : (
                    <span title={deal.note || undefined} className="min-w-0 truncate block text-green-600">{deal.note || "-"}</span>
                  )}
                </Cell>

                {/* Actions */}
                <Cell
                  label="Actions"
                  className="border-t border-gray-200 pt-2 lg:col-span-2 lg:border-0 lg:pt-0 lg:ml-auto"
                >
                  <div className="flex flex-wrap justify-end gap-2 lg:justify-center">
                  {selectedDeals.length == 0 ? (isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      <IconButton
                        icon={Save}
                        label="Save"
                        disabled={isMultiEditValid}
                        loading={editingIds.includes(deal.id) && updating && !send}
                        onClick={() => handleSave([editData], false)}
                      />

                      <IconButton
                        icon={Send}
                        label="Save & Send"
                        disabled={isMultiEditValid}
                        loading={editingIds.includes(deal.id) && updating && send}
                        onClick={() => handleSave([editData], true)}
                      />

                      <IconButton
                        icon={X}
                        label="Cancel"
                        onClick={() => setEditingIds([])}
                        className="bg-red-100 hover:bg-red-200"
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
                        onClick={() => handleEdit([deal])}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-600"
                        icon={Pencil}
                        label={"Edit"}
                      />
                      <IconButton
                        icon={Trash2}
                        label={"Delete"}
                        onClick={() => handleDelete(deal, deal.id)}
                        className="p-2.5 rounded-lg bg-red-100 text-red-600"
                        disabled={deleting && deleteDealId === deal.id}
                        loading={deleting && deleteDealId === deal.id}
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

      {/* 🔥 SUMMARY */}
      {!showBrandTimeline && <SummaryCard
        data={currentDeals}
        type={"deals"}
        websiteKey={"website_c"}
        amountKey={"dealamount"}
      >
        <button
          disabled={currentDeals.length === 0 || editingIds.length > 0}
          onClick={() => handlePreview()}
          className={`flex-1 py-3 rounded-xl font-medium text-white transition
          ${currentDeals.length === 0 || editingIds.length > 0
              ? "bg-gray-300"
              : "bg-indigo-600 hover:bg-indigo-700"
            }`}
        >
          Preview
        </button>
      </SummaryCard>}

    </div>
  );
}
