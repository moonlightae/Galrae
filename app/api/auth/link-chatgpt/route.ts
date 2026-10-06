import { and, eq, ne } from "drizzle-orm";
import { getDb } from "../../../../db";
import { leaderboard, users } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getGameUser } from "../../../game-auth";

export async function POST() {
  const [gameUser, chatgptUser] = await Promise.all([getGameUser(), getChatGPTUser()]);
  if (!gameUser) return Response.json({ error: "먼저 게임 계정에 로그인해주세요." }, { status: 401 });
  if (!chatgptUser) return Response.json({ error: "현재 ChatGPT 계정을 확인할 수 없습니다." }, { status: 401 });
  const db = getDb();
  const [linkedElsewhere] = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.chatgptUserId, chatgptUser.userId), ne(users.id, gameUser.id))).limit(1);
  if (linkedElsewhere) return Response.json({ error: "이 ChatGPT 계정은 다른 게임 아이디에 연결되어 있습니다." }, { status: 409 });
  const displayName = chatgptUser.fullName || chatgptUser.email.split("@")[0];
  await db.update(users).set({ chatgptUserId: chatgptUser.userId, chatgptDisplayName: displayName, updatedAt: new Date().toISOString() })
    .where(eq(users.id, gameUser.id));
  const [legacyScore] = await db.select().from(leaderboard).where(eq(leaderboard.userId, chatgptUser.userId)).limit(1);
  if (legacyScore && chatgptUser.userId !== gameUser.id) {
    const [gameScore] = await db.select().from(leaderboard).where(eq(leaderboard.userId, gameUser.id)).limit(1);
    const bestScore = Math.max(legacyScore.bestScore, gameScore?.bestScore ?? 0);
    const bestPracticeScore = Math.max(legacyScore.bestPracticeScore, gameScore?.bestPracticeScore ?? 0);
    const practiceGamesPlayed = legacyScore.practiceGamesPlayed + (gameScore?.practiceGamesPlayed ?? 0);
    const achievedAt = !gameScore || legacyScore.bestScore > gameScore.bestScore
      ? legacyScore.achievedAt
      : legacyScore.bestScore < gameScore.bestScore
        ? gameScore.achievedAt
        : [legacyScore.achievedAt, gameScore.achievedAt].sort()[0];
    await db.insert(leaderboard).values({
      userId: gameUser.id,
      displayName: gameUser.displayName,
      bestScore,
      bestPracticeScore,
      practiceGamesPlayed,
      gamesPlayed: legacyScore.gamesPlayed + (gameScore?.gamesPlayed ?? 0),
      achievedAt,
    }).onConflictDoUpdate({
      target: leaderboard.userId,
      set: {
        displayName: gameUser.displayName,
        bestScore,
        bestPracticeScore,
        practiceGamesPlayed,
        gamesPlayed: legacyScore.gamesPlayed + (gameScore?.gamesPlayed ?? 0),
        achievedAt,
        updatedAt: new Date().toISOString(),
      },
    });
    await db.delete(leaderboard).where(eq(leaderboard.userId, chatgptUser.userId));
  }
  return Response.json({ linked: true, displayName });
}
