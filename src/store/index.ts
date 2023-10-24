import { configureStore } from '@reduxjs/toolkit'
import chatSlice from '@/store/reducers/chat'

const store = configureStore({
  reducer: {
    chat: chatSlice
  }
})

export type State = ReturnType<typeof store.getState>

export default store