import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: subscriptions, error } = await supabase
      .from("store_subscriptions")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch subscriptions:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich with store names
    const enriched = await Promise.all(
      (subscriptions || []).map(async (sub) => {
        const { data: store } = await supabase
          .from("stores")
          .select("store_name")
          .eq("store_id", sub.store_id)
          .single();

        return {
          ...sub,
          store_name: store?.store_name || "Unknown Store",
        };
      })
    );

    return NextResponse.json({ subscriptions: enriched });
  } catch (error) {
    console.error("Subscriptions API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
