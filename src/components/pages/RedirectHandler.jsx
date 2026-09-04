import React, { useContext, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageContext } from "../../context/pageContext";

const RedirectHandler = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const { setEnteredEmail } = useContext(PageContext);

    useEffect(() => {
        const module = searchParams.get("module");
        const email = searchParams.get("email");

        // set email in context
        if (email) {
            setEnteredEmail(email);
        }

        // invalid module or timeline
        if (!module || module === "timeline") {
            navigate("/", { replace: true });
            return;
        }

        // redirect according to module
        switch (module) {
            case "inbox":
                navigate("/inbox", { replace: true });
                break;

            case "campaign":
                navigate("/campaign", { replace: true });
                break;

            default:
                navigate("/", { replace: true });
                break;
        }
    }, [navigate, searchParams, setEnteredEmail]);

    return null;
};

export default RedirectHandler;