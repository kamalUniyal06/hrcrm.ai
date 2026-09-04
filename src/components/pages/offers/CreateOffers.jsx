import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import SummaryCard from "../../SummaryCard";
import PageHeader from "../../PageHeader";
import { buildTable } from "../../Preview";
import { useThreadContext } from "../../../hooks/useThreadContext";
import { Trash2 } from "lucide-react";
import { Save, Send } from "lucide-react";
import IconButton from "../../ui/Buttons/IconButton";

import {
  createOffer,
  offersAction,
} from "../../../store/Slices/offers";
import { toast } from "react-toastify";
import { extractEmail } from "../../../assets/assets";
import { useDealsByEmail } from "../../../queries/deals.queries";
import { offerKeys, useOffersByEmail } from "../../../queries/offers.queries";
import { useTemplateByName } from "../../../queries/template.queries";
import { queryClient } from "../../../lib/queryClient";
import { useWebsites } from "../../../queries/web.queries";
import { useContact } from "../../../queries/contact.queries";
import Cell from "../../ui/table/RecordCell";

export default function CreateOffers({ email }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data: contactData } = useContact(email)
  const threadId = contactData?.contact?.thread_id
  const { data: webSitesData } = useWebsites();
  const websiteLists = webSitesData?.data ?? [];
  const { creating, message, error } = useSelector(
    (state) => state.offers,
  );
  const { data: dealsData, isPending: dealsLoading, isError: dealsError } = useDealsByEmail(email);
  const { data: offersData, isPending: offersLoading, isError: offersError } = useOffersByEmail(email);
  const offers = offersData?.data ?? []
  const deals = dealsData?.data ?? []
  const [send, setSend] = useState(false);
  const { handleMove } = useThreadContext();
  const { data: templateData } = useTemplateByName("OfferORG");
  const [newOffers, setNewOffers] = useState([
    { website: "", client_offer_c: "", our_offer_c: "" },
  ]);

  const [validWebsite, setValidWebsite] = useState([]);
  const getAvailableWebsites = (currentIndex) => {
    return validWebsite.filter((site) => {
      return !newOffers.some(
        (offer, i) => i !== currentIndex && offer.website === site,
      );
    });
  };
  // 🔥 FILTER VALID WEBSITES
  useEffect(() => {
    const threadOffers = offers.filter(
      (d) => extractEmail(d.real_name ?? d.email) == email,
    );

    const threadDeals = deals.filter(
      (d) => extractEmail(d.real_name ?? d.email) == email,
    );

    const valid = websiteLists.filter((w) => {
      const usedInOffers = threadOffers.some((o) => o.website === w && o.offer_status != "expired");
      const usedInDeals = threadDeals.some((d) => d.website_c === w);

      return !usedInOffers && !usedInDeals;
    });

    setValidWebsite(valid);
  }, [offers, deals, email]);

  // 🔥 HANDLERS
  const handleAddRow = () => {
    setNewOffers([
      ...newOffers,
      { website: "", client_offer_c: "", our_offer_c: "" },
    ]);
  };
  const isFormValid =
    newOffers.length > 0 &&
    newOffers.every(
      (offer) =>
        offer.website &&
        Number(offer.client_offer_c) >= 0 &&
        Number(offer.our_offer_c) > 0
    );

  const canAddRow = newOffers.every(
    (offer) =>
      offer.website &&
      Number(offer.client_offer_c) >= 0 &&
      Number(offer.our_offer_c) > 0
  );

  const handleChangeRow = (index, field, value) => {
    const updated = [...newOffers];
    updated[index][field] = value;
    setNewOffers(updated);
  };

  const handleRemoveRow = (index) => {
    setNewOffers(newOffers.filter((_, i) => i !== index));
  };

  const handleSave = async (isSend = false) => {
    setSend(isSend);

    dispatch(createOffer({ threadId, email, offers: newOffers, isSend }));
  };

  const handlePreview = () => {
    let html = templateData?.[0]?.body_html || "";

    const tableHtml = buildTable(newOffers, "Offers", "website", "our_offer_c");

    html = html
      .replace("{{USER_EMAIL}}", email)
      .replace("{{TABLE}}", tableHtml);

    handleMove({ email, threadId, reply: html });
  };
  useEffect(() => {
    if (message) {
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: offerKeys.all })

      if (message?.includes("Created")) {
        if (send) {
          setSend(false);
          dispatch(offersAction.clearAllMessages());
          handlePreview();
        } else {
          navigate(-1);
          dispatch(offersAction.clearAllMessages());
        }
      }
    }

    if (error) {
      toast.error(error);
      setSend(false); // reset on error too
      dispatch(offersAction.clearAllErrors());
    }
  }, [message, error]);
  return (
    /* Stacks until `lg`, matching SummaryCard's `lg:w-80`. Side by side any
       earlier and the card — `w-full` plus `shrink-0` — takes the whole row. */
    <div className="w-full flex flex-col gap-4 lg:flex-row lg:gap-6 lg:items-start">
      {/* 🔥 LEFT SIDE (TABLE) */}
      <div className="min-w-0 flex-1 border rounded-2xl p-3 sm:p-6 bg-white shadow-sm">
        <PageHeader title={"Create Offers"} showAdd={false} />

        {/* HEADER — grid only from `lg`; the stacked cards label themselves */}
        <div className="hidden lg:grid lg:grid-cols-10 px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b">
          <div className="col-span-3">Website</div>
          <div className="col-span-2 text-center">Client Offer</div>
          <div className="col-span-2 text-center">Our Offer</div>
          <div className="col-span-2 text-center ml-auto">Action</div>
        </div>

        {/* ROWS */}
        <div className="space-y-2 mt-2">
          {newOffers.map((row, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-2 px-3 py-3 bg-gray-50 rounded-xl border lg:grid lg:grid-cols-10 lg:items-center lg:gap-0 lg:px-4"
            >

              <Cell label="Website" className="min-w-0 lg:col-span-3 lg:relative">
                <select
                  value={row.website}
                  onChange={(e) =>
                    handleChangeRow(index, "website", e.target.value)
                  }
                  className="min-w-0 max-w-full border rounded-lg px-2 py-1 lg:w-full lg:pr-10"
                >
                  <option value="">Select</option>

                  {getAvailableWebsites(index).map((site, i) => (
                    <option key={i} value={site}>
                      {site}
                    </option>
                  ))}
                </select>
              </Cell>

              <Cell label="Client Offer" className="lg:col-span-2 lg:text-center">
                <input
                  type="number"
                  value={row.client_offer_c}
                  min={1}
                  onChange={(e) =>
                    handleChangeRow(index, "client_offer_c", e.target.value)
                  }
                  className="w-20 border rounded px-2 py-1 text-center"
                />
              </Cell>

              <Cell label="Our Offer" className="lg:col-span-2 lg:text-center">
                <input
                  type="number"
                  min={1}
                  value={row.our_offer_c}
                  onChange={(e) =>
                    handleChangeRow(index, "our_offer_c", e.target.value)
                  }
                  className="w-20 border rounded px-2 py-1 text-center"
                />
              </Cell>

              <Cell
                label="Action"
                className="border-t border-gray-200 pt-2 lg:col-span-2 lg:border-0 lg:pt-0 lg:ml-auto lg:text-center"
              >
                <button
                  onClick={() => handleRemoveRow(index)}
                  aria-label="Remove offer row"
                  className="text-red-500"
                >
                  <Trash2 />
                </button>
              </Cell>
            </motion.div>
          ))}
        </div>

        {/* ADD ROW */}
        <button
          onClick={handleAddRow}
          disabled={!canAddRow}
          className={`mt-4 px-4 py-2 rounded-lg
    ${canAddRow ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-400 cursor-not-allowed"}
  `}
        >
          + Add Offer
        </button>
      </div>

      {/* 🔥 RIGHT SIDE (SUMMARY) */}
      <SummaryCard
        data={newOffers}
        type={"offers"}
        websiteKey={"website"}
        amountKey={"our_offer_c"}
      >
        <div className="flex gap-2 w-full justify-evenly ">
          <IconButton
            icon={Save}
            label="Save"
            onClick={() => handleSave(false)}
            loading={creating && !send}
            disabled={!isFormValid}
            className={`bg-green-100 hover:bg-green-200 
      ${!isFormValid ? "opacity-50 cursor-not-allowed" : ""}`}
          />

          <IconButton
            icon={Send}
            label="Save & Send"
            onClick={() => handleSave(true)}
            loading={creating && send}
            disabled={!isFormValid}
            className={`bg-indigo-100 hover:bg-indigo-200 
      ${!isFormValid ? "opacity-50 cursor-not-allowed" : ""}`}
          />
        </div>
      </SummaryCard>
    </div>
  );
}
