import React from 'react'
import { useSelector } from 'react-redux'

const useAccess = () => {
    const { userType, permissions } = useSelector(state => state.user)
    const can = (section) => {
        if (userType == "power") return true;
        return permissions[section]
    }
    return { can }
}

export default useAccess