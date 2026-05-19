import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch all subscription requests with store info
    const { data: requests, error } = await supabase
      .from("subscription_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch requests:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich with store names and user info
    const enriched = await Promise.all(
      (requests || []).map(async (req) => {
        // Get store name
        const { data: store } = await supabase
          .from("stores")
          .select("store_name")
          .eq("store_id", req.store_id)
          .single();

        // Get requester info
        const { data: user } = await supabase
          .from("users")
          .select("first_name, last_name, email")
          .eq("user_id", req.requester_user_id)
          .single();

        return {
          ...req,
          store_name: store?.store_name || "Unknown Store",
          requester_name: user
            ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
            : "Unknown",
          requester_email: user?.email || null,
        };
      })
    );

    return NextResponse.json({ requests: enriched });
  } catch (error) {
    console.error("Requests API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
