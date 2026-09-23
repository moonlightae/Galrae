import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { leaderboard } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getGameUser } from "../../game-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const [user, chatgptUser] = await Promise.all([getGameUser(), getChatGPTUser()]);
  const [score] = user
    ? await getDb().select({ gamesPlayed: leaderboard.gamesPlayed }).from(leaderboard).where(eq(leaderboard.userId, user.id)).limit(1)
    : [];
  return Response.json({
    user,
    gamesPlayed: score?.gamesPlayed ?? 0,
    chatgpt: chatgptUser ? {
      available: true,
      displayName: chatgptUser.fullName || chatgptUser.email.split("@")[0],
    } : { available: false, displayName: null },
  });
}
