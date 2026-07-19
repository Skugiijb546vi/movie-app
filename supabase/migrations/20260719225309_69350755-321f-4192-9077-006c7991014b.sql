CREATE TABLE public.watch_history (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id text NOT NULL,
  media_kind text NOT NULL,
  position_seconds integer NOT NULL DEFAULT 0,
  duration_seconds integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, media_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_history TO authenticated;
GRANT ALL ON public.watch_history TO service_role;

ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own history select" ON public.watch_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own history insert" ON public.watch_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own history update" ON public.watch_history
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own history delete" ON public.watch_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX watch_history_user_updated_idx ON public.watch_history(user_id, updated_at DESC);