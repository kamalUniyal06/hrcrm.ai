
import { useSearchParams } from "react-router-dom";
import AllContacts from "./AllContacts";
import ContactDetail from "../ContactDetail";
import { useContext } from "react";
import { PageContext } from "../../context/pageContext";
export default function Contactpage() {

  const [searchParams] = useSearchParams()
  const { enteredEmail } = useContext(PageContext)
  const email = searchParams.get("email")
  if (email || enteredEmail) {
    return <ContactDetail email={email ? email : enteredEmail} />
  }
  return (
    <AllContacts />
  )
}


