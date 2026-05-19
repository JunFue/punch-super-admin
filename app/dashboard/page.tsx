"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  Shield,
  LogOut,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Store,
  User,
  Smartphone,
  Building2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Inbox,
  CreditCard,
  Sparkles,
  AlertCircle,
} from "lucide-react";

dayjs.extend(relativeTime);

// ============================================================
// Types
// ============================================================
interface SubscriptionRequest {
  id: string;
  store_id: string;
  requester_user_id: string;
  plan_type: "monthly" | "annual";
  payment_method: "gcash_to_gcash" | "otc_to_gcash";
  amount: number;
  status: "pending" | "approved" | "rejected";
  gcash_reference: string | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  // Joined fields
  store_name?: string;
  requester_name?: string;
  requester_email?: string;
}

interface StoreSubscription {
  id: string;
  store_id: string;
  status: string;
  plan_type: string;
  amount_paid: number;
  start_date: string;
  end_date: string;
  store_name?: string;
}

type Tab = "pending" | "history" | "subscriptions";

// ============================================================
// Dashboard Page
// ============================================================
export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [subscriptions, setSubscriptions] = useState<StoreSubscription[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const adminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
      
      if (!user) {
        router.replace("/");
      } else if (user.email !== adminEmail) {
        supabase.auth.signOut().then(() => {
          router.replace("/");
          alert("Access denied. This dashboard is restricted to the super admin.");
        });
      } else {
        setLoading(false);
      }
    });
  }, [router, supabase.auth]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setRefreshing(true);

    // Fetch all subscription requests using the API route (service role)
    const reqRes = await fetch("/api/requests");
    if (reqRes.ok) {
      const data = await reqRes.json();
      setRequests(data.requests || []);
    }

    // Fetch all store subscriptions
    const subRes = await fetch("/api/subscriptions");
    if (subRes.ok) {
      const data = await subRes.json();
      setSubscriptions(data.subscriptions || []);
    }

    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!loading) fetchData();
  }, [loading, fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [loading, fetchData]);

  const handleAction = async (
    requestId: string,
    action: "approve" | "reject"
  ) => {
    setActionLoading(requestId);

    const res = await fetch("/api/requests/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action }),
    });

    if (res.ok) {
      await fetchData();
    } else {
      const err = await res.json();
      alert(`Action failed: ${err.error || "Unknown error"}`);
    }

    setActionLoading(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const historyRequests = requests.filter((r) => r.status !== "pending");

  // Stats
  const totalActive = subscriptions.filter((s) => {
    const endDate = s.end_date ? new Date(s.end_date) : null;
    return s.status === "PAID" && endDate && endDate > new Date();
  }).length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--color-primary-light)] border border-[var(--color-primary-border)] rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">PUNCH Super Admin</h1>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">
                Subscription Manager
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData()}
              disabled={refreshing}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 animate-fade-in">
          <StatCard
            label="Pending"
            value={pendingRequests.length}
            icon={<Clock className="w-4 h-4" />}
            color="warning"
          />
          <StatCard
            label="Active Stores"
            value={totalActive}
            icon={<CheckCircle2 className="w-4 h-4" />}
            color="success"
          />
          <StatCard
            label="Total Requests"
            value={requests.length}
            icon={<CreditCard className="w-4 h-4" />}
            color="primary"
          />
          <StatCard
            label="Total Stores"
            value={subscriptions.length}
            icon={<Store className="w-4 h-4" />}
            color="primary"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-1 mb-6 animate-fade-in-delay">
          {[
            { id: "pending" as Tab, label: "Pending", count: pendingRequests.length },
            { id: "history" as Tab, label: "History", count: historyRequests.length },
            { id: "subscriptions" as Tab, label: "All Stores", count: subscriptions.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? "bg-[var(--color-bg-elevated)] text-[var(--color-text)] shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] ${
                    activeTab === tab.id
                      ? tab.id === "pending"
                        ? "bg-[var(--color-warning)] text-black"
                        : "bg-[var(--color-border)] text-[var(--color-text-secondary)]"
                      : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "pending" && (
          <div className="space-y-4 animate-fade-in">
            {pendingRequests.length === 0 ? (
              <EmptyState
                icon={<Inbox className="w-12 h-12" />}
                title="No Pending Requests"
                description="All subscription requests have been processed."
              />
            ) : (
              pendingRequests.map((req) => (
                <RequestCard
                  key={req.id}
                  request={req}
                  expanded={expandedId === req.id}
                  onToggle={() =>
                    setExpandedId(expandedId === req.id ? null : req.id)
                  }
                  onApprove={() => handleAction(req.id, "approve")}
                  onReject={() => handleAction(req.id, "reject")}
                  actionLoading={actionLoading === req.id}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3 animate-fade-in">
            {historyRequests.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="w-12 h-12" />}
                title="No History Yet"
                description="Processed requests will appear here."
              />
            ) : (
              historyRequests.map((req) => (
                <HistoryRow key={req.id} request={req} />
              ))
            )}
          </div>
        )}

        {activeTab === "subscriptions" && (
          <div className="space-y-3 animate-fade-in">
            {subscriptions.length === 0 ? (
              <EmptyState
                icon={<Store className="w-12 h-12" />}
                title="No Subscriptions"
                description="Store subscriptions will appear here."
              />
            ) : (
              subscriptions.map((sub) => (
                <SubscriptionRow key={sub.id} subscription={sub} />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================
// Sub-Components
// ============================================================

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "primary" | "success" | "warning" | "danger";
}) {
  const colorMap = {
    primary: {
      bg: "var(--color-primary-light)",
      border: "var(--color-primary-border)",
      text: "var(--color-primary)",
    },
    success: {
      bg: "var(--color-success-light)",
      border: "var(--color-success-border)",
      text: "var(--color-success)",
    },
    warning: {
      bg: "var(--color-warning-light)",
      border: "var(--color-warning-border)",
      text: "var(--color-warning)",
    },
    danger: {
      bg: "var(--color-danger-light)",
      border: "var(--color-danger-border)",
      text: "var(--color-danger)",
    },
  };

  const c = colorMap[color];

  return (
    <div
      className="p-4 rounded-xl border transition-all"
      style={{
        backgroundColor: c.bg,
        borderColor: c.border,
      }}
    >
      <div className="flex items-center gap-2 mb-2" style={{ color: c.text }}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
          {label}
        </span>
      </div>
      <p className="text-2xl font-black" style={{ color: c.text }}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
      <div className="mb-4 opacity-30">{icon}</div>
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      <p className="text-sm">{description}</p>
    </div>
  );
}

function RequestCard({
  request,
  expanded,
  onToggle,
  onApprove,
  onReject,
  actionLoading,
}: {
  request: SubscriptionRequest;
  expanded: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  actionLoading: boolean;
}) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-warning-border)] rounded-2xl overflow-hidden transition-all hover:border-[var(--color-warning)]/40">
      {/* Main Row */}
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center gap-4 text-left"
      >
        {/* Pulse Indicator */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 bg-[var(--color-warning-light)] rounded-xl flex items-center justify-center border border-[var(--color-warning-border)]">
            <Clock className="w-5 h-5 text-[var(--color-warning)]" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[var(--color-warning)] rounded-full animate-pulse-dot" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-sm text-[var(--color-text)] truncate">
              {request.store_name || request.store_id.slice(0, 8)}
            </span>
            <span className="px-2 py-0.5 bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] text-[var(--color-warning)] text-[10px] font-black uppercase tracking-wider rounded-full">
              {request.plan_type}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {request.requester_name || request.requester_email || "Unknown"}
            </span>
            <span>·</span>
            <span>{dayjs(request.created_at).fromNow()}</span>
          </div>
        </div>

        <div className="text-right shrink-0 mr-2">
          <p className="text-lg font-black text-[var(--color-success)]">
            ₱{Number(request.amount).toLocaleString()}
          </p>
        </div>

        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
        )}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-[var(--color-border)] pt-4 animate-fade-in">
          <div className="grid sm:grid-cols-2 gap-3 mb-5">
            <DetailRow
              label="Payment Method"
              value={
                request.payment_method === "gcash_to_gcash"
                  ? "GCash to GCash"
                  : "Over-the-Counter"
              }
              icon={
                request.payment_method === "gcash_to_gcash" ? (
                  <Smartphone className="w-3.5 h-3.5" />
                ) : (
                  <Building2 className="w-3.5 h-3.5" />
                )
              }
            />
            <DetailRow
              label="GCash Reference"
              value={request.gcash_reference || "Not provided"}
              icon={<CreditCard className="w-3.5 h-3.5" />}
              mono
            />
            <DetailRow
              label="Email"
              value={request.requester_email || "N/A"}
              icon={<User className="w-3.5 h-3.5" />}
            />
            <DetailRow
              label="Submitted"
              value={dayjs(request.created_at).format("MMM D, YYYY · h:mm A")}
              icon={<Clock className="w-3.5 h-3.5" />}
            />
            <DetailRow
              label="Store ID"
              value={request.store_id}
              icon={<Store className="w-3.5 h-3.5" />}
              mono
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              id={`reject-btn-${request.id}`}
              onClick={onReject}
              disabled={actionLoading}
              className="flex-1 py-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-light)] text-[var(--color-danger)] font-bold text-sm hover:bg-[var(--color-danger)]/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
            <button
              id={`approve-btn-${request.id}`}
              onClick={onApprove}
              disabled={actionLoading}
              className="flex-[2] py-3 rounded-xl bg-[var(--color-success)] hover:bg-emerald-400 text-black font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-[var(--color-success)]/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Approve Subscription
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  icon,
  mono,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg)]/60">
      <div className="text-[var(--color-text-muted)]">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5">
          {label}
        </p>
        <p
          className={`text-sm text-[var(--color-text-secondary)] truncate ${
            mono ? "font-mono text-xs" : "font-medium"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function HistoryRow({ request }: { request: SubscriptionRequest }) {
  const isApproved = request.status === "approved";
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{
          backgroundColor: isApproved
            ? "var(--color-success-light)"
            : "var(--color-danger-light)",
          borderWidth: 1,
          borderColor: isApproved
            ? "var(--color-success-border)"
            : "var(--color-danger-border)",
        }}
      >
        {isApproved ? (
          <CheckCircle2
            className="w-5 h-5"
            style={{ color: "var(--color-success)" }}
          />
        ) : (
          <XCircle
            className="w-5 h-5"
            style={{ color: "var(--color-danger)" }}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-[var(--color-text)] truncate">
          {request.store_name || request.store_id.slice(0, 8)}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {request.requester_name || request.requester_email} ·{" "}
          <span className="capitalize">{request.plan_type}</span> ·{" "}
          {dayjs(request.reviewed_at || request.created_at).format(
            "MMM D, YYYY"
          )}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="font-bold text-sm text-[var(--color-text)]">
          ₱{Number(request.amount).toLocaleString()}
        </p>
        <p
          className="text-[10px] font-black uppercase tracking-widest"
          style={{
            color: isApproved
              ? "var(--color-success)"
              : "var(--color-danger)",
          }}
        >
          {request.status}
        </p>
      </div>
    </div>
  );
}

function SubscriptionRow({
  subscription,
}: {
  subscription: StoreSubscription;
}) {
  const endDate = subscription.end_date
    ? new Date(subscription.end_date)
    : null;
  const isActive =
    subscription.status === "PAID" && endDate && endDate > new Date();
  const isExpired = endDate && endDate <= new Date();

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
        style={{
          backgroundColor: isActive
            ? "var(--color-success-light)"
            : "var(--color-bg-elevated)",
          borderColor: isActive
            ? "var(--color-success-border)"
            : "var(--color-border)",
        }}
      >
        <Store
          className="w-5 h-5"
          style={{
            color: isActive
              ? "var(--color-success)"
              : "var(--color-text-muted)",
          }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-[var(--color-text)] truncate">
          {subscription.store_name || subscription.store_id.slice(0, 8)}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          <span className="capitalize">{subscription.plan_type || "monthly"}</span> ·{" "}
          {endDate
            ? `Expires ${dayjs(endDate).format("MMM D, YYYY")}`
            : "No end date"}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="font-bold text-sm text-[var(--color-text)]">
          ₱{Number(subscription.amount_paid || 0).toLocaleString()}
        </p>
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{
            color: isActive
              ? "var(--color-success)"
              : isExpired
              ? "var(--color-danger)"
              : "var(--color-text-muted)",
          }}
        >
          {isActive ? "ACTIVE" : isExpired ? "EXPIRED" : subscription.status}
        </span>
      </div>
    </div>
  );
}
