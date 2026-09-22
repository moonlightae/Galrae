import { getChatGPTUser } from "../../chatgpt-auth";
import { getGameUser } from "../../game-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const [user, chatgptUser] = await Promise.all([getGameUser(), getChatGPTUser()]);
  return Response.json({
    user,
    chatgpt: chatgptUser ? {
      available: true,
      displayName: chatgptUser.fullName || chatgptUser.email.split("@")[0],
    } : { available: false, displayName: null },
  });
}
