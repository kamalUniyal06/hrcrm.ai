import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import Avatar from "../Avatar";
import LoadingSkeleton from "../LoadingSkeleton";
import TimelineEvent from "../TimelineEvent";
import MailerSummaryHeader from "../MailerSummaryHeader";
import ContactHeader from "../ContactHeader";
import { NoSearchFoundPage } from "../NoSearchFoundPage";

import MessageModal from "../MessageModal";
import LatestMessage from "../LatestMessage";
import { useTimeline } from "../../context/TimelineContext";
import { useTimelineLoading } from "../../hooks/useTimelineLoading";
import { useInfiniteLedger } from "../../queries/ledger.queries";
export function TimelinePage() {
  const [showAvatar, setShowAvatar] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const { isTimelineLoading, emailsLoading, ledgerLoading } = useTimelineLoading()
  const [showMessageModal, setShowMessageModal] = useState(false);
  const summaryColumnRef = useRef(null);
  const [summaryColumnHeight, setSummaryColumnHeight] = useState(null);
  const { currentEmail } = useTimeline()
  const { data } = useInfiniteLedger(currentEmail);
  const ladger =
    data?.pages?.flatMap(
      (page) => page.data || []
    ) ?? [];

  const handleMessageClick = (id) => {
    console.log("Message clicked:", id);
    setSelectedMessage(id);
    setShowMessageModal(true);
  };
  const { viewEmail, threadId, count, contactInfo, } = useSelector(
    (state) => state.viewEmail,
  );

  useEffect(() => {
    const summaryColumn = summaryColumnRef.current;
    if (!summaryColumn) return;

    const updateHeight = () => {
      setSummaryColumnHeight(Math.ceil(summaryColumn.getBoundingClientRect().height));
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(summaryColumn);

    return () => observer.disconnect();
  }, [isTimelineLoading]);
  if ((!ledgerLoading && !emailsLoading && (((Array.isArray(ladger) && ladger.length == 0) || !ladger)))) {
    return <NoSearchFoundPage />;
  }


  return (
    <>
      <MessageModal
        showMessageModal={showMessageModal}
        closeMessageModal={() => setShowMessageModal(false)}
        messageId={selectedMessage}
        email={contactInfo?.email1}
        threadId={threadId}
        viewEmail={viewEmail}
        count={count}
      />

      <div className="min-h-[400px] p-0">
        {(isTimelineLoading) ? <LoadingSkeleton /> : <>
          <div className="flex flex-col gap-4">
            <ContactHeader />

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)] gap-4 items-start pb-10">
              <div
                className="min-w-0 bg-white border border-sky-200 rounded-xl shadow-sm overflow-hidden xl:h-[var(--timeline-height)] xl:min-h-0 custom-scrollbar"
                style={summaryColumnHeight ? { "--timeline-height": `${summaryColumnHeight}px` } : undefined}
              >
                <TimelineEvent handleMessageClick={handleMessageClick} />
              </div>

              <aside ref={summaryColumnRef} className="min-w-0 flex flex-col gap-4">
                <LatestMessage handleMessageClick={handleMessageClick} />
                <MailerSummaryHeader />
              </aside>
            </div>
          </div>

        </>}

      </div>

      {showAvatar && <Avatar setShowAvatar={setShowAvatar} onPlay={true} />}
    </>
  );
}

export default TimelinePage;
