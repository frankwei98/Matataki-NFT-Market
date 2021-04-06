import { BACKEND_CLIENT } from '../constant';
import { User } from '../types/user.types';

export async function loginWithPermit(permit: {
  signature: string;
  message: string;
}) {
  const { data } = await BACKEND_CLIENT.post<{ data: string }>(
    '/auth/login',
    permit
  );
  return data.data;
}

export async function checkIsWalletRegistered(wallet: string) {
  const { data } = await BACKEND_CLIENT.get<{
    isUserExist: boolean;
    user: User;
  }>(`/user/findByAddress/${wallet}`);
  return data;
}

/**
 * 注册用户
 * @param profile 注册的用户资料
 * @param permit 签名和信息
 * @returns 用户访问令牌
 */
export async function registerUser(
  profile: { nickname: string; bio: string; username: string },
  permit: { signature: string; message: string }
) {
  const payload = {
    nickname: profile.nickname,
    bio: profile.bio,
    username: profile.username,
    signature: permit.signature,
    signingMessage: permit.message,
  };
  await BACKEND_CLIENT.post<{ isGood: boolean }>('/user', payload);
  const accessToken = await loginWithPermit(permit);
  return accessToken;
}