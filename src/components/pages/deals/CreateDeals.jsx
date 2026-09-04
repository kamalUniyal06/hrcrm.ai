import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import SummaryCard from "../../SummaryCard";
import PageHeader from "../../PageHeader";
import { buildTable } from "../../Preview";
import { useThreadContext } from "../../../hooks/useThreadContext";
import { Trash2 } from "lucide-react";
import { Save, Send } from "lucide-react";
import IconButton from "../../ui/Buttons/IconButton";
import { toast } from "react-toastify";
import { createDeal, dealsAction } from "../../../store/Slices/deals";
import { offerKeys, useOffersByEmail } from "../../../queries/offers.queries";
import { useTemplateByName } from "../../../queries/template.queries";
import { dealKeys, useDealsByEmail } from "../../../queries/deals.queries";
import { useContact } from "../../../queries/contact.queries";
import { queryClient } from "../../../lib/queryClient";
import { useWebsites } from "../../../queries/web.queries";
import Cell from "../../ui/table/RecordCell";

// 🔥 renamed component also
export default function CreateDeals({ email }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { data: webSitesData } = useWebsites();
  const websiteLists = webSitesData?.data ?? []
  // 🔥 now using deals everywhere
  const { creating, message, error } = useSelector(
    (state) => state.deals,
  );
  const { data: dealsData } = useDealsByEmail(email)
  const { data: contactData } = useContact(email)
  const threadId = contactData?.contact?.thread_id
  const deals = dealsData?.data ?? []
  const { data: offerData } = useOffersByEmail(email);
  const offers = offerData?.data ?? []

  const [send, setSend] = useState(false);
  const { handleMove } = useThreadContext();

  const { data: templateData } = useTemplateByName("DealORG");
  // 🔥 NEW STATE (deal structure)
  const [newDeals, setNewDeals] = useState([{ website_c: "", dealamount: "" }]);

  const [validWebsite, setValidWebsite] = useState([]);

  const getAvailableWebsites = (currentIndex) => {
    return validWebsite.filter((site) => {
      return !newDeals.some(
        (deal, i) => i !== currentIndex && deal.website_c === site,
      );
    });
  };

  // 🔥 FILTER VALID WEBSITES
  useEffect(() => {
    const valid = websiteLists.filter((w) => {
      const usedInDeals = deals.some((d) => d.website_c === w && d?.status !== "expire");

      return !usedInDeals;
    });
    setValidWebsite(valid);
  }, [offers, deals, email]);

  // 🔥 HANDLERS
  const handleAddRow = () => {
    setNewDeals([...newDeals, { website_c: "", dealamount: "" }]);
  };

  const isFormValid =
    newDeals.length > 0 &&
    newDeals.every((deal) => deal.website_c && !(deal.dealamount === "" ||
      deal.dealamount === null ||
      Number(deal.dealamount) <= 0));

  const canAddRow = isFormValid;

  const handleChangeRow = (index, field, value) => {
    const updated = [...newDeals];
    updated[index][field] = value;
    setNewDeals(updated);
  };

  const handleRemoveRow = (index) => {
    setNewDeals(newDeals.filter((_, i) => i !== index));
  };

  // 🔥 SAVE DEAL
  const handleSave = async (isSend = false) => {
    setSend(isSend);

    dispatch(createDeal({ threadId, email, deals: newDeals, isSend, contactId: contactData?.contact?.id }));
  };

  const handlePreview = () => {
    let html = templateData?.[0]?.body_html || "";

    const tableHtml = buildTable(newDeals, "Deals", "website_c", "dealamount");

    html = html
      .replace("{{USER_EMAIL}}", email)
      .replace("{{TABLE}}", tableHtml);

    handleMove({ email, threadId, reply: html });
  };

  useEffect(() => {
    if (message) {
      toast.success(message);
      queryClient.invalidateQueries({
        queryKey: dealKeys.all,
      });

      queryClient.invalidateQueries({
        queryKey: offerKeys.all,
      });
      if (message?.includes("Created")) {
        if (send) {
          setSend(false);
          dispatch(dealsAction.clearAllMessages());
          handlePreview();
        } else {
          navigate(-1);
          dispatch(dealsAction.clearAllMessages());
        }
      }
    }

    if (error) {
      toast.error(error);
      setSend(false);
      dispatch(dealsAction.clearAllErrors());
    }
  }, [message, error]);
  useEffect(() => {
    const currentOfferWithoutDeal = offers.filter((o) => {
      const isSameThread = (o.name == email && o.offer_status !== "expired");

      // ✅ check against ALL deals (not only active)
      const alreadyHasDeal = deals.some(
        (d) => d.email == email && d.website_c == o.website,
      );

      return isSameThread && !alreadyHasDeal;
    });

    if (currentOfferWithoutDeal?.length > 0) {
      const newDeals = currentOfferWithoutDeal.map((offer) => ({
        website_c: offer.website,
        dealamount: offer.our_offer_c,
      }));

      setNewDeals(newDeals);
    }
  }, [deals, offers, email]);
  return (
    /* Stacks until `lg`, matching SummaryCard's `lg:w-80`. Side by side any
       earlier and the card — `w-full` plus `shrink-0` — takes the whole row. */
    <div className="w-full flex flex-col gap-4 lg:flex-row lg:gap-6 lg:items-start">
      {/* LEFT SIDE */}
      <div className="min-w-0 flex-1 border rounded-2xl p-3 sm:p-6 bg-white shadow-sm">
        <PageHeader title={"Create Deals"} showAdd={false} />

        {/* HEADER — grid only from `lg`; the stacked cards label themselves */}
        <div className="hidden lg:grid lg:grid-cols-8 px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b">
          <div className="col-span-3">Website</div>
          <div className="col-span-3 text-center">Deal Amount</div>
          <div className="col-span-1 text-center ml-auto">Action</div>
        </div>

        {/* ROWS */}
        <div className="space-y-2 mt-2">
          {newDeals.map((row, index) => (
            <motion.div
              key={index}
              className="flex flex-col gap-2 px-3 py-3 bg-gray-50 rounded-xl border lg:grid lg:grid-cols-8 lg:items-center lg:gap-0 lg:px-4"
            >

              {/* WEBSITE */}
              <Cell label="Website" className="min-w-0 lg:col-span-3 lg:relative">
                <select
                  value={row.website_c}
                  onChange={(e) =>
                    handleChangeRow(index, "website_c", e.target.value)
                  }
                  className="min-w-0 max-w-full border rounded-lg px-2 py-1 lg:w-full"
                >
                  <option value="">Select</option>
                  {getAvailableWebsites(index).map((site, i) => (
                    <option key={i} value={site}>
                      {site}
                    </option>
                  ))}
                </select>
              </Cell>

              {/* DEAL AMOUNT */}
              <Cell label="Deal Amount" className="lg:col-span-3 lg:text-center">
                <input
                  type="number"
                  value={row.dealamount}
                  min={1}
                  onChange={(e) =>
                    handleChangeRow(index, "dealamount", e.target.value)
                  }
                  className="w-24 border rounded px-2 py-1 text-center"
                />
              </Cell>

              {/* DELETE */}
              <Cell
                label="Action"
                className="border-t border-gray-200 pt-2 lg:col-span-1 lg:border-0 lg:pt-0 lg:ml-auto lg:text-center"
              >
                <button
                  onClick={() => handleRemoveRow(index)}
                  aria-label="Remove deal row"
                  className="text-red-500 cursor-pointer"
                >
                  <Trash2 />
                </button>
              </Cell>
            </motion.div>
          ))}
        </div>

        {/* ADD */}
        <button
          onClick={handleAddRow}
          disabled={!canAddRow}
          className={`mt-4 px-4 py-2 rounded-lg
      ${canAddRow ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
        >
          + Add Deal
        </button>
      </div>

      {/* SUMMARY */}
      <SummaryCard
        data={newDeals}
        type={"deals"}
        websiteKey={"website_c"}
        amountKey={"dealamount"}
      >
        <div className="flex gap-2 w-full justify-evenly">
          <IconButton
            icon={Save}
            label="Save"
            onClick={() => handleSave(false)}
            loading={creating && !send}
            disabled={!isFormValid}
          />

          <IconButton
            icon={Send}
            label="Save & Send"
            onClick={() => handleSave(true)}
            loading={creating && send}
            disabled={!isFormValid}
          />
        </div>
      </SummaryCard>
    </div>
  );
}
