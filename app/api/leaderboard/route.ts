import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { getGameUser } from "../../game-auth";
import { getDb } from "../../../db";
import { classifiedSpecies, friendships, leaderboard } from "../../../db/schema";
import dataset from "../../../public/data/animals.json";
import "../../../public/game-logic.js";

const { animals, speciesCount } = dataset;

export const dynamic = "force-dynamic";
const speciesById = new Map(animals.map((animal) => [animal.id, animal]));
const { isDifficultyCompletion } = (globalThis as typeof globalThis & {
  GalraeLogic: { isDifficultyCompletion(ids: unknown, difficulty: string, speciesById: Map<string, unknown>): boolean };
}).GalraeLogic;

function storageError(error: unknown) {
  console.error("Leaderboard storage error", error);
  return Response.json({ error: "리더보드를 잠시 사용할 수 없습니다." }, { status: 503 });
}

export async function GET() {
  try {
    const user = await getGameUser();
    if (!user) return Response.json({ error: "로그인 후 친구 기록을 확인해 주세요." }, { status: 401 });
    const db = getDb();
    const friends = await db.select().from(friendships).where(and(eq(friendships.accepted, true),
      or(eq(friendships.userA, user.id), eq(friendships.userB, user.id))));
    const visibleIds = [user.id, ...friends.map((friend) => friend.userA === user.id ? friend.userB : friend.userA)];
    const topRows = await db
      .select({
        userId: leaderboard.userId,
        displayName: leaderboard.displayName,
        bestScore: leaderboard.bestScore,
        bestPracticeScore: leaderboard.bestPracticeScore,
        gamesPlayed: sql<number>`COALESCE(${leaderboard.normalAttempts}, ${leaderboard.gamesPlayed})`,
        achievedAt: leaderboard.achievedAt,
      })
      .from(leaderboard)
      .where(inArray(leaderboard.userId, visibleIds))
      .orderBy(desc(leaderboard.bestScore), asc(leaderboard.achievedAt))
      .limit(20);
    const [ownRow] = user && !topRows.some((row) => row.userId === user.id)
      ? await db.select({
        userId: leaderboard.userId,
        displayName: leaderboard.displayName,
        bestScore: leaderboard.bestScore,
        bestPracticeScore: leaderboard.bestPracticeScore,
        gamesPlayed: sql<number>`COALESCE(${leaderboard.normalAttempts}, ${leaderboard.gamesPlayed})`,
        achievedAt: leaderboard.achievedAt,
      }).from(leaderboard).where(sql`${leaderboard.userId} = ${user.id}`).limit(1)
      : [];
    const rows = ownRow ? [...topRows, ownRow] : topRows;
    const collectionRows = rows.length ? await db.select({
      userId: classifiedSpecies.userId,
      uniqueSpeciesCount: sql<number>`COUNT(*)`,
    }).from(classifiedSpecies)
      .where(inArray(classifiedSpecies.userId, rows.map((row) => row.userId)))
      .groupBy(classifiedSpecies.userId) : [];
    const collectionCounts = new Map(collectionRows.map((row) => [row.userId, Number(row.uniqueSpeciesCount)]));
    return Response.json({
      entries: rows.map(({ userId, ...row }, index) => ({
        ...row,
        rank: index < topRows.length ? index + 1 : null,
        uniqueSpeciesCount: collectionCounts.get(userId) ?? 0,
        isCurrentUser: userId === user?.id,
      })),
    });
  } catch (error) {
    return storageError(error);
  }
}

export async function POST(request: Request) {
  const user = await getGameUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let payload: { score?: unknown; mode?: unknown; difficulty?: unknown; completedIds?: unknown };
  try { payload = await request.json() as typeof payload; }
  catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const score = Number(payload.score);
  if (payload.mode !== undefined && payload.mode !== "normal" && payload.mode !== "practice") {
    return Response.json({ error: "잘못된 게임 모드입니다." }, { status: 400 });
  }
  const practice = payload.mode === "practice";
  const difficulty = payload.difficulty ?? "hard";
  if (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard") {
    return Response.json({ error: "잘못된 난이도입니다." }, { status: 400 });
  }
  if (!Number.isInteger(score) || score < 0 || score >= speciesCount) {
    return Response.json({ error: `점수는 0부터 ${speciesCount - 1} 사이여야 합니다.` }, { status: 400 });
  }

  const completed = payload.completedIds !== undefined;
  if (completed && (practice || !isDifficultyCompletion(payload.completedIds, difficulty, speciesById)
    || score !== (payload.completedIds as string[]).length - 1)) {
    return Response.json({ error: "난이도 완주 조건에 맞지 않습니다." }, { status: 400 });
  }
  const completion = completed ? { [difficulty === "easy" ? "easyCompleted" : difficulty === "medium" ? "mediumCompleted" : "hardCompleted"]: true } : {};

  const displayName = user.displayName.slice(0, 60);
  try {
    const db = getDb();
    await db.insert(leaderboard).values({
      userId: user.id,
      displayName,
      bestScore: practice ? 0 : score,
      gamesPlayed: practice ? 0 : 1,
      bestPracticeScore: practice ? score : 0,
      practiceGamesPlayed: practice ? 1 : 0,
      ...completion,
    }).onConflictDoUpdate({
      target: leaderboard.userId,
      set: {
        displayName,
        ...completion,
        ...(practice ? {
          bestPracticeScore: sql`CASE WHEN ${leaderboard.bestPracticeScore} > ${score} THEN ${leaderboard.bestPracticeScore} ELSE ${score} END`,
          practiceGamesPlayed: sql`${leaderboard.practiceGamesPlayed} + 1`,
        } : {
          bestScore: sql`CASE WHEN ${leaderboard.bestScore} > ${score} THEN ${leaderboard.bestScore} ELSE ${score} END`,
          gamesPlayed: sql`${leaderboard.gamesPlayed} + 1`,
          achievedAt: sql`CASE WHEN ${score} > ${leaderboard.bestScore} THEN CAST(CURRENT_TIMESTAMP AS TEXT) ELSE ${leaderboard.achievedAt} END`,
        }),
        updatedAt: sql`CAST(CURRENT_TIMESTAMP AS TEXT)`,
      },
    });

    const [entry] = await db.select({
      displayName: leaderboard.displayName,
      bestScore: leaderboard.bestScore,
      bestPracticeScore: leaderboard.bestPracticeScore,
      gamesPlayed: leaderboard.gamesPlayed,
      achievedAt: leaderboard.achievedAt,
    }).from(leaderboard).where(sql`${leaderboard.userId} = ${user.id}`).limit(1);
    return Response.json({ entry });
  } catch (error) {
    return storageError(error);
  }
}
