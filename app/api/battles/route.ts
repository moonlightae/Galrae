import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb } from "../../../db";
import { battles, friendships, users } from "../../../db/schema";
import { getGameUser } from "../../game-auth";
import animalData from "../../../public/data/animals.json";
import plantData from "../../../public/data/plants.json";
import "../../../public/game-logic.js";

export const dynamic = "force-dynamic";
type Battle = typeof battles.$inferSelect;
const logic = (globalThis as typeof globalThis & { GalraeLogic: {
  createDifficultyQueue(species: unknown[], difficulty: string, random: () => number, initial: string): string[];
  buildTree(ids: string[], species: Map<string, unknown>): unknown;
  getExpectedPlacement(ids: string[], current: string, species: Map<string, unknown>): unknown;
  isEquivalentPlacement(tree: unknown, expected: unknown, target: string, placement: string): boolean;
} }).GalraeLogic;
const animalMap = new Map<string, unknown>(animalData.animals.map((species) => [species.id, species]));
const plantMap = new Map<string, unknown>(plantData.plants.map((species) => [species.id, species]));
const failure = (error: string, status = 400) => Response.json({ error }, { status });
const participant = (userId: string) => or(eq(battles.hostId, userId), eq(battles.guestId, userId));

async function views(rooms: Battle[]) {
  if (!rooms.length) return [];
  const ids = [...new Set(rooms.flatMap((room) => [room.hostId, room.guestId]))];
  const players = await getDb().select({ id: users.id, displayName: users.displayName, username: users.username })
    .from(users).where(inArray(users.id, ids));
  return rooms.map((room) => {
    const classified: string[] = JSON.parse(room.classified);
    const queue: string[] = JSON.parse(room.queue);
    return {
      id: room.id, hostId: room.hostId, guestId: room.guestId, kingdom: room.kingdom,
      status: room.status, revision: room.revision, winnerId: room.winnerId, reason: room.reason,
      classified, currentId: queue[classified.length - 1] ?? null, total: queue.length,
      players: players.filter((player) => player.id === room.hostId || player.id === room.guestId),
      turnId: (classified.length - 1) % 2 === 0 ? room.hostId : room.guestId,
    };
  });
}

export async function GET(request: Request) {
  const user = await getGameUser();
  if (!user) return failure("로그인이 필요합니다.", 401);
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (id) {
      const [room] = await getDb().select().from(battles).where(and(eq(battles.id, id), participant(user.id))).limit(1);
      return room ? Response.json({ room: (await views([room]))[0] }) : failure("대결을 찾을 수 없습니다.", 404);
    }
    const rooms = await getDb().select().from(battles).where(participant(user.id))
      .orderBy(desc(battles.createdAt), desc(battles.id)).limit(20);
    return Response.json({ rooms: await views(rooms) });
  } catch (error) {
    console.error("Battle read error", error);
    return failure("대결을 불러오지 못했습니다.", 503);
  }
}

export async function POST(request: Request) {
  const user = await getGameUser();
  if (!user) return failure("로그인이 필요합니다.", 401);
  let body: { action?: unknown; friendId?: unknown; kingdom?: unknown; id?: unknown; revision?: unknown; targetId?: unknown; placement?: unknown };
  try { body = await request.json() as typeof body; } catch { return failure("잘못된 요청입니다."); }
  if (!body || typeof body !== "object" || typeof body.action !== "string" || !["create", "join", "move", "forfeit"].includes(body.action)) return failure("잘못된 대결 동작입니다.");
  try {
    const db = getDb();
    if (body.action === "create") {
      if (typeof body.friendId !== "string" || typeof body.kingdom !== "string" || !["animals", "plants"].includes(body.kingdom)) return failure("친구와 플레이할 계를 선택해 주세요.");
      const [userA, userB] = [user.id, body.friendId].sort();
      const [friend] = await db.select().from(friendships).where(and(eq(friendships.userA, userA), eq(friendships.userB, userB), eq(friendships.accepted, true))).limit(1);
      if (!friend) return failure("서로 수락한 친구에게만 대결을 신청할 수 있습니다.", 403);
      const plant = body.kingdom === "plants";
      const initial = plant ? "hibiscus-syriacus" : "homo-sapiens";
      const queue = logic.createDifficultyQueue(plant ? plantData.plants : animalData.animals, "hard", Math.random, initial);
      await db.insert(battles).values({ id: crypto.randomUUID(), hostId: user.id, guestId: body.friendId,
        kingdom: body.kingdom, queue: JSON.stringify(queue), classified: JSON.stringify([initial]) }).onConflictDoNothing();
      const [room] = await db.select().from(battles).where(and(
        or(and(eq(battles.hostId, user.id), eq(battles.guestId, body.friendId)), and(eq(battles.hostId, body.friendId), eq(battles.guestId, user.id))),
        inArray(battles.status, ["waiting", "active"]),
      )).limit(1);
      return Response.json({ room: (await views([room]))[0] });
    }
    if (typeof body.id !== "string" || !Number.isSafeInteger(body.revision)) return failure("대결 상태를 새로 불러와 주세요.");
    const [room] = await db.select().from(battles).where(and(eq(battles.id, body.id), participant(user.id))).limit(1);
    if (!room) return failure("대결을 찾을 수 없습니다.", 404);
    if (room.revision !== body.revision) return failure("상대의 수가 먼저 반영되었습니다. 다시 확인해 주세요.", 409);
    if (room.status === "finished") return failure("이미 끝난 대결입니다.", 409);
    let change: Partial<typeof battles.$inferInsert>;
    if (body.action === "join") {
      if (room.guestId !== user.id || room.status !== "waiting") return failure("받은 대결 신청만 수락할 수 있습니다.", 409);
      change = { status: "active" };
    } else if (body.action === "forfeit") {
      change = { status: "finished", winnerId: room.status === "active" ? (user.id === room.hostId ? room.guestId : room.hostId) : null, reason: room.status === "waiting" ? "cancelled" : "forfeit" };
    } else {
      const classified: string[] = JSON.parse(room.classified);
      const turnId = (classified.length - 1) % 2 === 0 ? room.hostId : room.guestId;
      if (room.status !== "active" || turnId !== user.id) return failure("현재 상대방의 차례입니다.", 409);
      if (typeof body.targetId !== "string" || body.targetId.length > 100 || typeof body.placement !== "string" || !["wrap", "join"].includes(body.placement)) return failure("배치할 위치를 확인해 주세요.");
      const queue: string[] = JSON.parse(room.queue);
      const species = room.kingdom === "plants" ? plantMap : animalMap;
      const currentId = queue[classified.length - 1];
      const correct = logic.isEquivalentPlacement(logic.buildTree(classified, species), logic.getExpectedPlacement(classified, currentId, species), body.targetId, body.placement);
      if (!correct) change = { status: "finished", winnerId: user.id === room.hostId ? room.guestId : room.hostId, reason: "mistake" };
      else {
        classified.push(currentId);
        change = { classified: JSON.stringify(classified), ...(classified.length === queue.length + 1 ? { status: "finished", reason: "complete" } : {}) };
      }
    }
    const [updated] = await db.update(battles).set({ ...change, revision: room.revision + 1 })
      .where(and(eq(battles.id, room.id), eq(battles.revision, room.revision))).returning();
    return updated ? Response.json({ room: (await views([updated]))[0] }) : failure("상태가 바뀌었습니다. 다시 확인해 주세요.", 409);
  } catch (error) {
    console.error("Battle action error", error);
    return failure("대결을 처리하지 못했습니다.", 503);
  }
}
