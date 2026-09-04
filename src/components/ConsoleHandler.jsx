import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const ConsoleHandler = () => {
    const navigate = useNavigate()
    const show = useLocation().search.split("=")[1]
    console.log(show)
    useEffect(() => {
        if (show === "1") {
            localStorage.setItem("showConsole", true)
        } else {
            localStorage.setItem("showConsole", false)
        }
        navigate(-1)

    }, [])
    return (
        <></>
    )
}

export default ConsoleHandler