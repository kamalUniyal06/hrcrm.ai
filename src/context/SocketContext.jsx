import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { io } from "socket.io-client";

import {
  useDispatch,
  useSelector,
} from "react-redux";

import {
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { showConsole } from "../assets/assets.js";

import { eventActions } from "../store/Slices/eventSlice.js";
import { unrepliedAction } from "../store/Slices/unrepliedEmails.js";

import { apiRequest } from "../services/api.js";

import { queryClient } from "../lib/queryClient.js";

import { recentKeys } from "../queries/recentAct.queries.js";

import { useTimeline } from "./TimelineContext.jsx";
import { ThreadContext } from "./ThreadContext.jsx";

import toast from "react-hot-toast";


const socket = io(
  "https://socket.guestpostcrm.com"
);


export const SocketContext =
  createContext();


export const SocketContextProvider = ({
  children,
}) => {

  /* =====================================================
     ROUTER
  ===================================================== */

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const location = useLocation();

  const [searchParams] =
    useSearchParams();

  const currentSearchEmail =
    searchParams.get("email");


  /* =====================================================
     CONTEXTS
  ===================================================== */

  const {
    currentEmail,
  } = useTimeline();

  const {
    currentEmail:
    currentThreadEmail,
  } = useContext(ThreadContext);


  /* =====================================================
     REDUX
  ===================================================== */

  const {
    user,
    id,
    isAuthenticated,
  } = useSelector(
    (state) => state.user
  );


  /* =====================================================
     LOCAL STATE
  ===================================================== */

  const [
    currentAvatar,
    setCurrentAvatar,
  ] = useState();

  const [
    crm,
    setCrm,
  ] = useState("");

  const [
    invoiceOrderId,
    setInvoiceOrderId,
  ] = useState(null);

  const [
    userIdle,
    setUserIdle,
  ] = useState(true);

  const [
    eventQueue,
    setEventQueue,
  ] = useState({});

  const [
    activeUsers,
    setActiveUsers,
  ] = useState([]);


  /*
   * =====================================================
   * INTERNAL CHAT UNSEEN COUNTS
   *
   * Structure:
   *
   * {
   *   "gagan@outrightsystems.org": 2,
   *   "admin@gmail.com": 5
   * }
   *
   * Each sender has their own unseen count.
   * =====================================================
   */

  const [
    unseenChatCounts,
    setUnseenChatCounts,
  ] = useState({});

  console.log("unseen hat cuont", unseenChatCounts)
  /* =====================================================
     NOTIFICATION COUNT
  ===================================================== */

  const [
    notificationCount,
    setNotificationCount,
  ] = useState({
    outr_offer: null,
    outr_recent_activity: null,
    outr_el_process_audit: null,
    unreplied_email: null,
    outr_deal_fetch: null,
    outr_order_gp_li: null,
    outr_self_test: null,
    outr_paypal_invoice_links: null,
    error_log_created: null,
  });


  /* =====================================================
     REFS
  ===================================================== */

  const eventQueueRef =
    useRef({});

  const currentEventThreadId =
    useRef(null);

  const crmRef =
    useRef("");

  const userRef =
    useRef(userIdle);


  /* =====================================================
     UPDATE REFS
  ===================================================== */

  useEffect(() => {
    crmRef.current = crm;
    userRef.current = userIdle;
  }, [
    crm,
    userIdle,
  ]);


  /* =====================================================
     PRESENCE LIST
  ===================================================== */

  useEffect(() => {

    const presenceListHandler = (
      users
    ) => {

      console.log(
        "USER",
        users
      );

      const list =
        Array.isArray(users)
          ? users
          : [];


      const uniqueUsers =
        Array.from(
          list.reduce(
            (
              map,
              user
            ) => {

              const key =
                user.email
                  ?.toLowerCase();

              if (!key) {
                return map;
              }


              const existing =
                map.get(key);


              if (
                !existing ||
                user?.status ===
                "online" ||
                new Date(
                  user.lastActiveAt ||
                  0
                ) >
                new Date(
                  existing.lastActiveAt ||
                  0
                )
              ) {
                map.set(
                  key,
                  user
                );
              }


              return map;

            },
            new Map()
          ).values()
        );


      setActiveUsers(
        uniqueUsers
      );
    };


    socket.on(
      "presence:list",
      presenceListHandler
    );


    return () => {
      socket.off(
        "presence:list",
        presenceListHandler
      );
    };

  }, []);


  /* =====================================================
     PRESENCE JOIN
  ===================================================== */

  useEffect(() => {

    if (
      !isAuthenticated ||
      !user?.email ||
      !crm
    ) {
      return;
    }


    const emitJoin = () => {

      socket.emit(
        "presence:join",
        {
          userId:
            id ||
            user.id ||
            user.email,

          name:
            user.name,

          email:
            user.email,

          crm,

          currentTimeline:
            currentEmail,

          currentThread:
            currentThreadEmail,

          page:
            location.pathname,

          currentSearchEmail:
            currentSearchEmail,
        }
      );
    };


    const handleVisibility =
      () => {

        socket.emit(
          "presence:update",
          {
            page:
              location.pathname,

            status:
              document.hidden
                ? "away"
                : "online",

            currentTimeline:
              currentEmail,

            currentThread:
              currentThreadEmail,

            currentSearchEmail:
              currentSearchEmail,
          }
        );
      };


    emitJoin();


    socket.on(
      "connect",
      emitJoin
    );


    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );


    return () => {

      socket.emit(
        "presence:leave"
      );

      socket.off(
        "connect",
        emitJoin
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

    };

  }, [
    isAuthenticated,
    user?.email,
    user?.name,
    user?.id,
    id,
    crm,
    currentEmail,
    currentThreadEmail,
    currentSearchEmail,
  ]);


  /* =====================================================
     UPDATE PRESENCE
  ===================================================== */

  useEffect(() => {

    if (
      !isAuthenticated ||
      !user?.email ||
      !crm
    ) {
      return;
    }


    socket.emit(
      "presence:update",
      {
        page:
          location.pathname,

        status:
          document.hidden
            ? "away"
            : "online",

        currentTimeline:
          currentEmail,

        currentThread:
          currentThreadEmail,

        currentSearchEmail:
          currentSearchEmail,
      }
    );

  }, [
    location.pathname,
    isAuthenticated,
    user?.email,
    crm,
    currentThreadEmail,
    currentEmail,
    currentSearchEmail,
  ]);


  /* =====================================================
     SOCKET EVENTS
  ===================================================== */

  useEffect(() => {

    /* ===================================================
       NEW AVATAR
    =================================================== */

    const newAvatarHandler = (
      data
    ) => {

      setCurrentAvatar({
        url:
          data.avatar_url.split(
            "html/"
          )[1],

        mute:
          false,
      });

    };


    /* ===================================================
       LATEST AVATAR
    =================================================== */

    const latestAvatarHandler = (
      avatar
    ) => {

      setCurrentAvatar({
        url:
          avatar.avatar_url.split(
            "html/"
          )[1],

        mute:
          true,
      });

    };


    /* ===================================================
       INTERNAL CHAT NOTIFICATION
    =================================================== */

    const handleNewChatMessage = (
      data
    ) => {

      /*
       * Make sure this is actually an
       * internal chat event.
       */

      if (
        !data?.name?.startsWith(
          "New Chat Message"
        )
      ) {
        return false;
      }


      /*
       * We only care about messages
       * sent TO the current logged-in user.
       */

      const currentUserEmail =
        user?.email
          ?.toLowerCase()
          ?.trim();


      const toEmail =
        data?.to
          ?.toLowerCase()
          ?.trim();


      if (
        !currentUserEmail ||
        !toEmail ||
        currentUserEmail !==
        toEmail
      ) {
        return true;
      }


      /*
       * Sender email
       */

      const fromEmail =
        data?.from
          ?.toLowerCase()
          ?.trim();


      if (!fromEmail) {
        return true;
      }


      /*
       * Message text
       */

      const message =
        data?.details?.message ??
        data?.message ??
        "New message";


      /*
       * Find sender from presence list.
       *
       * Example active user:
       *
       * {
       *   name: "Gagan",
       *   email: "gagan@outrightsystems.org"
       * }
       */

      const sender =
        activeUsers.find(
          (activeUser) =>
            activeUser?.email
              ?.toLowerCase()
              ?.trim() ===
            fromEmail
        );


      /*
       * Prefer actual user name.
       *
       * Fallback to email if the sender
       * is not currently online/present.
       */

      const senderName =
        sender?.name ||
        fromEmail;


      /* =================================================
         INCREMENT UNSEEN COUNT
      ================================================= */

      setUnseenChatCounts(
        (previous) => ({
          ...previous,

          [fromEmail]:
            (previous[fromEmail] ||
              0) + 1,
        })
      );


      /* =================================================
         INVALIDATE INTERNAL CHAT DATA
      ================================================= */

      /*
       * Update conversation list.
       */

      queryClient.invalidateQueries({
        queryKey: [
          "chat",
          "list",
        ],
      });


      /*
       * Update currently opened chat
       * if it happens to be the same user.
       */

      queryClient.invalidateQueries({
        queryKey: [
          "chat",
          fromEmail,
        ],
      });


      /* =================================================
         SHOW TOAST
      ================================================= */

      toast.custom(
        (toastObject) => {

          return (
            <div
              onClick={() => {

                /*
                 * Remove unseen count
                 * when notification is opened.
                 */

                setUnseenChatCounts(
                  (previous) => {

                    const next = {
                      ...previous,
                    };

                    delete next[
                      fromEmail
                    ];

                    return next;
                  }
                );


                /*
                 * Close toast.
                 */

                toast.dismiss(
                  toastObject.id
                );


                /*
                 * Navigate to chat.
                 */

                navigate(
                  `/internal-chats?email=${encodeURIComponent(
                    fromEmail
                  )}`
                );

              }}
              className="
                w-[360px]
                max-w-[calc(100vw-32px)]
                cursor-pointer
                rounded-xl
                border
                border-border
                bg-card
                p-4
                shadow-lg
                transition
                hover:shadow-xl
              "
            >

              {/* ==============================
                  HEADER
              =============================== */}

              <div
                className="
                  flex
                  items-start
                  gap-3
                "
              >

                {/* Avatar */}

                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-search-primary
                    text-sm
                    font-semibold
                    text-white
                  "
                >
                  {senderName
                    ?.charAt(0)
                    ?.toUpperCase()}
                </div>


                {/* User information */}

                <div
                  className="
                    min-w-0
                    flex-1
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-2
                    "
                  >

                    <p
                      className="
                        truncate
                        text-sm
                        font-semibold
                        text-foreground
                      "
                    >
                      {senderName}
                    </p>


                    <span
                      className="
                        shrink-0
                        rounded-full
                        bg-search-primary
                        px-2
                        py-0.5
                        text-[10px]
                        font-medium
                        text-white
                      "
                    >
                      Chat
                    </span>

                  </div>


                  {/* Message */}

                  <p
                    className="
                      mt-1
                      line-clamp-2
                      text-xs
                      text-muted-foreground
                    "
                  >
                    {message}
                  </p>

                </div>

              </div>


              {/* ==============================
                  FOOTER
              =============================== */}

              <p
                className="
                  mt-3
                  text-[10px]
                  text-muted-foreground
                "
              >
                Click to open conversation
              </p>

            </div>
          );

        },
        {
          duration:
            6000,
        }
      );


      return true;
    };


    /* ===================================================
       NEW MAIL
    =================================================== */

    const newMailHandler = (
      data
    ) => {

      /*
       * =================================================
       * FIRST:
       * CHECK INTERNAL CHAT MESSAGE
       * =================================================
       */

      const isInternalChat =
        data?.name?.startsWith(
          "New Chat Message"
        );


      if (isInternalChat) {

        const handled =
          handleNewChatMessage(
            data
          );

        /*
         * Internal chat messages should
         * not continue into the normal
         * CRM notification handling.
         */

        if (handled) {
          return;
        }

      }


      /* =================================================
         NORMAL CRM MAIL HANDLING
      ================================================= */

      showConsole &&
        crmRef.current ==
        data.site_url &&
        console.log(
          "Mail site:",
          data.site_url
        );


      showConsole &&
        crmRef.current ==
        data.site_url &&
        console.log(
          "new mail",
          data
        );


      currentEventThreadId.current =
        data?.thread_id;


      if (
        data?.site_url ==
        crmRef.current
      ) {

        if (
          data.name ===
          "paypal_status_sent"
        ) {

          setInvoiceOrderId(
            data.order_id
          );

        } else if (
          data.name ===
          "outr_recent_activity"
        ) {

          queryClient.invalidateQueries({
            queryKey:
              recentKeys.all,
          });

          dispatch(
            eventActions.updateCount(
              1
            )
          );

        } else {

          if (
            data.name ===
            "unreplied_email"
          ) {

            dispatch(
              unrepliedAction.setShowNewEmailBanner(
                true
              )
            );

          }


          if (
            userRef.current
          ) {

            setNotificationCount(
              (prev) => ({
                ...prev,
                [data.name]:
                  Date.now(),
              })
            );

          } else {

            console.log(
              "ADDING TO QUEUE"
            );


            setEventQueue(
              (prev) => ({
                ...prev,

                [data.name]:
                  prev[data.name]
                    ? prev[data.name] + 1
                    : 1,
              })
            );

          }

        }

      }

    };


    /* ===================================================
       REGISTER EVENTS
    =================================================== */

    socket.on(
      "new_avatar",
      newAvatarHandler
    );

    socket.on(
      "latest_avatar",
      latestAvatarHandler
    );

    socket.on(
      "new-mail",
      newMailHandler
    );


    /* ===================================================
       CLEANUP
    =================================================== */

    return () => {

      socket.off(
        "new_avatar",
        newAvatarHandler
      );

      socket.off(
        "latest_avatar",
        latestAvatarHandler
      );

      socket.off(
        "new-mail",
        newMailHandler
      );

    };

  }, [
    dispatch,
    user?.email,
    activeUsers,
    navigate,
  ]);


  /* =====================================================
     CLEAR UNSEEN CHAT COUNT
  ===================================================== */

  const clearUnseenChatCount = (
    email
  ) => {

    if (!email) {
      return;
    }


    const normalizedEmail =
      email
        .toLowerCase()
        .trim();


    setUnseenChatCounts(
      (previous) => {

        const next = {
          ...previous,
        };

        delete next[
          normalizedEmail
        ];

        return next;
      }
    );

  };


  /* =====================================================
     TOTAL UNSEEN CHAT COUNT
  ===================================================== */

  const totalUnseenChatCount =
    Object.values(
      unseenChatCounts
    ).reduce(
      (
        total,
        count
      ) =>
        total + count,
      0
    );


  /* =====================================================
     MOVE OPTIONS
  ===================================================== */

  const getMoveOptions =
    async () => {

      try {

        const data =
          await apiRequest({
            endpoint:
              `${crm}/index.php?entryPoint=move`,
          });

        return data;

      } catch (error) {

        console.error(
          "Error fetching move options:",
          error
        );

        throw error;

      }

    };


  /* =====================================================
     MOVE DATA
  ===================================================== */

  const moveData = async (
    threadId,
    labelId
  ) => {

    try {

      const data =
        await apiRequest({
          endpoint:
            `${crm}/index.php?entryPoint=move`,

          params: {
            threadid:
              threadId,

            lblid:
              labelId,
          },
        });

      return data;

    } catch (error) {

      console.error(
        "Error moving data:",
        error
      );

      throw error;

    }

  };


  /* =====================================================
     PROVIDER
  ===================================================== */

  return (
    <SocketContext.Provider
      value={{

        /* ---------------------------------------------
           AVATAR
        --------------------------------------------- */

        currentAvatar,
        setCurrentAvatar,


        /* ---------------------------------------------
           CRM
        --------------------------------------------- */

        crm,
        setCrm,


        /* ---------------------------------------------
           USER IDLE
        --------------------------------------------- */

        setUserIdle,
        userIdle,


        /* ---------------------------------------------
           EVENT QUEUE
        --------------------------------------------- */

        eventQueue,

        currentEventThreadId,

        setEventQueue,

        eventQueueRef,


        /* ---------------------------------------------
           INVOICE
        --------------------------------------------- */

        invoiceOrderId,
        setInvoiceOrderId,


        /* ---------------------------------------------
           MOVE
        --------------------------------------------- */

        getMoveOptions,
        moveData,


        /* ---------------------------------------------
           NORMAL NOTIFICATIONS
        --------------------------------------------- */

        notificationCount,
        setNotificationCount,


        /* ---------------------------------------------
           ACTIVE USERS
        --------------------------------------------- */

        activeUsers,


        /* ---------------------------------------------
           INTERNAL CHAT NOTIFICATIONS
        --------------------------------------------- */

        unseenChatCounts,

        totalUnseenChatCount,

        clearUnseenChatCount,

      }}
    >
      {children}
    </SocketContext.Provider>
  );
};