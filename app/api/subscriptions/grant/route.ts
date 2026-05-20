import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { storeId, planType } = await req.json();

    if (!storeId || !["trial", "monthly", "annual"].includes(planType)) {
      return NextResponse.json(
        { error: "Invalid request. Provide storeId and a valid planType (trial, monthly, annual)." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify the store exists and get the owner implicitly or we just need the store_id
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("store_id")
      .eq("store_id", storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    const startDate = new Date();
    const endDate = new Date();

    if (planType === "annual") {
      endDate.setFullYear(startDate.getFullYear() + 1);
    } else if (planType === "trial") {
      endDate.setDate(startDate.getDate() + 7);
    } else {
      endDate.setDate(startDate.getDate() + 30);
    }

    const { error: subError } = await supabase
      .from("store_subscriptions")
      .upsert(
        {
          store_id: storeId,
          status: planType === "trial" ? "TRIAL" : "PAID",
          plan_type: planType,
          amount_paid: 0,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          reference_notes: "Granted by Super Admin",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id" }
      );

    if (subError) {
      console.error("Failed to grant subscription:", subError);
      return NextResponse.json(
        { error: "Failed to grant subscription: " + subError.message },
        { status: 500 }
      );
    }

    console.log(
      `✅ Access GRANTED for store ${storeId} — ${planType} plan until ${endDate.toISOString()}`
    );

    return NextResponse.json({
      success: true,
      storeId,
      planType,
    });
  } catch (error) {
    console.error("Grant API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
