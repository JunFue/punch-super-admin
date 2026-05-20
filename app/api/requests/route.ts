import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch all subscription requests with store name and user info using Joins
    const { data: requests, error } = await supabase
      .from("subscription_requests")
      .select("*, stores(store_name), users!subscription_requests_requester_user_id_fkey(first_name, last_name, email)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch requests:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map the nested objects into a flat structure
    const enriched = (requests || []).map((req: any) => {
      const storeName = req.stores?.store_name || "Unknown Store";
      const user = req.users;
      return {
        ...req,
        store_name: storeName,
        requester_name: user
          ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
          : "Unknown",
        requester_email: user?.email || null,
        stores: undefined,
        users: undefined,
      };
    });

    return NextResponse.json(
      { requests: enriched },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    console.error("Requests API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
