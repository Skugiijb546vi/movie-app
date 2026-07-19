
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.movie_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX movie_comments_media_id_idx ON public.movie_comments(media_id, created_at DESC);

GRANT SELECT ON public.movie_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movie_comments TO authenticated;
GRANT ALL ON public.movie_comments TO service_role;

ALTER TABLE public.movie_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are readable by everyone"
  ON public.movie_comments FOR SELECT USING (true);
CREATE POLICY "Users insert own comments"
  ON public.movie_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own comments"
  ON public.movie_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments"
  ON public.movie_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_movie_comments_updated_at
  BEFORE UPDATE ON public.movie_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.movie_comments;
