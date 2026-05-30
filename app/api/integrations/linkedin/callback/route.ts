import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { exchangeLinkedInCode, getLinkedInProfile, getLinkedInRecentPosts } from "@/lib/integrations/linkedin";
import { db } from "@/lib/db";
import { batchExtractMemories } from "@/lib/memory";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET(req: Request) {
  try {
    const user = await getOrCreateUser();
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(`${APP_URL}/settings?tab=integrations&error=linkedin_denied`);
    }

    const tokens = await exchangeLinkedInCode(code);
    const profile = await getLinkedInProfile(tokens.access_token);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    const profileData = JSON.stringify({ name: profile.name, sub: profile.sub, picture: profile.picture });

    await db.integration.upsert({
      where: { userId_provider: { userId: user.id, provider: "linkedin" } },
      create: {
        userId: user.id,
        provider: "linkedin",
        accessToken: tokens.access_token,
        expiresAt,
        profileData,
      },
      update: {
        accessToken: tokens.access_token,
        expiresAt,
        profileData,
      },
    });

    // Kick off background sync of posts into memory
    const urn = `urn:li:person:${profile.sub}`;
    getLinkedInRecentPosts(tokens.access_token, urn)
      .then(posts => {
        if (posts.length > 0) {
          return batchExtractMemories(user.id, posts.join("\n"), "LinkedIn post");
        }
      })
      .catch(err => console.error("[LINKEDIN_SYNC_ERROR]", err));

    return NextResponse.redirect(`${APP_URL}/settings?tab=integrations&success=linkedin`);
  } catch (err) {
    console.error("[LINKEDIN_CALLBACK_ERROR]", err);
    return NextResponse.redirect(`${APP_URL}/settings?tab=integrations&error=linkedin_failed`);
  }
}
