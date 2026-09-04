import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { ODO_ROUTES } from "./ODORoutes";
import NotFoundPage from "../pages/NotFoundPage";
import useIdle from "../../hooks/useIdle";

export default function DynamicRouteHandler({ mode }) {
  useIdle({ idle: false });
  const { type } = useParams();
  const [searchParams] =
    useSearchParams();

  const email = searchParams.get("email");
  const id = searchParams.get("id");
  const config = ODO_ROUTES[type];

  if (!config) return <NotFoundPage />;
  let Component = null;
  if (mode === "list" && !email) Component = config.list;
  if (mode === "list" && email) Component = config.threadList;
  if (mode === "create") Component = config.create;
  if (mode === "edit") Component = config.edit;

  if (!Component) return <NotFoundPage />;

  return (
    <Component id={id} email={email} />
  );
}
