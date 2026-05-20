import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch all stores and their subscription details
    const { data: stores, error } = await supabase
      .from("stores")
      .select(`
        store_id, 
        store_name, 
        store_subscriptions(
          id, 
          status, 
          plan_type, 
          amount_paid, 
          start_date, 
          end_date
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch stores & subscriptions:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten into the expected format
    const enriched = (stores || []).map((store: any) => {
      // Subscriptions could be an array if 1-to-many, but it should be 1-to-1, returning a single object or empty array
      const sub = Array.isArray(store.store_subscriptions) 
        ? store.store_subscriptions[0] 
        : store.store_subscriptions;

      return {
        id: sub?.id || `no-sub-${store.store_id}`,
        store_id: store.store_id,
        store_name: store.store_name || "Unknown Store",
        status: sub?.status || "NO SUBSCRIPTION",
        plan_type: sub?.plan_type || "monthly",
        amount_paid: sub?.amount_paid || 0,
        start_date: sub?.start_date || null,
        end_date: sub?.end_date || null,
      };
    });

    return NextResponse.json(
      { subscriptions: enriched },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    console.error("Subscriptions API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
