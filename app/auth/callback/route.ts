import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const destination =
    next === "/reset-password" ? "/reset-password" : "/account";
  if (code) {
    const { error } = await (await db()).auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(destination, process.env.NEXT_PUBLIC_APP_URL || request.url),
      );
  }
  return NextResponse.redirect(
    new URL(
      "/login?error=verification",
      process.env.NEXT_PUBLIC_APP_URL || request.url,
    ),
  );
}
