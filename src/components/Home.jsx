import { store } from '@/store/store'
import React from 'react'

const Home = () => {
  return (
     <iframe
          title="GPC Training"
          src={`https://training.guestpostcrm.com/?email=${encodeURIComponent(store.getState().user.user?.email || "")}`}
          className="h-[500px] w-full flex-1 border-0 bg-white"
        />
  )
}

export default Home