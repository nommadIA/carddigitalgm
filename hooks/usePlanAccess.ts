// hooks/usePlanAccess.ts
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../store/AuthContext";
import {
  FeatureKey,
  PLANS_DATA,
  PlanId,
  QuotaKey,
  UserSubscriptionState,
  checkFeatureAccess,
  checkQuotaAccess,
  getUserSubscription,
  syncUserSubscriptionFromCloud,
} from "../lib/subscriptionPlans";

export function usePlanAccess() {
  const { tenantId, user, isAdmin } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscriptionState>(() =>
    getUserSubscription(tenantId, user?.email)
  );

  const refreshLocal = useCallback(() => {
    setSubscription(getUserSubscription(tenantId, user?.email));
  }, [tenantId, user?.email]);

  const refreshCloud = useCallback(async () => {
    const synced = await syncUserSubscriptionFromCloud(tenantId, user?.email);
    setSubscription(synced);
  }, [tenantId, user?.email]);

  useEffect(() => {
    refreshLocal();
    void refreshCloud();

    const handlePlanUpdated = () => refreshLocal();
    const handleRemotePlanChanged = () => {
      void refreshCloud();
    };
    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        void refreshCloud();
      }
    };

    window.addEventListener("gm_plan_updated", handlePlanUpdated);
    window.addEventListener("gm_users_registry_updated", handlePlanUpdated);
    window.addEventListener("gm_remote_plan_changed", handleRemotePlanChanged);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.removeEventListener("gm_plan_updated", handlePlanUpdated);
      window.removeEventListener("gm_users_registry_updated", handlePlanUpdated);
      window.removeEventListener("gm_remote_plan_changed", handleRemotePlanChanged);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [refreshLocal, refreshCloud]);

  const canAccess = useCallback(
    (feature: FeatureKey) => checkFeatureAccess(subscription, feature),
    [subscription]
  );

  const checkQuota = useCallback(
    (quotaType: QuotaKey, currentCount: number) =>
      checkQuotaAccess(subscription, quotaType, currentCount),
    [subscription]
  );

  const isExpired =
    !isAdmin &&
    !subscription.isSuperAdmin &&
    subscription.planId !== "adm" &&
    (!subscription.isActive ||
      subscription.status === "expirado" ||
      (typeof subscription.daysRemaining === "number" && subscription.daysRemaining <= 0));

  const activePlanId: PlanId | "adm" = subscription.planId;
  const activePlanDef =
    activePlanId === "adm" ? null : PLANS_DATA[activePlanId] || PLANS_DATA.intermediario;

  return {
    subscription,
    activePlanId,
    activePlanDef,
    isSuperAdmin: isAdmin || subscription.isSuperAdmin || subscription.planId === "adm",
    isExpired,
    canAccess,
    checkQuota,
    refreshLocal,
    refreshCloud,
  };
}
