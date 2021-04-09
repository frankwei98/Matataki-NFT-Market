import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserInfoState {
  avatar: string;
  nickname: string;
  username: string;
  website?: string;
  introduction?: string;
}

const initialState: UserInfoState = {
  avatar: '',
  nickname: '',
  username: '',
  website: '',
  introduction: '',
};

export const userInfoSlice = createSlice({
  name: 'userInfo',
  initialState,
  reducers: {
    updateUserInfo: (state, action: PayloadAction<UserInfoState>) => {
      state = action.payload;
    },
  },
});

export const { updateUserInfo } = userInfoSlice.actions;

export default userInfoSlice.reducer;
