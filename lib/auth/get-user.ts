import { cookies } from "next/headers";
import { verifyAccessToken } from "./token";
import { getUserById } from "./user";

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) return null;

    const payload = await verifyAccessToken(accessToken);
    if (!payload) return null;

    const user = await getUserById(payload.userId);
    return user;
  } catch (error) {
    return null;
  }
}
