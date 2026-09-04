import {
  Globe,
  Mail,
  Heart,
  Link,
  CircleStop,
  NotebookPen,
  UserSquare,
  Send,
} from "lucide-react";
import Loading, { LoadingChase } from "./Loading";
import UserDropdown from "./UserDropDown";
import MoveToDropdown from "./MoveToDropdown";
import { useDispatch, useSelector } from "react-redux";
import {
  forwardEmail,
  forwardedAction,
} from "../store/Slices/forwardedEmailSlice";
import { toast } from "react-toastify";
import { useContext, useEffect, useState, useRef, useMemo } from "react";
import { linkExchange, linkExchangeaction } from "../store/Slices/linkExchange";
import { MdOutlineHome } from "react-icons/md";
import { viewEmailAction } from "../store/Slices/viewEmail";
import { useNavigate } from "react-router-dom";
import {
  applyHashtag,
  getCurrentUser,
  getRighteeUsers,
  updateActivity,
} from "../services/utils";
import { fetchGpc } from "../services/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import IconButton from "./ui/Buttons/IconButton";
import { useMarkTags } from "../queries/markTag.queries";
import CustomDropdown from "./ui/CustomDropdown";
import { useTimeline } from "../context/TimelineContext";
import { contactKeys, useContact } from "../queries/contact.queries";
import { queryClient } from "../lib/queryClient";
import { forwardedKeys } from "../queries/forwarded.queries";
import {
  marketPlaceKeys,
  useAddMarketPlace,
  useDelMarketPlace,
  useMarketPlace,
} from "../queries/marketplace.queries";
import { toggleFav } from "../api/contact.api";
import { movedEmailsKeys } from "../queries/movedEmail.queries";
import { useInfiniteTags } from "../queries/tag.queries";
/* Memo numbers from CRM */
const MEMO = {
  marketplace: 1,
  favourite: 4,
  assign: 5,
  linkexchange: 6,
  stopfutureemails: 7,
};

/* Separator */
const Separator = () => <div className="h-6 w-[1px] bg-gray-600 mx-2" />;

const ActionButton = () => {
  const dispatch = useDispatch();

  const [showUsers, setShowUsers] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [note, setNote] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const { isPending, data } = useQuery({
    queryKey: ["righteeUsers"],
    queryFn: getRighteeUsers,
  });
  const { data: tagsData, isPending: tagLoading } = useMarkTags();
  const tags = tagsData?.records ?? [];

  const { mutate, isPending: sendingNote } = useMutation({
    mutationFn: async () => {
      const notes = `
<b>📝 Note</b><br/><br/>

${note}<br/><br/>

<hr/>

<b>👤 Sent By:</b><br/>
${getCurrentUser()?.name}
(${getCurrentUser()?.description})<br/><br/>

<b>🔗 View:</b><br/>
<a href="https://app.guestpostcrm.com/redirect?email=${email}">
Open Contact
</a>
`;
      const res = await fetchGpc({
        method: "POST",
        params: { type: "team_notes" },
        body: {
          email: selectedUser.email,
          notes: notes,
        },
      });
      return res;
    },
    onSuccess: () => {
      toast.success(`Your Note Is Sent To ${selectedUser?.name} Successfully!`);
      setShowNotes(false);
      setNote("");
      setSelectedUser(null);
    },
    onError: () => {
      toast.error(`Failed To Sent Note`);
    },
  });
  const { mutate: applyTagMutation, isPending: applyTagLoading } = useMutation({
    mutationFn: async ({ tag, method = "GET" }) => {
      const { data } = await fetchGpc({
        method,
        params: { type: "hashtag", email, memo_no: tag, domain: false },
      });
      console.log(data);
      if (data.success) {
        toast.success(
          `Tag ${method == "GET" ? "Applied" : "Removed"} Successfully!`,
        );
      } else {
        toast.error(
          data.message || `Tag ${method == "GET" ? "Failed" : "Failed"} `,
        );
      }
    },
    onSuccess: () => {
      updateActivity(email, "Tag Applied");
      queryClient.invalidateQueries({ queryKey: contactKeys.all });

      setShowTags(false);
    },
  });

  const noteRef = useRef(null);
  const [searchUser, setSearchUser] = useState("");

  const filteredUsers = useMemo(() => {
    if (!searchUser.trim()) return data || [];

    return (data || []).filter((user) =>
      user.name.toLowerCase().includes(searchUser.toLowerCase()),
    );
  }, [searchUser, data]);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showNotes &&
        noteRef.current &&
        !noteRef.current.contains(event.target)
      ) {
        setShowNotes(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotes]);
  const { editMessage, contactLoading } = useSelector((s) => s.viewEmail);
  const { currentEmail } = useTimeline();
  const { data: contactData } = useContact(currentEmail);
  const contactInfo = contactData?.contact;
  const email = contactInfo?.email1;
  const hashtags = contactInfo?.hashtag?.data?.hashtags;
  const threadId = contactInfo?.thread_id;
  const assignedId = contactInfo?.gpc_assigned_to;

  const {
    forward,
    error: forwardError,
    message: forwardMessage,
  } = useSelector((s) => s.forwarded);
  const {
    exchanging,
    error: changeError,
    message: changeMessage,
  } = useSelector((s) => s.linkExchange);
  const {
    favourite,
    error: favouriteError,
    message: favouriteMessage,
  } = useSelector((s) => s.fav);
  const navigate = useNavigate();
  const { isPending: loading, mutate: addToMarket } = useAddMarketPlace();
  const { isPending: removing, mutate: delMarket } = useDelMarketPlace();
  const isMark = Number(contactInfo?.bulk) == 1;
  /* highlight states from contactInfo */
  const isFavActive = contactInfo?.favorite == "1";
  const isExchangeActive = contactInfo?.exchange == "1";

  /* Helper to call applyHashtag util */
  const triggerHashtag = (memo_no, method = "GET") => {
    applyHashtag({
      email: email,
      memo_no,
      method,
    });
  };
  /* side effects */
  useEffect(() => {
    if (forwardError) {
      toast.error(forwardError);
      dispatch(forwardedAction.clearAllErrors());
    }

    if (forwardMessage) {
      toast.success(forwardMessage);
      dispatch(forwardedAction.clearAllMessages());
      queryClient.invalidateQueries({ queryKey: forwardedKeys.all });
    }

    if (changeMessage) {
      toast.success(changeMessage);
      dispatch(linkExchangeaction.clearAllMessages());
    }

    if (changeError) {
      toast.error(changeError);
      dispatch(linkExchangeaction.clearAllErrors());
    }

    if (editMessage) {
      toast.success(editMessage);
      dispatch(viewEmailAction.clearAllMessage());
    }
  }, [
    dispatch,
    forwardError,
    forwardMessage,
    favouriteError,
    favouriteMessage,
    changeError,
    changeMessage,
    editMessage,
  ]);

  const actionButtons = [
    {
      icon: (
        <img
          width="30"
          height="30"
          src="https://img.icons8.com/fluency/48/ip-address.png"
          alt="ip-address"
        />
      ),
      label: "IP",
      disabled: false,
      action: () => navigate("/ip"),
    },
    {
      icon: applyTagLoading ? (
        <LoadingChase />
      ) : (
        <img
          src="https://img.icons8.com/color/48/tags--v1.png"
          className="w-6 h-6"
          alt="tag"
        />
      ),
      label: "Mark Tag",
      disabled: false,

      action: () => {
        setShowTags((p) => !p);
      },
    },

    /* index 2 → MoveToDropdown placeholder */
    {},

    {
      icon: favourite ? (
        <LoadingChase />
      ) : (
        <Heart size={25} color={isFavActive ? "white" : "#dc2626"} />
      ),
      label: "Favourite",
      disabled: favourite,

      active: isFavActive,
      activeProps: {
        color: "#dc2626",
        fill: "#f74050",
      },
      // GET when adding favourite, DELETE when removing
      action: () => {
        toggleFav({ email });
        triggerHashtag(MEMO.favourite, isFavActive ? "DELETE" : "GET");
      },
    },

    {
      icon: forward ? (
        <LoadingChase />
      ) : (
        <img
          src="https://img.icons8.com/color/48/redo.png"
          className="w-6 h-6"
          alt="forward"
        />
      ),
      disabled: forward,

      label: "Assign",
      // hashtag fires inside handleForwardWithHashtag when user picks someone
      action: () => setShowUsers((p) => !p),
    },

    {
      icon: exchanging ? (
        <LoadingChase />
      ) : (
        <Link size={25} color={isExchangeActive ? "white" : "#2563eb"} />
      ),
      label: "Link Exchange",
      disabled: exchanging,

      active: isExchangeActive,
      activeProps: {
        color: "#2563eb",
        fill: "#313cb5",
      },
      // GET when activating link exchange, DELETE when deactivating
      action: () => {
        dispatch(linkExchange({ threadId, email }));
        triggerHashtag(MEMO.linkexchange, isExchangeActive ? "DELETE" : "GET");
      },
    },

    {
      icon:
        loading || removing ? (
          <LoadingChase />
        ) : (
          <MdOutlineHome size={25} color={isMark ? "white" : "#d40d8b"} />
        ),
      label: isMark ? "Remove From MarketPlace" : "Add To MarketPlace",
      active: isMark,
      disabled: loading,

      activeProps: {
        color: "#ea580c",
        fill: "#d40d8b",
      },
      // GET when adding to marketplace, DELETE when removing
      action: () => {
        if (isMark) {
          delMarket({
            email,
            domain:
              contactInfo.type?.toLowerCase() === "brand"
                ? email.split("@")[1]
                : "",
          });
        } else {
          addToMarket({ email, brand: contactInfo.type == "Brand" });
        }
      },
    },

    {
      icon: stopLoading ? (
        <LoadingChase />
      ) : (
        <CircleStop
          size={25}
          color={contactInfo?.is_stop === "1" ? "red" : "#eab308"}
        />
      ),
      disabled: stopLoading,

      label:
        contactInfo?.is_stop === "1" ? "Resume Emails" : "Stop Future Emails",
      // GET when stopping emails, DELETE when resuming
      action: async () => {
        setStopLoading(true);
        const newValue = Number(contactInfo?.is_stop) == 1 ? "0" : "1";
        try {
          const data = await fetchGpc({
            params: {
              type: "force_stop",
              id: contactInfo?.id,
              new_value: newValue,
              user: getCurrentUser().description,
            },
          });
          console.log(data);
          updateActivity(
            email,
            Number(newValue) ? "Email Stopped  " : "Email Resumed ",
          );
          triggerHashtag(
            MEMO.stopfutureemails,
            newValue === "1" ? "GET" : "DELETE",
          );
          queryClient.invalidateQueries({ queryKey: movedEmailsKeys.all });
          toast.success(
            newValue === "1"
              ? "Emails stopped successfully"
              : "Emails resumed successfully",
          );
        } catch (err) {
          toast.error(
            `Failed To ${newValue === "1" ? "Stopped" : "Resumed"} Email `,
          );
        } finally {
          setStopLoading(false);
        }
      },
    },
    {
      icon: <NotebookPen size={25} color="#890993ff" />,
      disabled: false,
      label: "Add Notes",
      action: () => {
        setShowNotes((p) => !p);
      },
    },
  ];

  /* Assign handler — hashtag always GET since assign is a one-way action */
  const handleForwardWithHashtag = (id) => {
    dispatch(forwardEmail(email, id));
    triggerHashtag(MEMO.assign, "GET");
  };

  return (
    <>
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>

        <button className="text-sm font-medium text-blue-600 hover:text-blue-700 mr-4">
          View All
        </button>
      </div>

      {/* z-30 lifts this grid's popovers (assign / move / tag / notes) above
          sibling page cards, while staying below the fixed app chrome —
          footer z-40, sidebar z-50, top nav z-999. */}
      <div className="relative z-30 grid grid-cols-3 sm:grid-cols-5 gap-x-3 gap-y-5 place-items-center overflow-visible">
        {actionButtons.map((btn, i) => (
          <div
            key={i}
            className="relative flex w-full items-center justify-center"
          >
            {i == 2 ? (
              <>
                <MoveToDropdown currentThreadId={threadId} />
              </>
            ) : (
              <>
                <button
                  disabled={btn.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    btn.action();
                  }}
                  style={
                    btn.active
                      ? {
                        backgroundColor: btn.activeProps.fill,
                        color: btn.activeProps.color,
                        transform: "translateY(-2px) scale(1.09)",
                        boxShadow:
                          "0 8px 18px rgba(0,0,0,0.45), inset 0 1px 2px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.4)",
                      }
                      : {}
                  }
                  className={`
group
relative
flex
items-center
justify-center

w-12
h-12

rounded-full
border
border-gray-200

bg-white

transition-all
duration-200

hover:border-blue-300
hover:shadow-md

active:scale-95

${btn.active ? "border-blue-500 ring-2 ring-blue-100" : ""}

${contactLoading && btn.label.includes("Emails")
                      ? "opacity-60 pointer-events-none"
                      : ""
                    }
`}
                >
                  {btn.icon}
                  <span
                    className="absolute -bottom-9 left-1/2 -translate-x-1/2
    bg-black text-white text-xs px-2 py-1 rounded
    opacity-0 group-hover:opacity-100
    transition-all whitespace-nowrap shadow-lg z-20"
                  >
                    {btn.label}
                  </span>
                </button>

                {showUsers && btn.label === "Assign" && (
                  <UserDropdown
                    assignedId={assignedId}
                    forwardHandler={handleForwardWithHashtag}
                    onClose={() => setShowUsers(false)}
                  />
                )}

                {showTags && btn.label === "Mark Tag" && (
                  <div className="absolute top-14 right-0 w-60 z-40">
                    <div className="bg-white rounded-xl border shadow-lg ">
                      {tagLoading ? (
                        <div className="py-6 flex justify-center">
                          <LoadingChase />
                        </div>
                      ) : (
                        <CustomDropdown
                          defaultOpen={true}
                          options={[
                            ...new Map(
                              tags.map((tag) => [tag.name, tag]),
                            ).values(),
                          ]?.map((tag) => ({
                            label: tag.name,
                            value: tag.memo_c,
                          }))}
                          onChange={(tag) => {
                            if (
                              !hashtags.find(
                                (hashtag) => hashtag.memo_c == tag,
                              )
                            ) {
                              applyTagMutation({ tag, method: "GET" });
                            } else {
                              applyTagMutation({ tag, method: "DELETE" });
                            }

                            setShowTags(false);
                          }}
                          outsideClickHandle={() => setShowTags(false)}
                        />
                      )}
                    </div>
                  </div>
                )}
                {showNotes && btn.label === "Add Notes" && (
                  <div
                    ref={noteRef}
                    className="absolute top-14 right-0 w-96 z-50"
                  >
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-4 space-y-4">
                      {/* Search User */}
                      <div className="relative">
                        <input
                          type="text"
                          value={searchUser}
                          onChange={(e) => {
                            setSearchUser(e.target.value);
                            setSelectedUser(null);
                          }}
                          placeholder="Search user..."
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />

                        {searchUser && !selectedUser && (
                          <div className="absolute mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            {filteredUsers.length > 0 ? (
                              filteredUsers.map((user) => (
                                <button
                                  key={user.email}
                                  type="button"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setSearchUser(user.name);
                                  }}
                                  className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition flex items-center gap-3"
                                >
                                  <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center font-medium text-indigo-600">
                                    {user.name?.charAt(0)}
                                  </div>

                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {user.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {user.email}
                                    </div>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-gray-500">
                                No users found
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Selected User */}
                      {selectedUser && (
                        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
                          <div>
                            <div className="font-medium text-sm">
                              {selectedUser.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {selectedUser.email}
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedUser(null);
                              setSearchUser("");
                            }}
                            className="text-gray-500 hover:text-red-500"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* Note Box */}
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Write your note..."
                        rows={4}
                        className="w-full border rounded-xl px-3 py-3 resize-none text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                      />

                      {/* Actions */}
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setShowNotes(false);
                            setSearchUser("");
                            setSelectedUser(null);
                            setNote("");
                          }}
                          className="px-4 py-2 text-sm border rounded-xl hover:bg-gray-50"
                        >
                          Cancel
                        </button>

                        <IconButton
                          icon={Send}
                          label="Send Note"
                          loading={sendingNote}
                          variant="primary"
                          rounded="xl"
                          disabled={
                            isPending || !note.trim() || !selectedUser
                          }
                          onClick={() => mutate()}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default ActionButton;
