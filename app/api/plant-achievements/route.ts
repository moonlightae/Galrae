import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { classifiedSpecies, plantProgress } from "../../../db/schema";
import dataset from "../../../public/data/plants.json";
import { isGrassSiblingMistake } from "../../../public/achievements.js";
import { getGameUser } from "../../game-auth";

const { plants, initialSpeciesId } = dataset;

export const dynamic = "force-dynamic";
const speciesById = new Map(plants.map((plant) => [plant.id, plant]));
const playableIds = new Set(plants.filter((plant) => plant.id !== initialSpeciesId).map((plant) => plant.id));
const { isDifficultyCompletion } = (globalThis as typeof globalThis & {
  GalraeLogic: { isDifficultyCompletion(ids: unknown, difficulty: string, species: Map<string, unknown>, initial: string): boolean };
}).GalraeLogic;

function storageError(error: unknown) {
  console.error("Plant achievement storage error", error);
  return Response.json({ error: "식물계 발전과제 기록을 저장하거나 불러오지 못했습니다." }, { status: 503 });
}

export async function GET() {
  const user = await getGameUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  try {
    const db = getDb();
    const [rows, records] = await Promise.all([
      db.select().from(plantProgress).where(eq(plantProgress.userId, user.id)).limit(1),
      db.select({ speciesId: classifiedSpecies.speciesId, count: classifiedSpecies.successCount })
        .from(classifiedSpecies).where(eq(classifiedSpecies.userId, user.id)),
    ]);
    const row = rows[0];
    const counts = records.filter((record) => playableIds.has(record.speciesId));
    return Response.json({ stats: {
      bestScore: row?.bestScore ?? 0, bestPracticeScore: row?.bestPracticeScore ?? 0,
      normalAttempts: row?.normalAttempts ?? 0, hasFailed: Boolean(row?.hasFailed),
      practiceStarted: Boolean(row?.practiceStarted), practiceCompleted: Boolean(row?.practiceCompleted), easyCompleted: Boolean(row?.easyCompleted),
      collected: counts.length, totalSuccesses: counts.reduce((sum, record) => sum + record.count, 0),
      repeatSuccesses: counts.reduce((best, record) => Math.max(best, record.count), 0),
      grassSiblingMistake: Boolean(row?.grassSiblingMistake),
    } });
  } catch (error) { return storageError(error); }
}

export async function POST(request: Request) {
  const user = await getGameUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  let payload: { event?: unknown; score?: unknown; mode?: unknown; difficulty?: unknown; completedIds?: unknown; classified?: unknown; currentId?: unknown; targetId?: unknown; placement?: unknown };
  try { payload = await request.json() as typeof payload; }
  catch { return Response.json({ error: "잘못된 요청입니다." }, { status: 400 }); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)
    || typeof payload.event !== "string" || !["normal-start", "failure", "practice-start", "result", "grass-sibling-mistake"].includes(payload.event)) {
    return Response.json({ error: "올바르지 않은 식물계 발전과제 이벤트입니다." }, { status: 400 });
  }
  if (payload.event === "grass-sibling-mistake") {
    const { classified, currentId, targetId, placement } = payload;
    if (!Array.isArray(classified) || classified.length > playableIds.size || !classified.includes(initialSpeciesId)
      || new Set(classified).size !== classified.length || !classified.every((id) => typeof id === "string" && speciesById.has(id))
      || typeof currentId !== "string" || !playableIds.has(currentId) || classified.includes(currentId)
      || typeof targetId !== "string" || placement !== "wrap"
      || !isGrassSiblingMistake(classified, currentId, targetId, placement, speciesById)) {
      return Response.json({ error: "특별 발전과제의 오분류 조건에 맞지 않습니다." }, { status: 400 });
    }
  }
  const result = payload.event === "result";
  const score = typeof payload.score === "number" ? payload.score : NaN;
  const practice = payload.mode === "practice";
  const completed = payload.completedIds !== undefined;
  if (result && (!Number.isInteger(score) || score < 0 || score > playableIds.size
    || (payload.mode !== "normal" && payload.mode !== "practice") || payload.difficulty !== (practice ? "hard" : "easy")
    || (completed && (!Array.isArray(payload.completedIds) || payload.completedIds.length !== speciesById.size
      || !isDifficultyCompletion(payload.completedIds, "easy", speciesById, initialSpeciesId) || (!practice && score !== playableIds.size)))
    || (!completed && score === playableIds.size))) {
    return Response.json({ error: "식물계 게임 기록 또는 완주 조건이 올바르지 않습니다." }, { status: 400 });
  }
  const flags = {
    ...(payload.event === "grass-sibling-mistake" ? { hasFailed: true, grassSiblingMistake: true } : {}),
    ...(payload.event === "failure" ? { hasFailed: true } : {}),
    ...(payload.event === "practice-start" || (result && practice) ? { practiceStarted: true } : {}),
    ...(result && completed && practice ? { practiceCompleted: true } : {}),
    ...(result && completed && !practice ? { easyCompleted: true } : {}),
  };
  try {
    await getDb().insert(plantProgress).values({
      userId: user.id, ...flags,
      normalAttempts: payload.event === "normal-start" ? 1 : 0,
      bestScore: result && !practice ? score : 0,
      bestPracticeScore: result && practice ? score : 0,
    }).onConflictDoUpdate({
      target: plantProgress.userId,
      set: { ...flags, updatedAt: sql`CAST(CURRENT_TIMESTAMP AS TEXT)`,
        ...(payload.event === "normal-start" ? { normalAttempts: sql`${plantProgress.normalAttempts} + 1` } : {}),
        ...(result && !practice ? { bestScore: sql`CASE WHEN ${plantProgress.bestScore} > ${score} THEN ${plantProgress.bestScore} ELSE ${score} END` } : {}),
        ...(result && practice ? { bestPracticeScore: sql`CASE WHEN ${plantProgress.bestPracticeScore} > ${score} THEN ${plantProgress.bestPracticeScore} ELSE ${score} END` } : {}),
      },
    });
    return Response.json({ ok: true });
  } catch (error) { return storageError(error); }
}
