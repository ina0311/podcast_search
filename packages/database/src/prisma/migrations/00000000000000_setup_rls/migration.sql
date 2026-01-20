-- ============================================================
-- 1. _prisma_migrations テーブルのRLS設定
-- ============================================================
-- Prismaの内部テーブルなので、PostgREST（anon/authenticated）からアクセス不可にする
-- 注意: service_roleとpostgresロールはRLSをバイパスするため、
--       PrismaとSupabase Studioからは引き続きアクセス可能

-- RLSを有効化
ALTER TABLE IF EXISTS public._prisma_migrations ENABLE ROW LEVEL SECURITY;

-- publicロールから権限剥奪（多層防御）
REVOKE ALL ON public._prisma_migrations FROM public;

-- anon/authenticatedロールからの全アクセスを拒否
DROP POLICY IF EXISTS "_prisma_migrations_deny_all" ON public._prisma_migrations;
CREATE POLICY "_prisma_migrations_deny_all" 
  ON public._prisma_migrations 
  FOR ALL 
  TO anon, authenticated 
  USING (false) 
  WITH CHECK (false);

-- ============================================================
-- 2. 自動RLS設定（イベントトリガー）
-- ============================================================
-- 新しいテーブル作成時に自動でRLSとポリシーを適用する
-- 
-- 動作:
--   - CREATE TABLE 実行時に自動で発火
--   - _prisma_migrations テーブルは自動設定の対象外
--   - すべての新しいテーブルに統一されたRLS設定を自動適用
-- 
-- アクセス制御:
--   - service_role: RLSバイパス（Prismaから全操作可能）
--   - postgres: RLSバイパス（Supabase Studioから全操作可能）
--   - anon: 読み取りのみ（PostgREST経由）
--   - authenticated: 全操作可能（PostgREST経由）
-- 
-- 参考: https://zenn.dev/soooms/articles/144d2a4c85179d
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_enable_rls()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  obj record;
  table_name text;
  normalized_name text;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag = 'CREATE TABLE'
  LOOP
    -- publicスキーマのテーブルのみ対象（_prisma_migrationsは除外）
    IF obj.schema_name = 'public' AND obj.object_identity NOT LIKE '%_prisma_migrations%' THEN
      -- object_identityからスキーマ名を除いたテーブル名を取得
      -- object_identityは "public.PodcastEpisode" のような形式
      table_name := split_part(obj.object_identity, '.', 2);
      
      -- テーブル名から二重引用符を削除（%Iが適切にエスケープするため）
      normalized_name := trim(both '"' from table_name);
      
      -- RLSを有効化
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', normalized_name);
      
      -- publicロールから権限剥奪（多層防御）
      EXECUTE format('REVOKE ALL ON %I FROM public', normalized_name);
      
      -- 既存ポリシーを削除（明示的な設定との整合性を保つため）
      EXECUTE format('DROP POLICY IF EXISTS "anon_select" ON %I', normalized_name);
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_all" ON %I', normalized_name);
      
      -- anonロール: 読み取りのみ許可
      EXECUTE format('CREATE POLICY "anon_select" ON %I FOR SELECT TO anon USING (true)', normalized_name);
      
      -- authenticatedロール: 全操作許可
      EXECUTE format('CREATE POLICY "authenticated_all" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', normalized_name);
      
      RAISE NOTICE 'Auto-enabled RLS: %', normalized_name;
    END IF;
  END LOOP;
END;
$$;

-- イベントトリガーを作成（テーブル作成時に自動実行）
DROP EVENT TRIGGER IF EXISTS auto_enable_rls_trigger;
CREATE EVENT TRIGGER auto_enable_rls_trigger
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE')
  EXECUTE FUNCTION public.auto_enable_rls();
