import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { classifiedSpecies, leaderboard } from "../../../db/schema";
import dataset from "../../../public/data/animals.json";
import { getGameUser } from "../../game-auth";
import { isClassificationPolytomyMistake } from "../../../public/achievements.js";

const { animals } = dataset;

export const dynamic = "force-dynamic";
const playableIds = new Set(animals.filter((animal) => animal.id !== "homo-sapiens").map((animal) => animal.id));
const speciesById = new Map(animals.map((animal) => [animal.id, animal]));

function storageError(error: unknown) {
  console.error("Achievement storage error", error);
  return Response.json({ error: "발전과제 기록을 불러오거나 저장하지 못했습니다." }, { status: 503 });
}

export async function GET() {
  const user = await getGameUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  try {
    const db = getDb();
    const [rows, records] = await Promise.all([
      db.select().from(leaderboard).where(eq(leaderboard.userId, user.id)).limit(1),
      db.select({ speciesId: classifiedSpecies.speciesId, count: classifiedSpecies.successCount })
        .from(classifiedSpecies).where(eq(classifiedSpecies.userId, user.id)),
    ]);
    const row = rows[0];
    const counts = records.filter((record) => playableIds.has(record.speciesId));
    return Response.json({ stats: {
      bestScore: row?.bestScore ?? 0,
      bestPracticeScore: row?.bestPracticeScore ?? 0,
      normalAttempts: row?.normalAttempts ?? row?.gamesPlayed ?? 0,
      hasFailed: Boolean(row?.hasFailed || (row && row.normalAttempts === null && row.gamesPlayed > 0 && row.bestScore < playableIds.size)),
      practiceStarted: Boolean(row?.practiceStarted || (row?.practiceGamesPlayed ?? 0) > 0),
      practiceCompleted: Boolean(row?.practiceCompleted || row?.bestPracticeScore === playableIds.size),
      fishSiblingMistake: Boolean(row?.fishSiblingMistake),
      easyCompleted: Boolean(row?.easyCompleted),
      mediumCompleted: Boolean(row?.mediumCompleted),
      hardCompleted: Boolean(row?.hardCompleted || row?.bestScore === playableIds.size),
      collected: counts.length,
      totalSuccesses: counts.reduce((sum, record) => sum + record.count, 0),
      repeatSuccesses: counts.reduce((best, record) => Math.max(best, record.count), 0),
    } });
  } catch (error) { return storageError(error); }
}

export async function POST(request: Request) {
  const user = await getGameUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  let payload: { event?: unknown; classified?: unknown; currentId?: unknown; targetId?: unknown; placement?: unknown };
  try { payload = await request.json() as typeof payload; }
  catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  const event = payload?.event;
  if (event !== "normal-start" && event !== "failure" && event !== "practice-start" && event !== "practice-complete" && event !== "fish-sibling-mistake") {
    return Response.json({ error: "올바르지 않은 발전과제 이벤트입니다." }, { status: 400 });
  }
  if (event === "fish-sibling-mistake") {
    const { classified, currentId, targetId, placement } = payload;
    if (!Array.isArray(classified) || classified.length < 1 || classified.length > playableIds.size
      || !classified.includes("homo-sapiens") || new Set(classified).size !== classified.length
      || !classified.every((id) => typeof id === "string" && speciesById.has(id))
      || typeof currentId !== "string" || !playableIds.has(currentId) || classified.includes(currentId)
      || typeof targetId !== "string" || placement !== "join"
      || !isClassificationPolytomyMistake(classified, currentId, targetId, placement, speciesById)) {
      return Response.json({ error: "특별 발전과제의 오분류 조건에 맞지 않습니다." }, { status: 400 });
    }
  }
  try {
    const flags = {
      ...(event === "failure" ? { hasFailed: true } : {}),
      ...(event === "fish-sibling-mistake" ? { hasFailed: true, fishSiblingMistake: true } : {}),
      ...(event === "practice-start" ? { practiceStarted: true } : {}),
      ...(event === "practice-complete" ? { practiceStarted: true, practiceCompleted: true } : {}),
    };
    await getDb().insert(leaderboard).values({
      userId: user.id, displayName: user.displayName.slice(0, 60), ...flags,
      ...(event === "normal-start" ? { normalAttempts: 1 } : {}),
    }).onConflictDoUpdate({
      target: leaderboard.userId,
      set: { ...flags, updatedAt: sql`CURRENT_TIMESTAMP`,
        hasFailed: sql`MAX(${leaderboard.hasFailed}, ${event === "failure" || event === "fish-sibling-mistake" ? 1 : 0}, CASE WHEN ${leaderboard.normalAttempts} IS NULL AND ${leaderboard.gamesPlayed} > 0 AND ${leaderboard.bestScore} < ${playableIds.size} THEN 1 ELSE 0 END)`,
        ...(event === "normal-start" ? { normalAttempts: sql`COALESCE(${leaderboard.normalAttempts}, ${leaderboard.gamesPlayed}) + 1` } : {}),
      },
    });
    return Response.json({ ok: true });
  } catch (error) { return storageError(error); }
}
