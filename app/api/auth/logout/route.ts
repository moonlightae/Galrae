import { destroySession } from "../../../game-auth";

export async function POST() {
  await destroySession();
  return Response.json({ ok: true });
}
