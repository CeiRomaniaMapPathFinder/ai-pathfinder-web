export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    status: "UP",
    commit: process.env.APP_COMMIT ?? "unknown",
  });
}
