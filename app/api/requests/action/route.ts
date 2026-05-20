import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { requestId, action } = await req.json();

    if (!requestId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request. Provide requestId and action (approve/reject)." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch the subscription request
    const { data: request, error: fetchError } = await supabase
      .from("subscription_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !request) {
      return NextResponse.json(
        { error: "Subscription request not found" },
        { status: 404 }
      );
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been processed" },
        { status: 400 }
      );
    }

    // 2. Update the request status
    const { error: updateError } = await supabase
      .from("subscription_requests")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("Failed to update request:", updateError);
      return NextResponse.json(
        { error: "Failed to update request status" },
        { status: 500 }
      );
    }

    // 3. If approved, upsert the store_subscriptions record
    if (action === "approve") {
      const startDate = new Date();
      const endDate = new Date();

      if (request.plan_type === "annual") {
        endDate.setFullYear(startDate.getFullYear() + 1);
      } else if (request.plan_type === "trial") {
        endDate.setDate(startDate.getDate() + 7);
      } else {
        endDate.setDate(startDate.getDate() + 30);
      }

      const { error: subError } = await supabase
        .from("store_subscriptions")
        .upsert(
          {
            store_id: request.store_id,
            status: request.plan_type === "trial" ? "TRIAL" : "PAID",
            plan_type: request.plan_type,
            amount_paid: request.amount,
            payer_user_id: request.requester_user_id,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            reference_notes: request.plan_type === "trial" 
              ? "Approved 7-Day Free Trial" 
              : (request.gcash_reference
                ? `GCash Ref: ${request.gcash_reference}`
                : `Approved via Super Admin`),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id" }
        );

      if (subError) {
        console.error("Failed to upsert subscription:", subError);
        return NextResponse.json(
          { error: "Failed to activate subscription: " + subError.message },
          { status: 500 }
        );
      }

      console.log(
        `✅ Subscription APPROVED for store ${request.store_id} — ${request.plan_type} plan until ${endDate.toISOString()}`
      );
    } else {
      console.log(
        `❌ Subscription REJECTED for store ${request.store_id}`
      );
    }

    return NextResponse.json({
      success: true,
      action,
      requestId,
    });
  } catch (error) {
    console.error("Action API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
