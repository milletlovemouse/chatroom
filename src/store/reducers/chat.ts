import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  count: 0
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addCount(state) {
      state.count++
    },
    clearCount(state) {
      state.count = 0
    }
  }
})

export const { addCount, clearCount } = chatSlice.actions

export default chatSlice.reducer