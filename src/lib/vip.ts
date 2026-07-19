import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Per-user VIP cache. VIP status is checked only for the specific user ids
// that surfaces (chat, rooms, own profile) actually need, via a
// security-definer RPC. We never enumerate the full VIP list.
const cache = new Map<string, boolean>();
const inflight = new Map<string, Promise<boolean>>();

async function fetchVipSubset(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const { data, error } = await supabase.rpc("get_vip_ids" as any, { _ids: ids });
  if (error) return new Set();
  const vipIds = new Set<string>(((data as any[]) ?? []).map((r: any) => (typeof r === "string" ? r : r.user_id ?? r)));
  for (const id of ids) cache.set(id, vipIds.has(id));
  return vipIds;
}

export function useVipUsers(userIds: string[] = []) {
  const key = useMemo(() => Array.from(new Set(userIds)).sort().join(","), [userIds]);
  const [vips, setVips] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const id of userIds) if (cache.get(id)) s.add(id);
    return s;
  });

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    const missing = ids.filter((id) => !cache.has(id));
    if (missing.length === 0) {
      const s = new Set<string>();
      for (const id of ids) if (cache.get(id)) s.add(id);
      setVips(s);
      return;
    }
    let cancelled = false;
    fetchVipSubset(missing).then(() => {
      if (cancelled) return;
      const s = new Set<string>();
      for (const id of ids) if (cache.get(id)) s.add(id);
      setVips(s);
    });
    return () => { cancelled = true; };
  }, [key]);

  return vips;
}

export function useIsVip(userId?: string | null) {
  const ids = useMemo(() => (userId ? [userId] : []), [userId]);
  const vips = useVipUsers(ids);
  return !!userId && vips.has(userId);
}

export function invalidateVipCache(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}
