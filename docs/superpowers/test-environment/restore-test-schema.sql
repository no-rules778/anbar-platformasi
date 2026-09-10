-- TEST ONLY: schema captured read-only from production 2026-09-03.

-- No operational records, auth users, or sequence current values included.

BEGIN;

SET LOCAL search_path = public, extensions;

SET LOCAL check_function_bodies = false;

DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public') THEN RAISE EXCEPTION 'Refuse nonempty public schema'; END IF; END $$;

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE SEQUENCE public."warehouses_id_seq" AS integer INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1;

CREATE SEQUENCE public."serfiyyat_doc_seq" AS bigint INCREMENT 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1;

CREATE TABLE public."audit_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ts" timestamp with time zone DEFAULT now(),
  "user_id" uuid,
  "action" text,
  "table_name" text,
  "record_id" text,
  "old_values" jsonb,
  "new_values" jsonb,
  "reason" text
);

CREATE TABLE public."azp_application_balances" (
  "module" text NOT NULL,
  "current_balance" numeric(14,2) DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid
);

CREATE TABLE public."azp_audit_log" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "module" text NOT NULL,
  "entity" text NOT NULL,
  "action" text NOT NULL,
  "entity_id" text,
  "detail" jsonb,
  "actor" uuid,
  "at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."azp_cards" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "module" text NOT NULL,
  "card_no" text NOT NULL,
  "holder" text NOT NULL,
  "project" text,
  "note" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid
);

CREATE TABLE public."azp_movements" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "module" text NOT NULL,
  "card_id" uuid NOT NULL,
  "op_date" date,
  "kind" text NOT NULL,
  "amount" numeric(14,2) NOT NULL,
  "doc_num" text,
  "note" text,
  "vat_included" boolean DEFAULT false NOT NULL,
  "cancelled" boolean DEFAULT false NOT NULL,
  "cancelled_at" timestamp with time zone,
  "cancelled_by" uuid,
  "cancel_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "app_balance_effect" boolean DEFAULT false NOT NULL,
  "replaces_id" bigint,
  "replaced_by" bigint
);

CREATE TABLE public."item_requests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "name_norm" text NOT NULL,
  "unit" text,
  "category" text,
  "note" text,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "created_by" uuid NOT NULL,
  "created_warehouse" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "decided_by" uuid,
  "decided_at" timestamp with time zone,
  "decision_reason" text,
  "item_code" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."items" (
  "code" text NOT NULL,
  "name" text NOT NULL,
  "unit" text DEFAULT 'ədəd'::text,
  "price" numeric(12,4) DEFAULT 0,
  "price_source" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "category" text
);

CREATE TABLE public."movements" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "date" date NOT NULL,
  "warehouse" text NOT NULL,
  "item_code" text NOT NULL,
  "in_qty" numeric(12,4) DEFAULT 0,
  "out_qty" numeric(12,4) DEFAULT 0,
  "type" text NOT NULL,
  "partner" text,
  "contract_num" text,
  "invoice_num" text,
  "price" numeric(12,4) DEFAULT 0,
  "note" text,
  "doc_num" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "channel" text
);

CREATE TABLE public."partners" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "voen" text,
  "contract" text,
  "contract_date" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "active" boolean DEFAULT true NOT NULL
);

CREATE TABLE public."reference_values" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "kind" text NOT NULL,
  "name" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."serfiyyat_documents" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "doc_num" text NOT NULL,
  "project_id" uuid NOT NULL,
  "kontragent" text,
  "avtomobil_nomresi" text,
  "alinma_kanali" text,
  "doc_date" date NOT NULL,
  "note" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "invoice_num" text
);

CREATE TABLE public."serfiyyat_lines" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "item_code" text NOT NULL,
  "qty" numeric(14,2) NOT NULL,
  "price" numeric(14,2) DEFAULT 0 NOT NULL,
  "line_sum" numeric(14,2) GENERATED ALWAYS AS (round((qty * price), 2)) STORED,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."serfiyyat_projects" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "linked_warehouse" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."sessions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "device_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "device_label" text
);

CREATE TABLE public."stock_conditions" (
  "warehouse" text NOT NULL,
  "item_code" text NOT NULL,
  "unfit_qty" numeric(14,2) DEFAULT 0 NOT NULL,
  "repair_qty" numeric(14,2) DEFAULT 0 NOT NULL,
  "onsite_qty" numeric(14,2) DEFAULT 0 NOT NULL,
  "note" text,
  "updated_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "icare_qty" numeric(14,2) DEFAULT 0 NOT NULL
);

CREATE TABLE public."stock_layer_allocations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "writeoff_movement_id" uuid NOT NULL,
  "layer_id" uuid NOT NULL,
  "qty" numeric(18,4) NOT NULL,
  "source_movement_id" uuid,
  "source_doc_num_snapshot" text,
  "source_invoice_snapshot" text,
  "source_date_snapshot" date,
  "price_status_snapshot" text NOT NULL,
  "unit_price_snapshot" numeric(18,4),
  "source_amount_snapshot" numeric(18,2),
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reversed_at" timestamp with time zone
);

CREATE TABLE public."stock_layer_requests" (
  "request_key" uuid NOT NULL,
  "actor_id" uuid NOT NULL,
  "payload_hash" text NOT NULL,
  "payload" jsonb NOT NULL,
  "result" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone
);

CREATE TABLE public."stock_layer_settings" (
  "singleton" boolean DEFAULT true NOT NULL,
  "schema_version" integer DEFAULT 36 NOT NULL,
  "active" boolean DEFAULT false NOT NULL,
  "cutover_at" timestamp with time zone,
  "cutover_by" uuid,
  "cutover_movement_count" bigint,
  "cutover_max_created_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."stock_layer_transfers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "transfer_out_movement_id" uuid NOT NULL,
  "transfer_in_movement_id" uuid NOT NULL,
  "source_layer_id" uuid NOT NULL,
  "destination_layer_id" uuid NOT NULL,
  "qty" numeric(18,4) NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reversed_at" timestamp with time zone
);

CREATE TABLE public."stock_layers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "warehouse" text NOT NULL,
  "item_code" text NOT NULL,
  "source_type" text NOT NULL,
  "source_movement_id" uuid,
  "root_movement_id" uuid,
  "parent_layer_id" uuid,
  "received_date" date,
  "source_doc_num" text,
  "source_invoice_num" text,
  "price_status" text NOT NULL,
  "unit_price" numeric(18,4),
  "initial_qty" numeric(18,4) NOT NULL,
  "available_qty" numeric(18,4) NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."users" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "email" text,
  "name" text NOT NULL,
  "role" text DEFAULT 'baxis'::text NOT NULL,
  "warehouse" text,
  "active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE public."warehouses" (
  "id" integer DEFAULT nextval('warehouses_id_seq'::regclass) NOT NULL,
  "name" text NOT NULL,
  "type" text DEFAULT 'anbar'::text,
  "active" boolean DEFAULT true
);

CREATE TABLE public."writeoff_valuations" (
  "movement_id" uuid NOT NULL,
  "source_amount" numeric(18,2),
  "known_amount" numeric(18,2) DEFAULT 0 NOT NULL,
  "unknown_qty" numeric(18,4) DEFAULT 0 NOT NULL,
  "final_amount" numeric(18,2),
  "valuation_method" text NOT NULL,
  "override_reason" text,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reversed_by_movement_id" uuid,
  "reversed_at" timestamp with time zone
);

CREATE OR REPLACE FUNCTION public.activate_stock_layers(p_expected_movement_count bigint, p_expected_max_created_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_count BIGINT; v_max TIMESTAMPTZ; v_seeded BIGINT; v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role:=public.current_user_role();
  IF v_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Yalnız Admin partiya uçotunu aktiv edə bilər'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('stock-layers-cutover'));
  LOCK TABLE public.movements IN SHARE MODE;
  IF (SELECT active FROM public.stock_layer_settings WHERE singleton=TRUE) THEN
    RAISE EXCEPTION 'Partiya uçotu artıq aktivdir';
  END IF;
  IF EXISTS(SELECT 1 FROM public.stock_layers) THEN
    RAISE EXCEPTION 'Partiya cədvəli boş deyil — təkrar ilkinləşdirmə dayandırıldı';
  END IF;
  SELECT COUNT(*),MAX(created_at) INTO v_count,v_max FROM public.movements;
  IF v_count IS DISTINCT FROM p_expected_movement_count
     OR v_max IS DISTINCT FROM p_expected_max_created_at THEN
    RAISE EXCEPTION 'Məlumat dəyişib: preflight yenidən işə salın (say %, son tarix %)',v_count,v_max;
  END IF;
  IF EXISTS(SELECT 1 FROM (SELECT warehouse,item_code,SUM(in_qty-out_qty) q
                            FROM public.movements GROUP BY warehouse,item_code) s WHERE q<0) THEN
    RAISE EXCEPTION 'Mənfi qalıq var — partiya uçotu aktiv edilə bilməz';
  END IF;
  INSERT INTO public.stock_layers(warehouse,item_code,source_type,received_date,price_status,
                                  unit_price,initial_qty,available_qty,created_by)
  SELECT warehouse,item_code,'legacy_unresolved',CURRENT_DATE,'unknown',NULL,q,q,auth.uid()
  FROM (SELECT warehouse,item_code,ROUND(SUM(in_qty-out_qty),4) q
        FROM public.movements GROUP BY warehouse,item_code) b WHERE q>0;
  GET DIAGNOSTICS v_seeded=ROW_COUNT;
  UPDATE public.stock_layer_settings SET active=TRUE,cutover_at=now(),cutover_by=auth.uid(),
    cutover_movement_count=v_count,cutover_max_created_at=v_max,updated_at=now()
  WHERE singleton=TRUE;
  RETURN jsonb_build_object('active',TRUE,'seeded_layers',v_seeded,'movement_count',v_count,'max_created_at',v_max);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_user(p_user_id uuid, p_role text, p_warehouse text DEFAULT NULL::text, p_active boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_role TEXT;
  v_target      public.users%ROWTYPE;
  v_wh          TEXT;
  v_admin_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı';
  END IF;
  v_caller_role := public.current_user_role();
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: yalnız Admin istifadəçiləri idarə edə bilər';
  END IF;

  IF p_user_id IS NULL THEN RAISE EXCEPTION 'İstifadəçi tələb olunur'; END IF;
  IF p_role NOT IN ('admin', 'rehber', 'anbardar', 'techizat', 'muhasib', 'baxis') THEN
    RAISE EXCEPTION 'Etibarsız rol: %', p_role;
  END IF;

  SELECT * INTO v_target FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'İstifadəçi tapılmadı'; END IF;

  -- Normalise warehouse: only anbardar keeps one; the trigger re-validates.
  IF p_role = 'anbardar' THEN
    v_wh := NULLIF(TRIM(COALESCE(p_warehouse, '')), '');
    IF v_wh IS NULL THEN
      RAISE EXCEPTION 'anbardar üçün anbar tələb olunur';
    END IF;
    IF v_wh = 'Ofis' THEN
      RAISE EXCEPTION 'anbardar Ofisə təyin edilə bilməz';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.warehouses w
                   WHERE w.name = v_wh AND w.type = 'anbar' AND w.active = TRUE) THEN
      RAISE EXCEPTION 'Anbar tapılmadı və ya aktiv deyil: %', v_wh;
    END IF;
  ELSE
    v_wh := NULL;
  END IF;

  -- Lockout protection.
  IF p_user_id = auth.uid() THEN
    IF p_role <> 'admin' THEN
      RAISE EXCEPTION 'Öz rolunuzu Admin-dən dəyişə bilməzsiniz';
    END IF;
    IF p_active IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'Öz hesabınızı deaktiv edə bilməzsiniz';
    END IF;
  END IF;
  IF v_target.role = 'admin' AND (p_role <> 'admin' OR p_active IS DISTINCT FROM TRUE) THEN
    SELECT COUNT(*) INTO v_admin_count FROM public.users WHERE role = 'admin' AND active = TRUE;
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Sistemdə ən azı bir aktiv Admin qalmalıdır';
    END IF;
  END IF;

  UPDATE public.users
     SET role = p_role, warehouse = v_wh, active = COALESCE(p_active, TRUE)
   WHERE id = p_user_id;

  RETURN jsonb_build_object('id', p_user_id, 'role', p_role, 'warehouse', v_wh, 'active', COALESCE(p_active, TRUE));
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_cond_delta(p_warehouse text, p_item_code text, p_key text, p_delta numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wh          TEXT    := NULLIF(btrim(COALESCE(p_warehouse, '')), '');
  v_code        TEXT    := NULLIF(btrim(COALESCE(p_item_code, '')), '');
  v_k           TEXT    := lower(btrim(COALESCE(p_key, '')));
  v_d           NUMERIC := COALESCE(p_delta, 0);
  v_row         public.stock_conditions%ROWTYPE;
  v_has         BOOLEAN;
  v_new_unfit   NUMERIC;
  v_new_repair  NUMERIC;
  v_new_onsite  NUMERIC;
BEGIN
  IF v_wh IS NULL OR v_code IS NULL OR v_d = 0 THEN RETURN; END IF;
  IF v_d IN ('NaN'::NUMERIC, 'Infinity'::NUMERIC, '-Infinity'::NUMERIC) THEN RETURN; END IF;

  IF v_k = 'icare' THEN PERFORM public.apply_icare_delta(v_wh, v_code, v_d); RETURN; END IF;
  IF v_k NOT IN ('unfit', 'repair', 'onsite') THEN
    RAISE EXCEPTION 'Naməlum vəziyyət tipi: %', p_key;
  END IF;

  SELECT * INTO v_row FROM public.stock_conditions
   WHERE warehouse = v_wh AND item_code = v_code FOR UPDATE;
  v_has := FOUND;

  IF NOT v_has AND v_d < 0 THEN RETURN; END IF;

  IF NOT v_has THEN
    INSERT INTO public.stock_conditions
      (warehouse, item_code, unfit_qty, repair_qty, onsite_qty, icare_qty, updated_by, updated_at)
    VALUES (v_wh, v_code,
            CASE WHEN v_k = 'unfit'  THEN ROUND(v_d, 2) ELSE 0 END,
            CASE WHEN v_k = 'repair' THEN ROUND(v_d, 2) ELSE 0 END,
            CASE WHEN v_k = 'onsite' THEN ROUND(v_d, 2) ELSE 0 END,
            0, auth.uid(), now())
    ON CONFLICT (warehouse, item_code) DO UPDATE SET
      unfit_qty  = CASE WHEN v_k = 'unfit'  THEN ROUND(GREATEST(public.stock_conditions.unfit_qty  + v_d, 0), 2) ELSE public.stock_conditions.unfit_qty  END,
      repair_qty = CASE WHEN v_k = 'repair' THEN ROUND(GREATEST(public.stock_conditions.repair_qty + v_d, 0), 2) ELSE public.stock_conditions.repair_qty END,
      onsite_qty = CASE WHEN v_k = 'onsite' THEN ROUND(GREATEST(public.stock_conditions.onsite_qty + v_d, 0), 2) ELSE public.stock_conditions.onsite_qty END,
      updated_by = auth.uid(), updated_at = now();
    RETURN;
  END IF;

  -- <<031-fix 2026-08-24>> Compute new bucket values FIRST, then choose
  -- DELETE-vs-UPDATE. Old code did UPDATE then DELETE; the UPDATE that
  -- emptied the last bucket tripped stock_conditions_not_empty and
  -- rolled back the whole document — the DELETE never ran.
  v_new_unfit  := CASE WHEN v_k = 'unfit'  THEN ROUND(GREATEST(COALESCE(v_row.unfit_qty,  0) + v_d, 0), 2) ELSE COALESCE(v_row.unfit_qty,  0) END;
  v_new_repair := CASE WHEN v_k = 'repair' THEN ROUND(GREATEST(COALESCE(v_row.repair_qty, 0) + v_d, 0), 2) ELSE COALESCE(v_row.repair_qty, 0) END;
  v_new_onsite := CASE WHEN v_k = 'onsite' THEN ROUND(GREATEST(COALESCE(v_row.onsite_qty, 0) + v_d, 0), 2) ELSE COALESCE(v_row.onsite_qty, 0) END;

  IF v_new_unfit = 0 AND v_new_repair = 0 AND v_new_onsite = 0
     AND COALESCE(v_row.icare_qty, 0) = 0
     AND COALESCE(btrim(v_row.note), '') = '' THEN
    DELETE FROM public.stock_conditions
      WHERE warehouse = v_wh AND item_code = v_code;
  ELSE
    UPDATE public.stock_conditions SET
      unfit_qty  = v_new_unfit,
      repair_qty = v_new_repair,
      onsite_qty = v_new_onsite,
      updated_by = auth.uid(), updated_at = now()
    WHERE warehouse = v_wh AND item_code = v_code;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_cond_split(p_src text, p_dst text, p_item_code text, p_conditions jsonb, p_qty numeric, p_type text, p_doc_num text, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_k    TEXT;
  v_v    NUMERIC;
  v_sum  NUMERIC := 0;
  v_have NUMERIC;
  v_row  public.stock_conditions%ROWTYPE;
BEGIN
  IF p_conditions IS NULL OR jsonb_typeof(p_conditions) <> 'object' THEN RETURN; END IF;

  SELECT * INTO v_row FROM public.stock_conditions
   WHERE warehouse = p_src AND item_code = p_item_code FOR UPDATE;

  FOR v_k, v_v IN SELECT key, value::TEXT::NUMERIC FROM jsonb_each_text(p_conditions) LOOP
    IF v_k NOT IN ('unfit', 'repair', 'onsite', 'icare') THEN
      RAISE EXCEPTION 'Naməlum vəziyyət tipi: %', v_k;
    END IF;
    IF v_v IS NULL OR v_v < 0 THEN
      RAISE EXCEPTION '"%": vəziyyət miqdarı mənfi ola bilməz', v_k;
    END IF;
    v_have := CASE v_k
                WHEN 'unfit'  THEN COALESCE(v_row.unfit_qty, 0)
                WHEN 'repair' THEN COALESCE(v_row.repair_qty, 0)
                WHEN 'onsite' THEN COALESCE(v_row.onsite_qty, 0)
                ELSE COALESCE(v_row.icare_qty, 0) END;
    IF v_v > v_have THEN
      RAISE EXCEPTION '"%" anbarında % kodu üzrə "%" statuslu mal kifayət deyil: mövcud %, tələb olunan %',
        p_src, p_item_code, v_k, v_have, v_v;
    END IF;
    v_sum := v_sum + v_v;
  END LOOP;

  -- The marked part can never exceed the quantity actually leaving the line;
  -- "Normal" is simply the remainder and is not carried in the payload.
  IF v_sum > COALESCE(p_qty, 0) THEN
    RAISE EXCEPTION 'Tiplərə görə bölgü (%) ümumi miqdardan (%) çoxdur — sənəd yazılmadı', v_sum, p_qty;
  END IF;

  FOR v_k, v_v IN SELECT key, value::TEXT::NUMERIC FROM jsonb_each_text(p_conditions) LOOP
    IF v_v > 0 THEN
      PERFORM public.apply_cond_delta(p_src, p_item_code, v_k, -v_v);
      IF p_dst IS NOT NULL THEN
        PERFORM public.apply_cond_delta(p_dst, p_item_code, v_k, v_v);
      END IF;
      -- <<031-fix (§12)>> Log an İcarə bucket move UNCONDITIONALLY — on a
      -- transfer (p_dst IS NOT NULL) as much as on a plain outbound. This used
      -- to log only the outbound case; a split-based TRANSFER of rented stock
      -- left no record at all of how much moved. cancel_transfer_document
      -- (below) reads this exact record, keyed by (doc_num, p_src, item_code),
      -- to give the figure back to the right warehouse when the transfer is
      -- cancelled — without it, that reversal has nothing to read and the
      -- İcarədə figure would stay stranded at the destination, which is
      -- precisely the known gap this fix closes. log_icare_exposure never
      -- raises, so this can never abort the split.
      IF v_k = 'icare' THEN
        PERFORM public.log_icare_exposure(p_src, p_item_code, v_v, p_type, p_doc_num, p_note);
      END IF;
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_icare_delta(p_warehouse text, p_item_code text, p_delta numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wh   TEXT := NULLIF(btrim(COALESCE(p_warehouse, '')), '');
  v_code TEXT := NULLIF(btrim(COALESCE(p_item_code, '')), '');
  v_d      NUMERIC := COALESCE(p_delta, 0);
  v_new    NUMERIC;
  v_row    public.stock_conditions%ROWTYPE;
  v_found  public.stock_conditions%ROWTYPE;
  -- FOUND is captured immediately into its own flag: it is a shared implicit
  -- variable and reading it several statements later is a trap waiting for the
  -- next person who inserts a statement in between.
  v_exists BOOLEAN;
BEGIN
  IF v_wh IS NULL OR v_code IS NULL OR v_d = 0 THEN RETURN; END IF;
  IF v_d IN ('NaN'::NUMERIC, 'Infinity'::NUMERIC, '-Infinity'::NUMERIC) THEN RETURN; END IF;

  SELECT * INTO v_found FROM public.stock_conditions
   WHERE warehouse = v_wh AND item_code = v_code FOR UPDATE;
  v_exists := FOUND;
  v_row := v_found;

  v_new := ROUND(GREATEST(COALESCE(v_row.icare_qty, 0) + v_d, 0), 2);
  IF v_new > 999999999999 THEN v_new := 999999999999; END IF;

  IF NOT v_exists THEN
    -- ON CONFLICT is REQUIRED, not defensive style: post_transfer_document takes
    -- its advisory lock on (source, item) only, so two concurrent transfers into
    -- the SAME destination + item both see no row here and both INSERT. Without
    -- the conflict clause the second one raises unique_violation and aborts an
    -- entire, otherwise valid, transfer document — exactly what this function
    -- promises never to do. SELECT ... FOR UPDATE cannot lock a row that does
    -- not exist yet, so the upsert is the only thing standing between the two.
    IF v_new > 0 THEN
      INSERT INTO public.stock_conditions
        (warehouse, item_code, unfit_qty, repair_qty, onsite_qty, icare_qty, updated_by, updated_at)
      VALUES (v_wh, v_code, 0, 0, 0, v_new, auth.uid(), now())
      ON CONFLICT (warehouse, item_code) DO UPDATE
        SET icare_qty  = ROUND(GREATEST(public.stock_conditions.icare_qty + v_d, 0), 2),
            updated_by = auth.uid(),
            updated_at = now();
    END IF;
    RETURN;
  END IF;

  IF v_new = 0
     AND COALESCE(v_row.unfit_qty, 0)  = 0
     AND COALESCE(v_row.repair_qty, 0) = 0
     AND COALESCE(v_row.onsite_qty, 0) = 0
     AND COALESCE(btrim(v_row.note), '') = '' THEN
    DELETE FROM public.stock_conditions WHERE warehouse = v_wh AND item_code = v_code;
  ELSE
    UPDATE public.stock_conditions
       SET icare_qty = v_new, updated_by = auth.uid(), updated_at = now()
     WHERE warehouse = v_wh AND item_code = v_code;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_legacy_layer_delta(p_warehouse text, p_item_code text, p_delta numeric, p_date date, p_doc_num text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_left NUMERIC:=ABS(COALESCE(p_delta,0)); v_take NUMERIC; r RECORD;
BEGIN
  IF COALESCE(p_delta,0)=0 THEN RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_warehouse||'|'||p_item_code));
  IF p_delta>0 THEN
    INSERT INTO public.stock_layers(warehouse,item_code,source_type,received_date,source_doc_num,
      price_status,unit_price,initial_qty,available_qty,created_by)
    VALUES(p_warehouse,p_item_code,'legacy_adjustment',p_date,NULLIF(btrim(COALESCE(p_doc_num,'')),''),
      'unknown',NULL,p_delta,p_delta,auth.uid());
    RETURN;
  END IF;
  IF COALESCE((SELECT SUM(available_qty) FROM public.stock_layers
               WHERE warehouse=p_warehouse AND item_code=p_item_code AND active
                 AND source_type IN('legacy_unresolved','legacy_adjustment')),0)<v_left THEN
    RAISE EXCEPTION 'Tarixi ləğv təhlükəsiz deyil: % / % üzrə dəqiqləşdirilməmiş qalıq % vahid çatmır',
      p_warehouse,p_item_code,v_left;
  END IF;
  FOR r IN SELECT id,available_qty FROM public.stock_layers
           WHERE warehouse=p_warehouse AND item_code=p_item_code AND active
             AND source_type IN('legacy_unresolved','legacy_adjustment') AND available_qty>0
           ORDER BY CASE source_type WHEN 'legacy_unresolved' THEN 0 ELSE 1 END,created_at,id
           FOR UPDATE LOOP
    EXIT WHEN v_left<=0;
    v_take:=LEAST(r.available_qty,v_left);
    UPDATE public.stock_layers SET available_qty=available_qty-v_take,
      active=(available_qty-v_take)>0,updated_at=now() WHERE id=r.id;
    v_left:=v_left-v_take;
  END LOOP;
  IF v_left<>0 THEN RAISE EXCEPTION 'Tarixi qalıq dəyişib — ləğvi yenidən başladın'; END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_item_request(p_request_id uuid, p_name text DEFAULT NULL::text, p_unit text DEFAULT NULL::text, p_category text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_req       public.item_requests%ROWTYPE;
  v_name      TEXT;
  v_unit      TEXT;
  v_cat       TEXT;
  v_norm      TEXT;
  v_dup       TEXT;
  v_next      BIGINT;
  v_code      TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  IF COALESCE(public.current_user_role(), '') <> 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: nomenklatura sorğusunu yalnız aktiv Admin təsdiqləyə bilər';
  END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Sorğu identifikatoru tələb olunur'; END IF;

  SELECT * INTO v_req FROM public.item_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sorğu tapılmadı'; END IF;

  -- Idempotent: artıq təsdiqlənibsə, ikinci mal YARADILMIR.
  IF v_req.status = 'approved' THEN
    RETURN jsonb_build_object('id', v_req.id, 'status', 'approved',
                              'code', v_req.item_code, 'name', v_req.name,
                              'already_approved', TRUE, 'created_item', FALSE);
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Sorğu artıq qapanıb (status: %) — təsdiqlənə bilməz', v_req.status;
  END IF;

  v_name := btrim(normalize(COALESCE(NULLIF(btrim(COALESCE(p_name, '')), ''), v_req.name), NFKC));
  v_name := regexp_replace(v_name, '[[:space:]]+', ' ', 'g');
  IF length(v_name) < 3 THEN RAISE EXCEPTION 'Malın adı boşdur və ya 3 simvoldan qısadır'; END IF;

  v_unit := NULLIF(btrim(normalize(COALESCE(p_unit, v_req.unit, ''), NFKC)), '');
  IF v_unit IS NULL THEN v_unit := 'ədəd'; END IF;   -- 001 idxalı ilə eyni default
  v_cat  := NULLIF(btrim(normalize(COALESCE(p_category, v_req.category, ''), NFKC)), '');

  IF v_cat IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.reference_values
        WHERE kind = 'item_category' AND active = TRUE AND lower(btrim(name)) = lower(v_cat)) THEN
    RAISE EXCEPTION 'Kateqoriya sorğuçalarda aktiv deyil: %', v_cat;
  END IF;

  -- 012-nin trg_guard_item_unit triggeri items INSERT-ində bunu onsuz da tələb
  -- edir; burada yoxlamaq Admin-ə aydın mesaj verir və kod ayırmasından ƏVVƏL
  -- dayandırır, yəni uğursuz təsdiq kod nömrəsini "yandırmır".
  IF NOT EXISTS (
       SELECT 1 FROM public.reference_values
        WHERE kind = 'unit' AND active = TRUE AND lower(btrim(name)) = lower(v_unit)) THEN
    RAISE EXCEPTION 'Ölçü vahidi sorğuçalarda aktiv deyil: % — təsdiq edilmədi', v_unit;
  END IF;

  v_norm := public.item_request_norm(v_name);

  -- Kod ayırması 001 ilə EYNİ açar altında — idxal və təsdiq eyni kodu verə bilməz.
  PERFORM pg_advisory_xact_lock(424242);

  SELECT i.code INTO v_dup FROM public.items i
   WHERE public.item_request_norm(i.name) = v_norm LIMIT 1;
  IF v_dup IS NOT NULL THEN
    RAISE EXCEPTION 'Bu mal nomenklaturada artıq var (kod %) — təsdiq edilmədi', v_dup;
  END IF;

  SELECT COALESCE(MAX(code::BIGINT), 0) + 1 INTO v_next
    FROM public.items WHERE code ~ '^[0-9]{1,7}$';
  IF v_next > 9999999 THEN
    RAISE EXCEPTION '7 rəqəmli kod diapazonu doldu (>9999999) — təsdiq edilmədi';
  END IF;
  v_code := LPAD(v_next::TEXT, 7, '0');

  INSERT INTO public.items(code, name, unit, price) VALUES (v_code, v_name, v_unit, 0);
  IF v_cat IS NOT NULL THEN
    UPDATE public.items SET category = v_cat WHERE code = v_code;
  END IF;

  UPDATE public.item_requests
     SET status = 'approved', name = v_name, unit = v_unit, category = v_cat,
         name_norm = v_norm, decided_by = auth.uid(), decided_at = now(),
         item_code = v_code, updated_at = now()
   WHERE id = v_req.id;

  INSERT INTO public.audit_log(ts, user_id, action, table_name, record_id, old_values, new_values, reason)
  VALUES (now(), auth.uid(), 'UPDATE', 'item_requests', v_req.id::TEXT,
          jsonb_build_object('status', v_req.status, 'name', v_req.name,
                             'unit', v_req.unit, 'category', v_req.category),
          jsonb_build_object('status', 'approved', 'name', v_name, 'unit', v_unit,
                             'category', v_cat, 'item_code', v_code),
          'Nomenklatura sorğusu təsdiqləndi');

  RETURN jsonb_build_object('id', v_req.id, 'status', 'approved', 'code', v_code,
                            'name', v_name, 'unit', v_unit, 'category', v_cat,
                            'already_approved', FALSE, 'created_item', TRUE);
END;
$function$;

CREATE OR REPLACE FUNCTION public.azp_can_read()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.azp_user_role() IN ('admin', 'read');
$function$;

CREATE OR REPLACE FUNCTION public.azp_cancel_movement(p_module text, p_id bigint, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_amount NUMERIC; v_kind TEXT; v_effect BOOLEAN;
BEGIN
  IF NOT public.azp_is_admin() THEN RAISE EXCEPTION 'AZP: bu əməliyyat yalnız Admin üçündür'; END IF;
  PERFORM public.azp_check_module(p_module);
  SELECT amount, kind, app_balance_effect INTO v_amount, v_kind, v_effect FROM public.azp_movements
   WHERE id = p_id AND module = p_module AND cancelled = FALSE FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'AZP: hərəkət tapılmadı və ya artıq ləğv edilib'; END IF;
  IF v_kind = 'medaxil' AND v_effect THEN
    UPDATE public.azp_application_balances SET current_balance = round(current_balance + v_amount, 2), updated_at = now(), updated_by = auth.uid()
     WHERE module = p_module;
  END IF;
  UPDATE public.azp_movements SET cancelled = TRUE, cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = NULLIF(btrim(COALESCE(p_reason,'')), '')
   WHERE id = p_id AND module = p_module;
  INSERT INTO public.azp_audit_log(module, entity, action, entity_id, detail, actor)
  VALUES (p_module, 'movement', 'cancel', p_id::TEXT, jsonb_build_object('kind',v_kind,'amount',v_amount,'reason',NULLIF(btrim(COALESCE(p_reason,'')),'')), auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.azp_check_module(p_module text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_module IS NULL OR p_module NOT IN ('azpetrol', 'araz') THEN
    RAISE EXCEPTION 'AZP: yanlış modul: %', COALESCE(p_module, 'NULL');
  END IF;
  RETURN p_module;
END;
$function$;

CREATE OR REPLACE FUNCTION public.azp_correct_movement(p_module text, p_id bigint, p_patch jsonb, p_reason text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_orig    public.azp_movements%ROWTYPE;
  v_card    UUID;
  v_amount  NUMERIC(14,2);
  v_date    DATE;
  v_doc     TEXT;
  v_note    TEXT;
  v_new_id  BIGINT;
  v_app     NUMERIC(14,2);
  v_delta   NUMERIC(14,2);
  v_reason  TEXT;
BEGIN
  IF NOT public.azp_is_admin() THEN
    RAISE EXCEPTION 'AZP: bu əməliyyat yalnız Admin üçündür';
  END IF;
  PERFORM public.azp_check_module(p_module);

  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'AZP: düzəliş məlumatı obyekt olmalıdır';
  END IF;

  -- Lock the original. Module boundary is part of the predicate, so a movement
  -- of the other module is invisible to this call.
  SELECT * INTO v_orig FROM public.azp_movements
   WHERE id = p_id AND module = p_module AND cancelled = FALSE
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'AZP: hərəkət tapılmadı və ya artıq ləğv edilib';
  END IF;

  -- ---- corrected values ---------------------------------------------------
  IF p_patch ? 'card_id' THEN
    v_card := NULLIF(p_patch ->> 'card_id', '')::UUID;
    IF v_card IS NULL THEN RAISE EXCEPTION 'AZP: kart boş ola bilməz'; END IF;
  ELSE
    v_card := v_orig.card_id;
  END IF;

  PERFORM 1 FROM public.azp_cards
   WHERE id = v_card AND module = p_module AND active = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'AZP: kart % modulunda aktiv deyil və ya yoxdur', p_module;
  END IF;

  IF p_patch ? 'kind' AND btrim(COALESCE(p_patch ->> 'kind', '')) <> v_orig.kind THEN
    RAISE EXCEPTION 'AZP: əməliyyat növü düzəlişlə dəyişdirilmir — hərəkəti ləğv edin və yenisini yazın';
  END IF;

  IF p_patch ? 'amount' THEN
    BEGIN
      v_amount := ROUND((p_patch ->> 'amount')::NUMERIC, 2);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'AZP: məbləğ rəqəm deyil';
    END;
    IF v_amount IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION 'AZP: məbləğ müsbət olmalıdır';
    END IF;
  ELSE
    v_amount := v_orig.amount;
  END IF;

  IF p_patch ? 'op_date' THEN
    BEGIN
      v_date := NULLIF(p_patch ->> 'op_date', '')::DATE;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'AZP: tarix formatı yanlışdır (YYYY-MM-DD gözlənilir)';
    END;
  ELSE
    v_date := v_orig.op_date;
  END IF;

  v_doc  := CASE WHEN p_patch ? 'doc_num'
                 THEN NULLIF(btrim(COALESCE(p_patch ->> 'doc_num', '')), '')
                 ELSE v_orig.doc_num END;
  v_note := CASE WHEN p_patch ? 'note'
                 THEN NULLIF(btrim(COALESCE(p_patch ->> 'note', '')), '')
                 ELSE v_orig.note END;

  IF v_card = v_orig.card_id
     AND v_amount = v_orig.amount
     AND v_date IS NOT DISTINCT FROM v_orig.op_date
     AND v_doc  IS NOT DISTINCT FROM v_orig.doc_num
     AND v_note IS NOT DISTINCT FROM v_orig.note THEN
    RAISE EXCEPTION 'AZP: dəyişiklik yoxdur — düzəliş yazılmadı';
  END IF;

  -- ---- application balance: restore the original, apply the replacement ----
  -- Driven by the ORIGINAL row's own flag, so exactly the effect that was
  -- applied at posting time is reversed, once.
  IF v_orig.kind = 'medaxil' AND v_orig.app_balance_effect THEN
    SELECT current_balance INTO v_app
      FROM public.azp_application_balances WHERE module = p_module FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'AZP: tətbiq balansı yaradılmayıb'; END IF;

    v_delta := ROUND(v_amount - v_orig.amount, 2);   -- net extra funds needed
    IF v_delta > 0 AND v_app < v_delta THEN
      RAISE EXCEPTION 'AZP: tətbiqin cari balansı kifayət deyil — mövcud %, əlavə tələb olunan %',
        v_app, v_delta;
    END IF;

    UPDATE public.azp_application_balances
       SET current_balance = ROUND(current_balance - v_delta, 2),
           updated_at = now(), updated_by = auth.uid()
     WHERE module = p_module;
  END IF;

  -- ---- replacement row ----------------------------------------------------
  v_reason := COALESCE(NULLIF(btrim(COALESCE(p_reason, '')), ''), 'Düzəlişlə əvəz edilib');

  INSERT INTO public.azp_movements
    (module, card_id, op_date, kind, amount, doc_num, note, vat_included,
     app_balance_effect, replaces_id, created_by)
  VALUES
    (p_module, v_card, v_date, v_orig.kind, v_amount, v_doc, v_note, v_orig.vat_included,
     v_orig.app_balance_effect, v_orig.id, auth.uid())
  RETURNING id INTO v_new_id;

  -- ---- cancel the original and link the two rows --------------------------
  UPDATE public.azp_movements
     SET cancelled = TRUE, cancelled_at = now(), cancelled_by = auth.uid(),
         cancel_reason = v_reason, replaced_by = v_new_id
   WHERE id = v_orig.id AND module = p_module;

  INSERT INTO public.azp_audit_log (module, entity, action, entity_id, detail, actor)
  VALUES (p_module, 'movement', 'correct', v_orig.id::TEXT,
          jsonb_build_object(
            'original_id', v_orig.id,
            'replacement_id', v_new_id,
            'reason', v_reason,
            'old', jsonb_build_object('card_id', v_orig.card_id, 'amount', v_orig.amount,
                                      'op_date', v_orig.op_date, 'doc_num', v_orig.doc_num,
                                      'note', v_orig.note, 'kind', v_orig.kind,
                                      'app_balance_effect', v_orig.app_balance_effect),
            'new', jsonb_build_object('card_id', v_card, 'amount', v_amount,
                                      'op_date', v_date, 'doc_num', v_doc,
                                      'note', v_note, 'kind', v_orig.kind)),
          auth.uid());

  RETURN v_new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.azp_delete_card(p_module text, p_card_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cnt BIGINT;
  v_no  TEXT;
BEGIN
  IF NOT public.azp_is_admin() THEN
    RAISE EXCEPTION 'AZP: bu əməliyyat yalnız Admin üçündür';
  END IF;
  PERFORM public.azp_check_module(p_module);

  SELECT card_no INTO v_no FROM public.azp_cards WHERE id = p_card_id AND module = p_module;
  IF v_no IS NULL THEN
    RAISE EXCEPTION 'AZP: kart tapılmadı (% modulunda)', p_module;
  END IF;

  SELECT COUNT(*) INTO v_cnt FROM public.azp_movements WHERE card_id = p_card_id;
  IF v_cnt > 0 THEN
    RAISE EXCEPTION 'AZP: kartın % hərəkəti var — silinmir. Deaktiv edin.', v_cnt;
  END IF;

  DELETE FROM public.azp_cards WHERE id = p_card_id AND module = p_module;

  INSERT INTO public.azp_audit_log (module, entity, action, entity_id, detail, actor)
  VALUES (p_module, 'card', 'delete', p_card_id::TEXT,
          jsonb_build_object('card_no', v_no), auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.azp_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.azp_user_role() = 'admin';
$function$;

CREATE OR REPLACE FUNCTION public.azp_post_movements(p_module text, p_rows jsonb, p_source text DEFAULT 'manual'::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row JSONB; v_i INT := 0; v_card UUID; v_kind TEXT; v_amount NUMERIC;
  v_inserted BIGINT := 0; v_medaxil_total NUMERIC := 0; v_app_balance NUMERIC;
  v_affects_app BOOLEAN := COALESCE(p_source, 'manual') <> 'import';
BEGIN
  IF NOT public.azp_is_admin() THEN RAISE EXCEPTION 'AZP: bu əməliyyat yalnız Admin üçündür'; END IF;
  PERFORM public.azp_check_module(p_module);
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN
    RAISE EXCEPTION 'AZP: boş və ya yanlış paket yazıla bilməz';
  END IF;
  IF jsonb_array_length(p_rows) > 5000 THEN RAISE EXCEPTION 'AZP: bir paketdə maksimum 5000 sətir ola bilər'; END IF;

  -- Serialize all Mədaxil operations for this module and reserve the application balance.
  SELECT current_balance INTO v_app_balance
    FROM public.azp_application_balances WHERE module = p_module FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'AZP: tətbiq balansı yaradılmayıb'; END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_i := v_i + 1;
    IF jsonb_typeof(v_row) <> 'object' THEN RAISE EXCEPTION 'AZP: sətir % obyekt deyil', v_i; END IF;
    v_card := NULLIF(v_row ->> 'card_id', '')::UUID;
    IF v_card IS NULL THEN RAISE EXCEPTION 'AZP: sətir % — kart göstərilməyib', v_i; END IF;
    PERFORM 1 FROM public.azp_cards WHERE id = v_card AND module = p_module AND active = TRUE;
    IF NOT FOUND THEN RAISE EXCEPTION 'AZP: sətir % — kart aktiv deyil və ya yoxdur', v_i; END IF;
    v_kind := btrim(COALESCE(v_row ->> 'kind', ''));
    IF v_kind NOT IN ('medaxil', 'mexaric') THEN RAISE EXCEPTION 'AZP: sətir % — yanlış əməliyyat növü', v_i; END IF;
    BEGIN v_amount := (v_row ->> 'amount')::NUMERIC; EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'AZP: sətir % — məbləğ rəqəm deyil', v_i; END;
    IF v_amount IS NULL OR v_amount <= 0 THEN RAISE EXCEPTION 'AZP: sətir % — məbləğ müsbət olmalıdır', v_i; END IF;
    IF v_kind = 'medaxil' AND v_affects_app THEN v_medaxil_total := v_medaxil_total + round(v_amount, 2); END IF;
    INSERT INTO public.azp_movements(module, card_id, op_date, kind, amount, doc_num, note, vat_included, app_balance_effect, created_by)
    VALUES (p_module, v_card, NULLIF(v_row ->> 'op_date', '')::DATE, v_kind, round(v_amount, 2),
            NULLIF(btrim(COALESCE(v_row ->> 'doc_num', '')), ''),
            NULLIF(btrim(COALESCE(v_row ->> 'note', '')), ''),
            COALESCE((v_row ->> 'vat_included')::BOOLEAN, p_module = 'araz'),
            (v_kind = 'medaxil' AND v_affects_app), auth.uid());
    v_inserted := v_inserted + 1;
  END LOOP;

  IF v_app_balance < round(v_medaxil_total, 2) THEN
    RAISE EXCEPTION 'AZP: tətbiqin cari balansı kifayət deyil — mövcud %, tələb olunan %',
      v_app_balance, round(v_medaxil_total, 2);
  END IF;
  UPDATE public.azp_application_balances
     SET current_balance = round(current_balance - v_medaxil_total, 2), updated_at = now(), updated_by = auth.uid()
   WHERE module = p_module;
  INSERT INTO public.azp_audit_log(module, entity, action, entity_id, detail, actor)
  VALUES (p_module, 'movement', CASE WHEN p_source = 'import' THEN 'import' ELSE 'post' END, NULL,
          jsonb_build_object('rows', v_inserted, 'medaxil_total', round(v_medaxil_total,2), 'source', COALESCE(p_source,'manual')), auth.uid());
  RETURN v_inserted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.azp_save_card(p_module text, p_card jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id      UUID;
  v_card_no TEXT;
  v_holder  TEXT;
  v_action  TEXT;
BEGIN
  IF NOT public.azp_is_admin() THEN
    RAISE EXCEPTION 'AZP: bu əməliyyat yalnız Admin üçündür';
  END IF;
  PERFORM public.azp_check_module(p_module);

  IF p_card IS NULL OR jsonb_typeof(p_card) <> 'object' THEN
    RAISE EXCEPTION 'AZP: kart məlumatı obyekt olmalıdır';
  END IF;

  v_card_no := btrim(COALESCE(p_card ->> 'card_no', ''));
  v_holder  := btrim(COALESCE(p_card ->> 'holder', ''));
  IF v_card_no = '' THEN RAISE EXCEPTION 'AZP: kart nömrəsi boş ola bilməz'; END IF;
  IF v_holder  = '' THEN RAISE EXCEPTION 'AZP: sahib/obyekt adı boş ola bilməz'; END IF;

  v_id := NULLIF(p_card ->> 'id', '')::UUID;

  IF v_id IS NULL THEN
    v_action := 'create';
    INSERT INTO public.azp_cards (module, card_no, holder, project, note, sort_order, active, created_by, updated_by)
    VALUES (p_module, v_card_no, v_holder,
            NULLIF(btrim(COALESCE(p_card ->> 'project', '')), ''),
            NULLIF(btrim(COALESCE(p_card ->> 'note', '')), ''),
            COALESCE((p_card ->> 'sort_order')::INT, 0),
            COALESCE((p_card ->> 'active')::BOOLEAN, TRUE),
            auth.uid(), auth.uid())
    RETURNING id INTO v_id;
  ELSE
    v_action := 'update';
    -- Modul sərhədi: başqa modulun kartı bu çağırışdan görünmür və dəyişmir.
    UPDATE public.azp_cards
       SET card_no    = v_card_no,
           holder     = v_holder,
           project    = NULLIF(btrim(COALESCE(p_card ->> 'project', '')), ''),
           note       = NULLIF(btrim(COALESCE(p_card ->> 'note', '')), ''),
           sort_order = COALESCE((p_card ->> 'sort_order')::INT, sort_order),
           active     = COALESCE((p_card ->> 'active')::BOOLEAN, active),
           updated_at = now(),
           updated_by = auth.uid()
     WHERE id = v_id AND module = p_module;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'AZP: kart tapılmadı (% modulunda)', p_module;
    END IF;
  END IF;

  INSERT INTO public.azp_audit_log (module, entity, action, entity_id, detail, actor)
  VALUES (p_module, 'card', v_action, v_id::TEXT,
          jsonb_build_object('card_no', v_card_no, 'holder', v_holder), auth.uid());

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.azp_set_application_balance(p_module text, p_balance numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_balance NUMERIC(14,2);
BEGIN
  IF NOT public.azp_is_admin() THEN
    RAISE EXCEPTION 'AZP: bu əməliyyat yalnız Admin üçündür';
  END IF;
  PERFORM public.azp_check_module(p_module);
  IF p_balance IS NULL OR p_balance < 0 OR p_balance <> round(p_balance, 2) THEN
    RAISE EXCEPTION 'AZP: tətbiqin cari balansı sıfırdan kiçik və ya iki qəpikdən çox ola bilməz';
  END IF;
  UPDATE public.azp_application_balances
     SET current_balance = p_balance, updated_at = now(), updated_by = auth.uid()
   WHERE module = p_module
   RETURNING current_balance INTO v_balance;
  IF NOT FOUND THEN RAISE EXCEPTION 'AZP: modul balansı tapılmadı'; END IF;
  INSERT INTO public.azp_audit_log(module, entity, action, entity_id, detail, actor)
  VALUES (p_module, 'application_balance', 'update', p_module,
          jsonb_build_object('current_balance', v_balance), auth.uid());
  RETURN v_balance;
END;
$function$;

CREATE OR REPLACE FUNCTION public.azp_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT CASE
              WHEN u.role = 'admin'    THEN 'admin'
              WHEN u.role = 'anbardar' THEN 'none'   -- açıq qadağa
              WHEN u.role IN ('rehber', 'muhasib', 'techizat', 'baxis') THEN 'read'
              ELSE 'none'
            END
     FROM public.users u
     WHERE u.id = auth.uid() AND u.active = TRUE),
    'none');
$function$;

CREATE OR REPLACE FUNCTION public.backfill_exact_receipt_layers(p_expected_movement_count bigint, p_expected_max_created_at timestamp with time zone, p_expected_eligible_layer_count bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT; v_count BIGINT; v_max TIMESTAMPTZ;
  v_eligible_count BIGINT; v_seeded_exact BIGINT; v_deactivated BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role := public.current_user_role();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Yalnız Admin partiya bərpasını yerinə yetirə bilər';
  END IF;
  IF NOT COALESCE((SELECT active FROM public.stock_layer_settings WHERE singleton), FALSE) THEN
    RAISE EXCEPTION 'Partiya uçotu aktiv deyil — bərpa tələb olunmur';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('stock-layers-exact-backfill'));
  LOCK TABLE public.movements IN SHARE MODE;

  SELECT COUNT(*), MAX(created_at) INTO v_count, v_max FROM public.movements;
  IF v_count IS DISTINCT FROM p_expected_movement_count
     OR v_max IS DISTINCT FROM p_expected_max_created_at THEN
    RAISE EXCEPTION 'Məlumat dəyişib: preflight yenidən işə salın (say %, son tarix %)', v_count, v_max;
  END IF;

  CREATE TEMP TABLE _eligible_layers ON COMMIT DROP AS
    SELECT l.id, l.warehouse, l.item_code, l.available_qty, l.created_by
    FROM public.stock_layers l
    LEFT JOIN (
      SELECT m.warehouse, m.item_code,
             SUM(m.out_qty) AS pre_cutover_out_qty,
             SUM(CASE WHEN m.type = 'Yerdəyişmə' THEN 1 ELSE 0 END) AS pre_cutover_transfer_rows
      FROM public.movements m
      WHERE m.created_at <= (SELECT cutover_max_created_at FROM public.stock_layer_settings WHERE singleton)
      GROUP BY m.warehouse, m.item_code
    ) h ON h.warehouse = l.warehouse AND h.item_code = l.item_code
    WHERE l.source_type = 'legacy_unresolved' AND l.active
      AND l.available_qty = l.initial_qty
      AND NOT EXISTS(SELECT 1 FROM public.stock_layer_allocations a WHERE a.layer_id = l.id)
      AND COALESCE(h.pre_cutover_out_qty, 0) = 0
      AND COALESCE(h.pre_cutover_transfer_rows, 0) = 0;

  SELECT COUNT(*) INTO v_eligible_count FROM _eligible_layers;
  IF v_eligible_count IS DISTINCT FROM p_expected_eligible_layer_count THEN
    RAISE EXCEPTION 'Uyğunsuzluq: gözlənilən % uyğun partiya, tapılan %. Preflight yenidən işə salın',
      p_expected_eligible_layer_count, v_eligible_count;
  END IF;
  IF v_eligible_count = 0 THEN
    RETURN jsonb_build_object('eligible_layer_count', 0, 'seeded_exact_layers', 0, 'deactivated_layers', 0);
  END IF;

  -- Lock every affected legacy layer row before mutating it.
  PERFORM 1 FROM public.stock_layers l JOIN _eligible_layers e ON e.id = l.id FOR UPDATE;

  INSERT INTO public.stock_layers(warehouse, item_code, source_type, source_movement_id,
                                  root_movement_id, received_date, source_doc_num,
                                  source_invoice_num, price_status, unit_price,
                                  initial_qty, available_qty, created_by)
  SELECT m.warehouse, m.item_code,
    CASE WHEN COALESCE(m.note, '') LIKE 'Ləğv:%' THEN 'legacy_adjustment' ELSE 'receipt' END,
    m.id, m.id, m.date, NULLIF(m.doc_num, ''), NULLIF(m.invoice_num, ''),
    CASE WHEN COALESCE(m.price, 0) > 0 THEN 'known' ELSE 'unknown' END,
    CASE WHEN COALESCE(m.price, 0) > 0 THEN m.price ELSE NULL END,
    m.in_qty, m.in_qty, e.created_by
  FROM public.movements m
  JOIN _eligible_layers e ON e.warehouse = m.warehouse AND e.item_code = m.item_code
  WHERE m.in_qty > 0
    AND m.created_at <= (SELECT cutover_max_created_at FROM public.stock_layer_settings WHERE singleton);
  GET DIAGNOSTICS v_seeded_exact = ROW_COUNT;

  -- Reconciliation: the exact layers just seeded for each pair must sum to
  -- exactly the old lump quantity. Any mismatch aborts the whole transaction.
  IF EXISTS(
    SELECT 1 FROM (
      SELECT nl.warehouse, nl.item_code, SUM(nl.initial_qty) AS new_qty
      FROM public.stock_layers nl
      JOIN _eligible_layers e ON e.warehouse = nl.warehouse AND e.item_code = nl.item_code
      WHERE nl.source_type IN ('receipt', 'legacy_adjustment') AND nl.active
      GROUP BY nl.warehouse, nl.item_code
    ) x
    JOIN (SELECT warehouse, item_code, SUM(available_qty) AS old_qty FROM _eligible_layers GROUP BY warehouse, item_code) o
      ON o.warehouse = x.warehouse AND o.item_code = x.item_code
    WHERE ROUND(x.new_qty, 4) <> ROUND(o.old_qty, 4)
  ) THEN
    RAISE EXCEPTION 'Yoxlama uğursuz oldu: bərpa olunan partiyaların cəmi köhnə qalığa bərabər deyil';
  END IF;

  UPDATE public.stock_layers SET active = FALSE, updated_at = now()
  WHERE id IN (SELECT id FROM _eligible_layers);
  GET DIAGNOSTICS v_deactivated = ROW_COUNT;

  RETURN jsonb_build_object('eligible_layer_count', v_eligible_count,
    'seeded_exact_layers', v_seeded_exact, 'deactivated_layers', v_deactivated);
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_document(p_doc_num text, p_reversal_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role     TEXT;
  v_doc      TEXT;
  v_rev      TEXT;
  v_marker   TEXT;
  v_type     TEXT;
  v_ntypes   INT;
  v_bal      NUMERIC;
  v_out_id   UUID;
  v_in_id    UUID;
  v_reversed JSONB := '[]'::JSONB;
  r          RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role <> 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: yalnız Admin əməliyyatı ləğv edə bilər (rol: %)', COALESCE(v_role, 'naməlum');
  END IF;

  v_doc := NULLIF(TRIM(COALESCE(p_doc_num, '')), '');
  IF v_doc IS NULL THEN
    RAISE EXCEPTION 'Etibarlı sənəd nömrəsi yoxdur — bu düzəliş ayrıca təsdiqlənmiş storno əməliyyatı tələb edir';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('cancel|' || v_doc));

  IF NOT EXISTS (SELECT 1 FROM public.movements WHERE doc_num = v_doc) THEN
    RAISE EXCEPTION 'Sənəd tapılmadı: %', v_doc;
  END IF;
  IF EXISTS (SELECT 1 FROM public.movements WHERE doc_num = v_doc AND type = 'Yerdəyişmə') THEN
    RAISE EXCEPTION 'Yerdəyişmə sənədi bu funksiya ilə ləğv edilmir — cancel_transfer_document istifadə edin: %', v_doc;
  END IF;

  SELECT COUNT(DISTINCT type) INTO v_ntypes FROM public.movements WHERE doc_num = v_doc;
  IF v_ntypes <> 1 THEN
    RAISE EXCEPTION 'Sənəd qarışıq əməliyyat növlərindən ibarətdir, ləğv edilə bilmir: %', v_doc;
  END IF;

  SELECT type INTO v_type FROM public.movements WHERE doc_num = v_doc LIMIT 1;
  -- <<031>> 'İcarə' added: a rent document must be cancellable like any other.
  IF v_type NOT IN ('Satınalma', 'Əvvələ qalıq', 'Qaytarma', 'İcarə', 'Silinmə', 'Sahəyə', 'Satış') THEN
    RAISE EXCEPTION 'Bu əməliyyat növü üçün ləğv dəstəklənmir: %', v_type;
  END IF;
  IF EXISTS (SELECT 1 FROM public.movements WHERE doc_num = v_doc AND note LIKE 'Ləğv: %') THEN
    RAISE EXCEPTION 'Bu sənəd artıq bir ləğv (əks yazı) sənədidir, yenidən ləğv edilə bilməz: %', v_doc;
  END IF;

  v_marker := 'Ləğv: ' || v_doc;
  IF EXISTS (SELECT 1 FROM public.movements WHERE note = v_marker) THEN
    RAISE EXCEPTION 'Bu sənəd artıq ləğv edilib: %', v_doc;
  END IF;

  -- <<031>> 'İcarə' is inbound, so it belongs in the group whose reversal has to
  -- check that the stock is still on the line before taking it back out.
  IF v_type IN ('Satınalma', 'Əvvələ qalıq', 'Qaytarma', 'İcarə') THEN
    FOR r IN SELECT DISTINCT warehouse AS wh, item_code AS code
               FROM public.movements WHERE doc_num = v_doc AND in_qty > 0
               ORDER BY warehouse, item_code LOOP
      PERFORM pg_advisory_xact_lock(hashtext(r.wh || '|' || r.code));
    END LOOP;

    FOR r IN SELECT warehouse AS wh, item_code AS code, SUM(in_qty) AS need
               FROM public.movements WHERE doc_num = v_doc AND in_qty > 0
               GROUP BY warehouse, item_code LOOP
      SELECT COALESCE(SUM(in_qty - out_qty), 0) INTO v_bal
        FROM public.movements WHERE warehouse = r.wh AND item_code = r.code;
      IF v_bal < r.need THEN
        RAISE EXCEPTION 'Ləğv mümkün deyil: "%" anbarında % kodu üzrə mövcud %, geri çıxarılmalı % — mal artıq hərəkət edib',
          r.wh, r.code, v_bal, r.need;
      END IF;
    END LOOP;
  END IF;

  v_rev := 'SND-C-' || UPPER(SUBSTR(MD5(clock_timestamp()::TEXT || random()::TEXT), 1, 10));
  IF EXISTS (SELECT 1 FROM public.movements WHERE doc_num = v_rev) THEN
    v_rev := 'SND-C-' || UPPER(SUBSTR(MD5(clock_timestamp()::TEXT || random()::TEXT || 'x'), 1, 10));
  END IF;

  FOR r IN SELECT * FROM public.movements WHERE doc_num = v_doc ORDER BY id LOOP
    IF r.in_qty > 0 THEN
      INSERT INTO public.movements(date, warehouse, item_code, in_qty, out_qty, type, partner,
                            channel, contract_num, invoice_num, price, note, doc_num, created_by)
      VALUES (p_reversal_date, r.warehouse, r.item_code, 0, r.in_qty, r.type, r.partner,
              r.channel, r.contract_num, r.invoice_num, r.price, v_marker, v_rev, auth.uid())
      RETURNING id INTO v_out_id;

      -- <<031>> Cancelling a rent document hands the İcarədə figure back.
      IF r.type = 'İcarə' THEN
        PERFORM public.apply_icare_delta(r.warehouse, r.item_code, -r.in_qty);
      END IF;

      v_reversed := v_reversed || jsonb_build_object('orig_id', r.id, 'reverse_out_id', v_out_id,
                     'warehouse', r.warehouse, 'code', r.item_code, 'qty', r.in_qty);
    ELSIF r.out_qty > 0 THEN
      INSERT INTO public.movements(date, warehouse, item_code, in_qty, out_qty, type, partner,
                            channel, contract_num, invoice_num, price, note, doc_num, created_by)
      VALUES (p_reversal_date, r.warehouse, r.item_code, r.out_qty, 0, r.type, r.partner,
              r.channel, r.contract_num, r.invoice_num, r.price, v_marker, v_rev, auth.uid())
      RETURNING id INTO v_in_id;

      -- <<031>> Cancelling a məxaric Qaytarma puts the returned goods back on
      -- the line, so the rented-in figure goes back up by the same amount.
      IF r.type = 'Qaytarma' THEN
        PERFORM public.apply_icare_delta(r.warehouse, r.item_code, r.out_qty);
      END IF;

      v_reversed := v_reversed || jsonb_build_object('orig_id', r.id, 'reverse_in_id', v_in_id,
                     'warehouse', r.warehouse, 'code', r.item_code, 'qty', r.out_qty);
    END IF;
  END LOOP;

  IF jsonb_array_length(v_reversed) = 0 THEN
    RAISE EXCEPTION 'Sənəddə ləğv ediləcək sətir tapılmadı: %', v_doc;
  END IF;

  RETURN jsonb_build_object('original_doc_num', v_doc, 'reversal_doc_num', v_rev, 'type', v_type,
                            'reversed', v_reversed, 'row_count', jsonb_array_length(v_reversed));
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_documents_batch(p_doc_nums text[], p_reversal_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role    TEXT;
  v_doc     TEXT;
  v_i       INT;
  v_dups    TEXT;
  v_has_tr  BOOLEAN;
  v_has_ot  BOOLEAN;
  v_ntypes  INT;
  v_type    TEXT;
  v_bal     NUMERIC;
  v_new     NUMERIC;
  v_res     JSONB;
  v_results JSONB := '[]'::JSONB;
  r         RECORD;
BEGIN
  -- 1. Admin only (enforced here; each individual RPC re-checks in pass 2).
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı';
  END IF;
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role <> 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: yalnız Admin qrup üzrə ləğv edə bilər (rol: %)', COALESCE(v_role, 'naməlum');
  END IF;

  -- 2. Input validation.
  IF p_doc_nums IS NULL OR array_length(p_doc_nums, 1) IS NULL THEN
    RAISE EXCEPTION 'Ləğv üçün heç bir sənəd seçilməyib';
  END IF;
  IF p_reversal_date IS NULL THEN
    RAISE EXCEPTION 'Ləğv tarixi tələb olunur';
  END IF;

  -- Normalize the selection (trim, reject empty/legacy) into a temp table.
  CREATE TEMP TABLE _sel(doc TEXT, is_transfer BOOLEAN) ON COMMIT DROP;
  FOR v_i IN SELECT generate_subscripts(p_doc_nums, 1) LOOP
    v_doc := NULLIF(TRIM(COALESCE(p_doc_nums[v_i], '')), '');
    IF v_doc IS NULL THEN
      RAISE EXCEPTION 'Sıra %: etibarlı sənəd nömrəsi yoxdur — sənədsiz (legacy) qeydlər yalnız fərdi ləğv edilir', v_i;
    END IF;
    INSERT INTO _sel(doc, is_transfer) VALUES (v_doc, NULL);
  END LOOP;

  -- 2b. Reject duplicate document selection (requirement 14).
  SELECT string_agg(doc, ', ' ORDER BY doc) INTO v_dups
    FROM (SELECT doc FROM _sel GROUP BY doc HAVING COUNT(*) > 1) d;
  IF v_dups IS NOT NULL THEN
    RAISE EXCEPTION 'Təkrar seçilmiş sənəd(lər): %', v_dups;
  END IF;

  -- 3. PASS 1 — validate & classify EVERY document before any write.
  FOR r IN SELECT doc FROM _sel ORDER BY doc LOOP
    v_doc := r.doc;

    IF NOT EXISTS (SELECT 1 FROM public.movements WHERE doc_num = v_doc) THEN
      RAISE EXCEPTION 'Sənəd tapılmadı: %', v_doc;
    END IF;

    v_has_tr := EXISTS (SELECT 1 FROM public.movements WHERE doc_num = v_doc AND type = 'Yerdəyişmə');
    v_has_ot := EXISTS (SELECT 1 FROM public.movements WHERE doc_num = v_doc AND type <> 'Yerdəyişmə');
    IF v_has_tr AND v_has_ot THEN
      RAISE EXCEPTION 'Sənəd qarışıqdır (yerdəyişmə + digər növ), qrup üzrə ləğv dəstəklənmir: %', v_doc;
    END IF;

    IF v_has_tr THEN
      -- Transfer document — mirror cancel_transfer_document eligibility.
      IF EXISTS (SELECT 1 FROM public.movements WHERE doc_num = v_doc AND note LIKE 'Ləğv (əks yerdəyişmə): %') THEN
        RAISE EXCEPTION 'Əks yerdəyişmə (ləğv) sənədi yenidən ləğv edilə bilməz: %', v_doc;
      END IF;
      IF EXISTS (SELECT 1 FROM public.movements WHERE note = 'Ləğv (əks yerdəyişmə): ' || v_doc) THEN
        RAISE EXCEPTION 'Bu sənəd artıq ləğv edilib: %', v_doc;
      END IF;
      UPDATE _sel SET is_transfer = TRUE WHERE doc = v_doc;
    ELSE
      -- Ordinary document — mirror cancel_document eligibility.
      SELECT COUNT(DISTINCT type) INTO v_ntypes FROM public.movements WHERE doc_num = v_doc;
      IF v_ntypes <> 1 THEN
        RAISE EXCEPTION 'Sənəd qarışıq əməliyyat növlərindən ibarətdir, ləğv edilə bilmir: %', v_doc;
      END IF;
      SELECT type INTO v_type FROM public.movements WHERE doc_num = v_doc LIMIT 1;
      IF v_type NOT IN ('Satınalma', 'Əvvələ qalıq', 'Qaytarma', 'Silinmə', 'Sahəyə', 'Satış') THEN
        RAISE EXCEPTION 'Bu əməliyyat növü üçün ləğv dəstəklənmir (%): %', v_type, v_doc;
      END IF;
      IF EXISTS (SELECT 1 FROM public.movements WHERE doc_num = v_doc AND note LIKE 'Ləğv: %') THEN
        RAISE EXCEPTION 'Bu sənəd artıq bir ləğv (əks yazı) sənədidir, yenidən ləğv edilə bilməz: %', v_doc;
      END IF;
      IF EXISTS (SELECT 1 FROM public.movements WHERE note = 'Ləğv: ' || v_doc) THEN
        RAISE EXCEPTION 'Bu sənəd artıq ləğv edilib: %', v_doc;
      END IF;
      UPDATE _sel SET is_transfer = FALSE WHERE doc = v_doc;
    END IF;
  END LOOP;

  -- 4. Deterministic locks: per-document, then every touched inventory key.
  FOR r IN SELECT doc FROM _sel ORDER BY doc LOOP
    PERFORM pg_advisory_xact_lock(hashtext('cancel|' || r.doc));
  END LOOP;
  FOR r IN
    SELECT DISTINCT m.warehouse AS wh, m.item_code AS code
      FROM public.movements m JOIN _sel s ON s.doc = m.doc_num
      ORDER BY m.warehouse, m.item_code
  LOOP
    PERFORM pg_advisory_xact_lock(hashtext(r.wh || '|' || r.code));
  END LOOP;

  -- 5. Sequential balance simulation across the whole batch (deterministic by
  --    doc_num). A document's reversal net effect on (warehouse, item_code) is
  --    SUM(out_qty) - SUM(in_qty): cancelling an inbound (Satınalma/…) removes
  --    stock (net < 0), cancelling an outbound (Satış/Sahəyə/Silinmə) or the
  --    source leg of a transfer restores stock (net > 0), the destination leg of
  --    a transfer removes it. Running balance starts from live data so a later
  --    document sees the effect of earlier ones. Any key that would go negative
  --    aborts the WHOLE batch with a precise document-level reason.
  CREATE TEMP TABLE _run(wh TEXT, code TEXT, bal NUMERIC, PRIMARY KEY (wh, code)) ON COMMIT DROP;
  FOR r IN
    SELECT s.doc AS doc, m.warehouse AS wh, m.item_code AS code,
           SUM(COALESCE(m.out_qty, 0)) - SUM(COALESCE(m.in_qty, 0)) AS net
      FROM public.movements m JOIN _sel s ON s.doc = m.doc_num
      GROUP BY s.doc, m.warehouse, m.item_code
      ORDER BY s.doc, m.warehouse, m.item_code
  LOOP
    IF NOT EXISTS (SELECT 1 FROM _run WHERE wh = r.wh AND code = r.code) THEN
      SELECT COALESCE(SUM(in_qty - out_qty), 0) INTO v_bal
        FROM public.movements WHERE warehouse = r.wh AND item_code = r.code;
      INSERT INTO _run(wh, code, bal) VALUES (r.wh, r.code, v_bal);
    END IF;
    SELECT bal INTO v_bal FROM _run WHERE wh = r.wh AND code = r.code;
    v_new := v_bal + r.net;
    IF v_new < 0 THEN
      RAISE EXCEPTION 'Ləğv mümkün deyil (sənəd %): "%" anbarında % kodu üzrə mövcud %, geri çıxarılmalı % — mal artıq hərəkət edib, qrup üzrə ləğv baş tutmadı',
        r.doc, r.wh, r.code, v_bal, (- r.net);
    END IF;
    UPDATE _run SET bal = v_new WHERE wh = r.wh AND code = r.code;
  END LOOP;

  -- 6. PASS 2 — create reversals for every document by reusing the proven
  --    individual RPCs, in the SAME deterministic order as the simulation so each
  --    RPC's own balance check sees the accumulated in-transaction effect and
  --    passes. Any RAISE here rolls back the entire transaction (all-or-none).
  FOR r IN SELECT doc, is_transfer FROM _sel ORDER BY doc LOOP
    IF r.is_transfer THEN
      v_res := public.cancel_transfer_document(r.doc, p_reversal_date);
    ELSE
      v_res := public.cancel_document(r.doc, p_reversal_date);
    END IF;
    v_results := v_results || jsonb_build_object(
      'doc_num',          r.doc,
      'is_transfer',      r.is_transfer,
      'reversal_doc_num', v_res->>'reversal_doc_num',
      'row_count',        (v_res->>'row_count')::INT
    );
  END LOOP;

  RETURN jsonb_build_object(
    'cancelled_count', (SELECT COUNT(*) FROM _sel),
    'reversal_date',   p_reversal_date,
    'results',         v_results
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_item_request(p_request_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_req  public.item_requests%ROWTYPE;
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role := public.current_user_role();
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'İcazə yoxdur: istifadəçi profili tapılmadı və ya aktiv deyil';
  END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Sorğu identifikatoru tələb olunur'; END IF;

  SELECT * INTO v_req FROM public.item_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sorğu tapılmadı'; END IF;

  IF v_role <> 'admin' AND NOT (v_role = 'anbardar' AND v_req.created_by = auth.uid()) THEN
    RAISE EXCEPTION 'İcazə yoxdur: yalnız sorğunun müəllifi və ya Admin ləğv edə bilər';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Sorğu artıq qapanıb (status: %) — ləğv edilə bilməz', v_req.status;
  END IF;

  UPDATE public.item_requests
     SET status = 'cancelled', decided_by = auth.uid(), decided_at = now(),
         decision_reason = NULLIF(btrim(COALESCE(p_reason, '')), ''), updated_at = now()
   WHERE id = v_req.id;

  INSERT INTO public.audit_log(ts, user_id, action, table_name, record_id, old_values, new_values, reason)
  VALUES (now(), auth.uid(), 'UPDATE', 'item_requests', v_req.id::TEXT,
          jsonb_build_object('status', 'pending', 'name', v_req.name),
          jsonb_build_object('status', 'cancelled'),
          'Nomenklatura sorğusu ləğv edildi');

  RETURN jsonb_build_object('id', v_req.id, 'status', 'cancelled');
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_layer_document(p_doc_num text, p_reversal_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_role TEXT; v_result JSONB; v_row JSONB; v_orig UUID; v_rev UUID; r RECORD; v_exact BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role:=public.current_user_role();
  IF v_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Yalnız Admin sənədi ləğv edə bilər'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('cancel|'||btrim(COALESCE(p_doc_num,''))));
  IF NOT EXISTS(SELECT 1 FROM public.writeoff_valuations v JOIN public.movements m ON m.id=v.movement_id
                WHERE m.doc_num=btrim(p_doc_num)) THEN
    SELECT EXISTS(SELECT 1 FROM public.stock_layers l JOIN public.movements m ON m.id=l.source_movement_id
                  WHERE m.doc_num=btrim(p_doc_num)) INTO v_exact;
    /* A post-cutover receipt has exact layers and can be cancelled only while
       every one of them is untouched. New mixed in/out documents are blocked
       by the posting wrapper, so their appearance is treated as corruption. */
    IF v_exact THEN
      IF EXISTS(SELECT 1 FROM public.movements WHERE doc_num=btrim(p_doc_num) AND out_qty>0) THEN
        RAISE EXCEPTION 'Dəqiq partiyalı sənəddə qarışıq mədaxil/məxaric tapıldı — avtomatik ləğv dayandırıldı';
      END IF;
      FOR r IN SELECT warehouse wh,item_code code,SUM(in_qty) qty
               FROM public.movements WHERE doc_num=btrim(p_doc_num) AND in_qty>0
               GROUP BY warehouse,item_code ORDER BY warehouse,item_code LOOP
        PERFORM pg_advisory_xact_lock(hashtext(r.wh||'|'||r.code));
        PERFORM 1 FROM public.stock_layers WHERE warehouse=r.wh AND item_code=r.code ORDER BY id FOR UPDATE;
        IF EXISTS(SELECT 1 FROM public.stock_layers l JOIN public.movements m ON m.id=l.source_movement_id
                  WHERE m.doc_num=btrim(p_doc_num) AND(l.available_qty<>l.initial_qty OR NOT l.active)) THEN
          RAISE EXCEPTION 'Mədaxil ləğv edilmir: onun partiyasından artıq istifadə olunub';
        END IF;
      END LOOP;
      PERFORM set_config('anbar.stock_layers_write','on',TRUE);
      v_result:=public.cancel_document(p_doc_num,p_reversal_date);
      UPDATE public.stock_layers l SET available_qty=0,active=FALSE,updated_at=now()
      FROM public.movements m WHERE m.id=l.source_movement_id AND m.doc_num=btrim(p_doc_num);
      RETURN v_result||jsonb_build_object('layer_version',36);
    END IF;
    /* Historical and mixed documents are already represented only by the
       cutover net layer. Lock scopes, let the proven legacy RPC reverse the
       ledger, then mirror its exact net delta in unresolved layers. Any
       shortage raises and rolls the whole transaction back. */
    FOR r IN SELECT warehouse wh,item_code code,SUM(out_qty-in_qty) delta
             FROM public.movements WHERE doc_num=btrim(p_doc_num)
             GROUP BY warehouse,item_code ORDER BY warehouse,item_code LOOP
      PERFORM pg_advisory_xact_lock(hashtext(r.wh||'|'||r.code));
    END LOOP;
    PERFORM set_config('anbar.stock_layers_write','on',TRUE);
    v_result:=public.cancel_document(p_doc_num,p_reversal_date);
    FOR r IN SELECT warehouse wh,item_code code,SUM(out_qty-in_qty) delta
             FROM public.movements WHERE doc_num=btrim(p_doc_num)
             GROUP BY warehouse,item_code ORDER BY warehouse,item_code LOOP
      PERFORM public.apply_legacy_layer_delta(r.wh,r.code,r.delta,p_reversal_date,v_result->>'reversal_doc_num');
    END LOOP;
    RETURN v_result||jsonb_build_object('layer_version',36,'historical_layers','unresolved');
  END IF;
  IF EXISTS(SELECT 1 FROM public.writeoff_valuations v JOIN public.movements m ON m.id=v.movement_id
            WHERE m.doc_num=btrim(p_doc_num) AND v.reversed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Bu sənəd artıq ləğv edilib';
  END IF;
  FOR v_orig IN SELECT v.movement_id FROM public.writeoff_valuations v JOIN public.movements m ON m.id=v.movement_id
                WHERE m.doc_num=btrim(p_doc_num) ORDER BY v.movement_id LOOP
    PERFORM 1 FROM public.stock_layer_allocations a JOIN public.stock_layers l ON l.id=a.layer_id
      WHERE a.writeoff_movement_id=v_orig FOR UPDATE OF l;
  END LOOP;
  PERFORM set_config('anbar.stock_layers_write','on',TRUE);
  v_result:=public.cancel_document(p_doc_num,p_reversal_date);
  FOR v_row IN SELECT jsonb_array_elements(v_result->'reversed') LOOP
    v_orig:=(v_row->>'orig_id')::uuid;
    v_rev:=COALESCE((v_row->>'reverse_in_id')::uuid,(v_row->>'reverse_out_id')::uuid);
    UPDATE public.stock_layers l SET available_qty=l.available_qty+x.qty,updated_at=now()
    FROM (SELECT layer_id,SUM(qty) qty FROM public.stock_layer_allocations
          WHERE writeoff_movement_id=v_orig AND reversed_at IS NULL GROUP BY layer_id) x
    WHERE l.id=x.layer_id;
    UPDATE public.stock_layer_allocations SET reversed_at=now()
      WHERE writeoff_movement_id=v_orig AND reversed_at IS NULL;
    UPDATE public.writeoff_valuations SET reversed_by_movement_id=v_rev,reversed_at=now()
      WHERE movement_id=v_orig;
  END LOOP;
  RETURN v_result||jsonb_build_object('layer_version',36);
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_layer_documents_batch(p_doc_nums text[], p_reversal_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_role TEXT; v_doc TEXT; v_results JSONB:='[]'::jsonb; v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role:=public.current_user_role();
  IF v_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Yalnız Admin sənədləri ləğv edə bilər'; END IF;
  IF p_doc_nums IS NULL OR cardinality(p_doc_nums)=0 THEN RAISE EXCEPTION 'Sənəd seçilməyib'; END IF;
  FOR v_doc IN SELECT DISTINCT btrim(x) FROM unnest(p_doc_nums) x ORDER BY btrim(x) LOOP
    IF v_doc='' THEN RAISE EXCEPTION 'Etibarsız sənəd nömrəsi'; END IF;
    IF EXISTS(SELECT 1 FROM public.movements WHERE doc_num=v_doc AND type='Yerdəyişmə') THEN
      v_result:=public.cancel_layer_transfer_document(v_doc,p_reversal_date);
    ELSE
      v_result:=public.cancel_layer_document(v_doc,p_reversal_date);
    END IF;
    v_results:=v_results||jsonb_build_array(v_result);
  END LOOP;
  RETURN jsonb_build_object('results',v_results,'document_count',jsonb_array_length(v_results),'layer_version',36);
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_layer_legacy_movement(p_movement_id uuid, p_reversal_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_role TEXT; v_result JSONB; r public.movements%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role:=public.current_user_role();
  IF v_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Yalnız Admin tarixi sətri ləğv edə bilər'; END IF;
  SELECT * INTO r FROM public.movements WHERE id=p_movement_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hərəkət tapılmadı'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(r.warehouse||'|'||r.item_code));
  PERFORM set_config('anbar.stock_layers_write','on',TRUE);
  v_result:=public.cancel_legacy_movement(p_movement_id,p_reversal_date);
  PERFORM public.apply_legacy_layer_delta(r.warehouse,r.item_code,
    COALESCE(r.out_qty,0)-COALESCE(r.in_qty,0),p_reversal_date,v_result->>'reversal_doc_num');
  RETURN v_result||jsonb_build_object('layer_version',36,'historical_layers','unresolved');
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_layer_legacy_transfer(p_movement_id uuid, p_reversal_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_role TEXT; v_result JSONB; r RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role:=public.current_user_role();
  IF v_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Yalnız Admin tarixi yerdəyişməni ləğv edə bilər'; END IF;
  /* The proven legacy RPC resolves the unique opposite pair. It is executed in
     this transaction; any later layer shortage raises and rolls its inserts
     back as well, so the ledger and layers cannot diverge. */
  PERFORM set_config('anbar.stock_layers_write','on',TRUE);
  v_result:=public.cancel_legacy_transfer(p_movement_id,p_reversal_date);
  FOR r IN SELECT warehouse wh,item_code code,SUM(out_qty-in_qty) delta
           FROM public.movements
           WHERE id IN((v_result->>'original_movement_id')::uuid,(v_result->>'paired_movement_id')::uuid)
           GROUP BY warehouse,item_code ORDER BY warehouse,item_code LOOP
    PERFORM public.apply_legacy_layer_delta(r.wh,r.code,r.delta,p_reversal_date,v_result->>'reversal_doc_num');
  END LOOP;
  RETURN v_result||jsonb_build_object('layer_version',36,'historical_layers','unresolved');
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_layer_movement_row(p_movement_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_role TEXT; v_result JSONB; v_rev UUID; r public.movements%ROWTYPE; v_exact BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role:=public.current_user_role();
  IF v_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Yalnız Admin sətri ləğv edə bilər'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.writeoff_valuations WHERE movement_id=p_movement_id) THEN
    SELECT * INTO r FROM public.movements WHERE id=p_movement_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Hərəkət tapılmadı'; END IF;
    IF r.type='Yerdəyişmə' THEN RAISE EXCEPTION 'Yerdəyişmə sətri ayrıca ləğv edilmir — bütün sənədi ləğv edin'; END IF;
    SELECT EXISTS(SELECT 1 FROM public.stock_layers WHERE source_movement_id=p_movement_id) INTO v_exact;
    PERFORM pg_advisory_xact_lock(hashtext(r.warehouse||'|'||r.item_code));
    IF v_exact AND EXISTS(SELECT 1 FROM public.stock_layers WHERE source_movement_id=p_movement_id
                          AND(available_qty<>initial_qty OR NOT active)) THEN
      RAISE EXCEPTION 'Mədaxil sətri ləğv edilmir: onun partiyasından artıq istifadə olunub';
    END IF;
    PERFORM set_config('anbar.stock_layers_write','on',TRUE);
    v_result:=public.cancel_movement_row(p_movement_id,p_reason);
    IF v_exact THEN
      UPDATE public.stock_layers SET available_qty=0,active=FALSE,updated_at=now()
      WHERE source_movement_id=p_movement_id;
    ELSE
      PERFORM public.apply_legacy_layer_delta(r.warehouse,r.item_code,
        COALESCE(r.out_qty,0)-COALESCE(r.in_qty,0),CURRENT_DATE,v_result->>'reversal_doc_num');
    END IF;
    RETURN v_result||jsonb_build_object('layer_version',36,
      'historical_layers',CASE WHEN v_exact THEN 'exact' ELSE 'unresolved' END);
  END IF;
  IF EXISTS(SELECT 1 FROM public.writeoff_valuations WHERE movement_id=p_movement_id AND reversed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Bu sətir artıq ləğv edilib';
  END IF;
  PERFORM 1 FROM public.stock_layer_allocations a JOIN public.stock_layers l ON l.id=a.layer_id
    WHERE a.writeoff_movement_id=p_movement_id FOR UPDATE OF l;
  PERFORM set_config('anbar.stock_layers_write','on',TRUE);
  v_result:=public.cancel_movement_row(p_movement_id,p_reason);
  v_rev:=(v_result->>'reversal_movement_id')::uuid;
  UPDATE public.stock_layers l SET available_qty=l.available_qty+x.qty,updated_at=now()
  FROM (SELECT layer_id,SUM(qty) qty FROM public.stock_layer_allocations
        WHERE writeoff_movement_id=p_movement_id AND reversed_at IS NULL GROUP BY layer_id) x
  WHERE l.id=x.layer_id;
  UPDATE public.stock_layer_allocations SET reversed_at=now()
    WHERE writeoff_movement_id=p_movement_id AND reversed_at IS NULL;
  UPDATE public.writeoff_valuations SET reversed_by_movement_id=v_rev,reversed_at=now()
    WHERE movement_id=p_movement_id;
  RETURN v_result||jsonb_build_object('layer_version',36);
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_layer_transfer_document(p_doc_num text, p_reversal_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_role TEXT; v_result JSONB; r RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role:=public.current_user_role();
  IF v_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Yalnız Admin yerdəyişməni ləğv edə bilər'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('cancel-transfer|'||btrim(COALESCE(p_doc_num,''))));
  IF NOT EXISTS(SELECT 1 FROM public.stock_layer_transfers t JOIN public.movements m ON m.id=t.transfer_out_movement_id
                WHERE m.doc_num=btrim(p_doc_num) AND t.reversed_at IS NULL) THEN
    FOR r IN SELECT warehouse wh,item_code code,SUM(out_qty-in_qty) delta
             FROM public.movements WHERE doc_num=btrim(p_doc_num) AND type='Yerdəyişmə'
             GROUP BY warehouse,item_code ORDER BY warehouse,item_code LOOP
      PERFORM pg_advisory_xact_lock(hashtext(r.wh||'|'||r.code));
    END LOOP;
    PERFORM set_config('anbar.stock_layers_write','on',TRUE);
    v_result:=public.cancel_transfer_document(p_doc_num,p_reversal_date);
    FOR r IN SELECT warehouse wh,item_code code,SUM(out_qty-in_qty) delta
             FROM public.movements WHERE doc_num=btrim(p_doc_num) AND type='Yerdəyişmə'
             GROUP BY warehouse,item_code ORDER BY warehouse,item_code LOOP
      PERFORM public.apply_legacy_layer_delta(r.wh,r.code,r.delta,p_reversal_date,v_result->>'reversal_doc_num');
    END LOOP;
    RETURN v_result||jsonb_build_object('layer_version',36,'historical_layers','unresolved');
  END IF;
  FOR r IN SELECT t.* FROM public.stock_layer_transfers t JOIN public.movements m ON m.id=t.transfer_out_movement_id
           WHERE m.doc_num=btrim(p_doc_num) AND t.reversed_at IS NULL ORDER BY t.destination_layer_id LOOP
    PERFORM 1 FROM public.stock_layers WHERE id IN(r.source_layer_id,r.destination_layer_id) ORDER BY id FOR UPDATE;
    IF NOT EXISTS(SELECT 1 FROM public.stock_layers WHERE id=r.destination_layer_id AND active
                  AND available_qty=r.qty AND initial_qty=r.qty) THEN
      RAISE EXCEPTION 'Yerdəyişmə ləğv edilmir: təyinat partiyasından artıq istifadə olunub';
    END IF;
  END LOOP;
  PERFORM set_config('anbar.stock_layers_write','on',TRUE);
  v_result:=public.cancel_transfer_document(p_doc_num,p_reversal_date);
  FOR r IN SELECT t.* FROM public.stock_layer_transfers t JOIN public.movements m ON m.id=t.transfer_out_movement_id
           WHERE m.doc_num=btrim(p_doc_num) AND t.reversed_at IS NULL ORDER BY t.destination_layer_id LOOP
    UPDATE public.stock_layers SET available_qty=0,active=FALSE,updated_at=now() WHERE id=r.destination_layer_id;
    UPDATE public.stock_layers SET available_qty=available_qty+r.qty,updated_at=now() WHERE id=r.source_layer_id;
    UPDATE public.stock_layer_transfers SET reversed_at=now() WHERE id=r.id;
  END LOOP;
  RETURN v_result||jsonb_build_object('layer_version',36);
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_legacy_movement(p_movement_id uuid, p_reversal_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role     TEXT;
  v_orig     public.movements%ROWTYPE;
  v_bal      NUMERIC;
  v_marker   TEXT;
  v_rev      TEXT;
  v_new_id   UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role <> 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: yalnız aktiv Admin əməliyyatı ləğv edə bilər';
  END IF;
  IF p_movement_id IS NULL OR p_reversal_date IS NULL THEN
    RAISE EXCEPTION 'Əməliyyat və ləğv tarixi tələb olunur';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('cancel-legacy|' || p_movement_id::TEXT));
  SELECT * INTO v_orig FROM public.movements WHERE id = p_movement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hərəkət qeydi tapılmadı'; END IF;
  IF COALESCE(v_orig.doc_num, '') <> '' THEN
    RAISE EXCEPTION 'Bu qeydin sənəd nömrəsi var — sənəd üzrə ləğv funksiyasından istifadə edin';
  END IF;
  IF v_orig.type = 'Yerdəyişmə' THEN
    RAISE EXCEPTION 'Köhnə yerdəyişmə üçün cancel_legacy_transfer çağırılmalıdır';
  END IF;
  IF v_orig.type NOT IN ('Satınalma', 'Əvvələ qalıq', 'Qaytarma', 'Silinmə', 'Sahəyə', 'Satış') THEN
    RAISE EXCEPTION 'Bu əməliyyat növü üçün ləğv dəstəklənmir: %', v_orig.type;
  END IF;
  IF (COALESCE(v_orig.in_qty, 0) > 0) = (COALESCE(v_orig.out_qty, 0) > 0) THEN
    RAISE EXCEPTION 'Qeydin giriş/çıxış istiqaməti etibarlı deyil';
  END IF;

  v_marker := 'Ləğv ID: ' || v_orig.id::TEXT;
  IF EXISTS (SELECT 1 FROM public.movements WHERE note = v_marker) THEN
    RAISE EXCEPTION 'Bu köhnə qeyd artıq ləğv edilib';
  END IF;

  IF COALESCE(v_orig.in_qty, 0) > 0 THEN
    PERFORM pg_advisory_xact_lock(hashtext(v_orig.warehouse || '|' || v_orig.item_code));
    SELECT COALESCE(SUM(in_qty - out_qty), 0) INTO v_bal
      FROM public.movements WHERE warehouse = v_orig.warehouse AND item_code = v_orig.item_code;
    IF v_bal < v_orig.in_qty THEN
      RAISE EXCEPTION 'Ləğv mümkün deyil: "%" anbarında % kodu üzrə mövcud %, geri çıxarılmalı %',
        v_orig.warehouse, v_orig.item_code, v_bal, v_orig.in_qty;
    END IF;
  END IF;

  v_rev := 'SND-L-' || UPPER(SUBSTR(MD5(clock_timestamp()::TEXT || random()::TEXT), 1, 10));
  INSERT INTO public.movements(date, warehouse, item_code, in_qty, out_qty, type, partner,
                        channel, contract_num, invoice_num, price, note, doc_num, created_by)
  VALUES (p_reversal_date, v_orig.warehouse, v_orig.item_code,
          COALESCE(v_orig.out_qty, 0), COALESCE(v_orig.in_qty, 0), v_orig.type, v_orig.partner,
          v_orig.channel, v_orig.contract_num, v_orig.invoice_num, v_orig.price, v_marker, v_rev, auth.uid())
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('original_movement_id', v_orig.id, 'reversal_doc_num', v_rev,
                            'reversal_movement_id', v_new_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_legacy_transfer(p_movement_id uuid, p_reversal_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role       TEXT;
  v_orig       public.movements%ROWTYPE;
  v_pair       public.movements%ROWTYPE;
  v_pair_count INT;
  v_source     TEXT;
  v_dest       TEXT;
  v_qty        NUMERIC;
  v_key        TEXT;
  v_marker     TEXT;
  v_bal        NUMERIC;
  v_rev        TEXT;
  v_in_id      UUID;
  v_out_id     UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role <> 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: yalnız aktiv Admin əməliyyatı ləğv edə bilər';
  END IF;
  IF p_movement_id IS NULL OR p_reversal_date IS NULL THEN
    RAISE EXCEPTION 'Əməliyyat və ləğv tarixi tələb olunur';
  END IF;

  SELECT * INTO v_orig FROM public.movements WHERE id = p_movement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hərəkət qeydi tapılmadı'; END IF;
  IF v_orig.type <> 'Yerdəyişmə' OR COALESCE(v_orig.doc_num, '') <> '' THEN
    RAISE EXCEPTION 'Bu köhnə, sənədsiz yerdəyişmə qeydi deyil';
  END IF;
  IF (COALESCE(v_orig.in_qty, 0) > 0) = (COALESCE(v_orig.out_qty, 0) > 0) THEN
    RAISE EXCEPTION 'Qeydin giriş/çıxış istiqaməti etibarlı deyil';
  END IF;

  IF COALESCE(v_orig.out_qty, 0) > 0 THEN
    v_source := v_orig.warehouse;
    v_dest := public.legacy_transfer_strip_suffix(v_orig.partner);
    v_qty := v_orig.out_qty;
  ELSE
    v_source := public.legacy_transfer_strip_suffix(v_orig.partner);
    v_dest := v_orig.warehouse;
    v_qty := v_orig.in_qty;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.warehouses WHERE name = v_source)
     OR NOT EXISTS (SELECT 1 FROM public.warehouses WHERE name = v_dest) THEN
    RAISE EXCEPTION 'Yerdəyişmənin mənbə və ya təyinat anbarı tanınmadı';
  END IF;

  IF COALESCE(v_orig.out_qty, 0) > 0 THEN
    SELECT COUNT(*) INTO v_pair_count FROM public.movements m
      WHERE m.id <> v_orig.id AND m.type = 'Yerdəyişmə' AND COALESCE(m.doc_num, '') = ''
        AND m.date = v_orig.date AND m.item_code = v_orig.item_code AND m.warehouse = v_dest
        AND COALESCE(m.in_qty, 0) = v_qty AND COALESCE(m.out_qty, 0) = 0
        AND public.legacy_transfer_strip_suffix(m.partner) = v_source;
    SELECT * INTO v_pair FROM public.movements m
      WHERE m.id <> v_orig.id AND m.type = 'Yerdəyişmə' AND COALESCE(m.doc_num, '') = ''
        AND m.date = v_orig.date AND m.item_code = v_orig.item_code AND m.warehouse = v_dest
        AND COALESCE(m.in_qty, 0) = v_qty AND COALESCE(m.out_qty, 0) = 0
        AND public.legacy_transfer_strip_suffix(m.partner) = v_source;
  ELSE
    SELECT COUNT(*) INTO v_pair_count FROM public.movements m
      WHERE m.id <> v_orig.id AND m.type = 'Yerdəyişmə' AND COALESCE(m.doc_num, '') = ''
        AND m.date = v_orig.date AND m.item_code = v_orig.item_code AND m.warehouse = v_source
        AND COALESCE(m.out_qty, 0) = v_qty AND COALESCE(m.in_qty, 0) = 0
        AND public.legacy_transfer_strip_suffix(m.partner) = v_dest;
    SELECT * INTO v_pair FROM public.movements m
      WHERE m.id <> v_orig.id AND m.type = 'Yerdəyişmə' AND COALESCE(m.doc_num, '') = ''
        AND m.date = v_orig.date AND m.item_code = v_orig.item_code AND m.warehouse = v_source
        AND COALESCE(m.out_qty, 0) = v_qty AND COALESCE(m.in_qty, 0) = 0
        AND public.legacy_transfer_strip_suffix(m.partner) = v_dest;
  END IF;
  -- Unchanged from 007: 0 or >1 candidates both refuse. No automatic pick.
  IF v_pair_count <> 1 THEN
    RAISE EXCEPTION 'Yerdəyişmə cütü dəqiq müəyyən edilmədi (tapılan cüt sayı: %). Storno ayrıca aparılmalıdır.', v_pair_count;
  END IF;

  v_key := LEAST(v_orig.id::TEXT, v_pair.id::TEXT) || ':' || GREATEST(v_orig.id::TEXT, v_pair.id::TEXT);
  PERFORM pg_advisory_xact_lock(hashtext('cancel-legacy-transfer|' || v_key));
  v_marker := 'Ləğv (əks yerdəyişmə) ID: ' || v_key;
  IF EXISTS (SELECT 1 FROM public.movements WHERE note = v_marker) THEN
    RAISE EXCEPTION 'Bu köhnə yerdəyişmə artıq ləğv edilib';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_dest || '|' || v_orig.item_code));
  SELECT COALESCE(SUM(in_qty - out_qty), 0) INTO v_bal
    FROM public.movements WHERE warehouse = v_dest AND item_code = v_orig.item_code;
  IF v_bal < v_qty THEN
    RAISE EXCEPTION 'Ləğv mümkün deyil: "%" anbarında % kodu üzrə mövcud %, geri çıxarılmalı %',
      v_dest, v_orig.item_code, v_bal, v_qty;
  END IF;

  v_rev := 'SND-LR-' || UPPER(SUBSTR(MD5(clock_timestamp()::TEXT || random()::TEXT), 1, 10));
  INSERT INTO public.movements(date, warehouse, item_code, in_qty, out_qty, type, partner,
                        channel, contract_num, invoice_num, price, note, doc_num, created_by)
  VALUES (p_reversal_date, v_source, v_orig.item_code, v_qty, 0, 'Yerdəyişmə', v_dest || ' anbarı',
          '', '', '', 0, v_marker, v_rev, auth.uid())
  RETURNING id INTO v_in_id;
  INSERT INTO public.movements(date, warehouse, item_code, in_qty, out_qty, type, partner,
                        channel, contract_num, invoice_num, price, note, doc_num, created_by)
  VALUES (p_reversal_date, v_dest, v_orig.item_code, 0, v_qty, 'Yerdəyişmə', v_source || ' anbarına',
          '', '', '', 0, v_marker, v_rev, auth.uid())
  RETURNING id INTO v_out_id;

  RETURN jsonb_build_object('original_movement_id', v_orig.id, 'paired_movement_id', v_pair.id,
                            'reversal_doc_num', v_rev, 'reverse_in_id', v_in_id, 'reverse_out_id', v_out_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_movement_row(p_movement_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role   TEXT;
  v_orig   public.movements%ROWTYPE;
  v_reason TEXT;
  v_marker TEXT;
  v_bal    NUMERIC;
  v_rev_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı';
  END IF;
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role <> 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: sətri yalnız aktiv Admin ləğv edə bilər';
  END IF;

  v_reason := NULLIF(TRIM(COALESCE(p_reason, '')), '');
  IF p_movement_id IS NULL THEN
    RAISE EXCEPTION 'Hərəkət qeydi tələb olunur';
  END IF;
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'Ləğvin səbəbi tələb olunur (audit üçün məcburi)';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('cancel-row|' || p_movement_id::TEXT));
  SELECT * INTO v_orig FROM public.movements WHERE id = p_movement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hərəkət qeydi tapılmadı';
  END IF;

  IF v_orig.type = 'Yerdəyişmə' THEN
    RAISE EXCEPTION 'Yerdəyişmə sətri bu yolla ləğv edilmir: sənədi bütövlükdə ləğv edin';
  END IF;
  IF v_orig.type NOT IN ('Satınalma', 'Əvvələ qalıq', 'Qaytarma', 'Silinmə', 'Sahəyə', 'Satış') THEN
    RAISE EXCEPTION 'Bu əməliyyat növü üçün sətir ləğvi dəstəklənmir: %', v_orig.type;
  END IF;
  IF (COALESCE(v_orig.in_qty, 0) > 0) = (COALESCE(v_orig.out_qty, 0) > 0) THEN
    RAISE EXCEPTION 'Qeydin giriş/çıxış istiqaməti etibarlı deyil';
  END IF;

  -- must not itself be a technical reversal row
  IF COALESCE(TRIM(v_orig.note), '') ~ '^Ləğv( ID:|:| \(əks yerdəyişmə\))' THEN
    RAISE EXCEPTION 'Ləğv (əks) sətri yenidən ləğv edilə bilməz';
  END IF;

  -- must not already be cancelled/replaced row-wise …
  v_marker := 'Ləğv ID: ' || v_orig.id::TEXT;
  IF EXISTS (SELECT 1 FROM public.movements WHERE note = v_marker) THEN
    RAISE EXCEPTION 'Bu sətir artıq ləğv edilib və ya əvəzlənib';
  END IF;
  -- … nor may its whole document have been cancelled
  IF COALESCE(v_orig.doc_num, '') <> '' AND EXISTS (
       SELECT 1 FROM public.movements
        WHERE note IN ('Ləğv: ' || v_orig.doc_num,
                       'Ləğv (əks yerdəyişmə): ' || v_orig.doc_num)
     ) THEN
    RAISE EXCEPTION 'Bu sənəd artıq bütövlükdə ləğv edilib: %', v_orig.doc_num;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_orig.warehouse || '|' || v_orig.item_code));

  IF COALESCE(v_orig.in_qty, 0) > 0 THEN
    SELECT COALESCE(SUM(in_qty - out_qty), 0) INTO v_bal
      FROM public.movements
     WHERE warehouse = v_orig.warehouse AND item_code = v_orig.item_code;
    IF v_bal < v_orig.in_qty THEN
      RAISE EXCEPTION 'Ləğv mümkün deyil: "%" anbarında % kodu üzrə mövcud %, geri çıxarılmalı %',
        v_orig.warehouse, v_orig.item_code, v_bal, v_orig.in_qty;
    END IF;
  END IF;
  -- outbound reversal only ADDS stock back — never negative, no check needed.

  INSERT INTO public.movements(date, warehouse, item_code, in_qty, out_qty, type, partner,
                               channel, contract_num, invoice_num, price, note, doc_num, created_by)
  VALUES (v_orig.date, v_orig.warehouse, v_orig.item_code,
          COALESCE(v_orig.out_qty, 0), COALESCE(v_orig.in_qty, 0),
          v_orig.type, v_orig.partner, v_orig.channel, v_orig.contract_num,
          v_orig.invoice_num, v_orig.price, v_marker, v_orig.doc_num, auth.uid())
  RETURNING id INTO v_rev_id;

  INSERT INTO public.audit_log(ts, user_id, action, table_name, record_id, old_values, new_values, reason)
  VALUES (now(), auth.uid(), 'UPDATE', 'movements', v_orig.id::TEXT,
          jsonb_build_object('item_code', v_orig.item_code, 'doc_num', v_orig.doc_num,
                             'warehouse', v_orig.warehouse, 'date', v_orig.date,
                             'in_qty', v_orig.in_qty, 'out_qty', v_orig.out_qty),
          jsonb_build_object('reversal_movement_id', v_rev_id),
          'Sətir ləğv edildi: ' || v_reason);

  RETURN jsonb_build_object(
    'original_movement_id', v_orig.id,
    'reversal_movement_id', v_rev_id,
    'doc_num',              v_orig.doc_num,
    'item_code',            v_orig.item_code);
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_transfer_document(p_original_doc_num text, p_reversal_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role     TEXT;
  v_orig     TEXT;
  v_rev      TEXT;
  v_marker   TEXT;
  v_bal      NUMERIC;
  v_out_id   UUID;
  v_in_id    UUID;
  v_other    TEXT;
  v_exp      NUMERIC;   -- <<031-fix (§12)>> İcarə amount to move back on reversal
  v_reversed JSONB := '[]'::JSONB;
  r          RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role <> 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: yalnız Admin əməliyyatı ləğv edə bilər (rol: %)', COALESCE(v_role, 'naməlum');
  END IF;

  v_orig := NULLIF(TRIM(COALESCE(p_original_doc_num, '')), '');
  IF v_orig IS NULL THEN
    RAISE EXCEPTION 'Etibarlı sənəd nömrəsi yoxdur — bu düzəliş ayrıca təsdiqlənmiş storno əməliyyatı tələb edir';
  END IF;

  v_marker := 'Ləğv (əks yerdəyişmə): ' || v_orig;
  PERFORM pg_advisory_xact_lock(hashtext('cancel|' || v_orig));

  IF NOT EXISTS (SELECT 1 FROM public.movements WHERE doc_num = v_orig AND type = 'Yerdəyişmə') THEN
    RAISE EXCEPTION 'Yerdəyişmə sənədi tapılmadı: %', v_orig;
  END IF;
  IF EXISTS (SELECT 1 FROM public.movements WHERE doc_num = v_orig AND type <> 'Yerdəyişmə') THEN
    RAISE EXCEPTION 'Sənəd sırf yerdəyişmə deyil — ləğv edilə bilməz: %', v_orig;
  END IF;
  IF EXISTS (SELECT 1 FROM public.movements WHERE doc_num = v_orig AND note LIKE 'Ləğv (əks yerdəyişmə): %') THEN
    RAISE EXCEPTION 'Əks yerdəyişmə sənədi yenidən ləğv edilə bilməz: %', v_orig;
  END IF;
  IF EXISTS (SELECT 1 FROM public.movements WHERE note = v_marker) THEN
    RAISE EXCEPTION 'Bu sənəd artıq ləğv edilib: %', v_orig;
  END IF;

  -- 028: validate EVERY leg's warehouses before writing anything.
  FOR r IN SELECT id, warehouse, partner FROM public.movements
            WHERE doc_num = v_orig AND type = 'Yerdəyişmə' ORDER BY id LOOP
    v_other := public.legacy_transfer_strip_suffix(r.partner);
    IF v_other IS NULL OR v_other = '' THEN
      RAISE EXCEPTION 'Yerdəyişmə sətrinin qarşı tərəfi boşdur (sətir %): "%"', r.id, r.partner;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.warehouses w WHERE w.name = v_other) THEN
      RAISE EXCEPTION 'Yerdəyişmənin qarşı anbarı tanınmadı (sətir %): "%" -> "%"', r.id, r.partner, v_other;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.warehouses w WHERE w.name = r.warehouse) THEN
      RAISE EXCEPTION 'Yerdəyişmə sətrinin anbarı tanınmadı (sətir %): "%"', r.id, r.warehouse;
    END IF;
  END LOOP;

  FOR r IN SELECT DISTINCT warehouse AS wh, item_code AS code
             FROM public.movements WHERE doc_num = v_orig AND type = 'Yerdəyişmə' AND in_qty > 0
             ORDER BY warehouse, item_code LOOP
    PERFORM pg_advisory_xact_lock(hashtext(r.wh || '|' || r.code));
  END LOOP;

  FOR r IN SELECT warehouse AS wh, item_code AS code, SUM(in_qty) AS need
             FROM public.movements WHERE doc_num = v_orig AND type = 'Yerdəyişmə' AND in_qty > 0
             GROUP BY warehouse, item_code LOOP
    SELECT COALESCE(SUM(in_qty - out_qty), 0) INTO v_bal
      FROM public.movements WHERE warehouse = r.wh AND item_code = r.code;
    IF v_bal < r.need THEN
      RAISE EXCEPTION 'Ləğv mümkün deyil: "%" anbarında % kodu üzrə mövcud %, geri qaytarılmalı % — mal artıq hərəkət edib',
        r.wh, r.code, v_bal, r.need;
    END IF;
  END LOOP;

  v_rev := 'SND-R-' || UPPER(SUBSTR(MD5(clock_timestamp()::TEXT || random()::TEXT), 1, 10));
  IF EXISTS (SELECT 1 FROM public.movements WHERE doc_num = v_rev) THEN
    v_rev := 'SND-R-' || UPPER(SUBSTR(MD5(clock_timestamp()::TEXT || random()::TEXT || 'x'), 1, 10));
  END IF;

  FOR r IN SELECT * FROM public.movements WHERE doc_num = v_orig AND type = 'Yerdəyişmə' ORDER BY id LOOP
    -- Resolved and validated above; rebuilt canonically here, so a doubled
    -- suffix ("anbar anbarı") is structurally impossible regardless of which
    -- of the three input forms the original row carried.
    v_other := public.legacy_transfer_strip_suffix(r.partner);
    IF r.out_qty > 0 THEN
      INSERT INTO public.movements(date, warehouse, item_code, in_qty, out_qty, type, partner,
                            channel, contract_num, invoice_num, price, note, doc_num, created_by)
      VALUES (p_reversal_date, r.warehouse, r.item_code, r.out_qty, 0, 'Yerdəyişmə',
              v_other || ' anbarı',
              r.channel, r.contract_num, r.invoice_num, 0, v_marker, v_rev, auth.uid())
      RETURNING id INTO v_in_id;

      -- <<031-fix (§12)>> This is the SOURCE leg of the original transfer
      -- (r.warehouse = source, v_other = destination). Read back whatever
      -- İcarə amount log_icare_exposure recorded for this exact (doc, source,
      -- item) when the transfer was posted, and move the figure the other
      -- way: give it back to the source, take it off the destination. Reading
      -- only the OUT-qty leg means a document with several lines for the same
      -- item is never processed twice. If nothing was logged (rent never
      -- touched this line), v_exp is 0 and nothing happens — silent no-op,
      -- exactly like apply_icare_delta elsewhere in this file.
      SELECT COALESCE(SUM((a.new_values->>'from_icare')::NUMERIC), 0) INTO v_exp
        FROM public.audit_log a
       WHERE a.table_name = 'movements'
         AND a.record_id  = v_orig || '|' || r.warehouse || '|' || r.item_code
         AND a.new_values->>'doc_num' = v_orig
         AND a.new_values->>'type'    = 'Yerdəyişmə';
      IF v_exp > 0 THEN
        PERFORM public.apply_icare_delta(r.warehouse, r.item_code,  v_exp);
        PERFORM public.apply_icare_delta(v_other,      r.item_code, -v_exp);
      END IF;

      v_reversed := v_reversed || jsonb_build_object('orig_id', r.id, 'reverse_in_id', v_in_id,
                     'warehouse', r.warehouse, 'code', r.item_code, 'qty', r.out_qty);
    ELSIF r.in_qty > 0 THEN
      INSERT INTO public.movements(date, warehouse, item_code, in_qty, out_qty, type, partner,
                            channel, contract_num, invoice_num, price, note, doc_num, created_by)
      VALUES (p_reversal_date, r.warehouse, r.item_code, 0, r.in_qty, 'Yerdəyişmə',
              v_other || ' anbarına',
              r.channel, r.contract_num, r.invoice_num, 0, v_marker, v_rev, auth.uid())
      RETURNING id INTO v_out_id;
      v_reversed := v_reversed || jsonb_build_object('orig_id', r.id, 'reverse_out_id', v_out_id,
                     'warehouse', r.warehouse, 'code', r.item_code, 'qty', r.in_qty);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('original_doc_num', v_orig, 'reversal_doc_num', v_rev,
                            'reversed', v_reversed, 'row_count', jsonb_array_length(v_reversed));
END;
$function$;

CREATE OR REPLACE FUNCTION public.correct_document(p_doc_num text, p_lines jsonb, p_reason text, p_reversal_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role     TEXT;
  v_doc      TEXT;
  v_reason   TEXT;
  v_impact   JSONB;
  v_dir_old  TEXT;
  v_type_old TEXT;
  v_marker   TEXT;
  v_line     JSONB;
  v_ln       INT := 0;
  v_ntype    INT;
  v_lines    JSONB := '[]'::JSONB;
  v_cancel   JSONB;
  v_posted   JSONB;
  v_new_doc  TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role <> 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: sənədi yalnız Admin redaktə edə bilər (rol: %)', COALESCE(v_role, 'naməlum');
  END IF;

  v_doc := NULLIF(TRIM(COALESCE(p_doc_num, '')), '');
  IF v_doc IS NULL THEN
    RAISE EXCEPTION 'Etibarlı sənəd nömrəsi yoxdur';
  END IF;

  v_reason := NULLIF(TRIM(COALESCE(p_reason, '')), '');
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'Redaktənin səbəbi tələb olunur (audit üçün)';
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Düzəliş sətirləri boşdur — sənəd dəyişdirilmədi';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('correct|' || v_doc));
  PERFORM pg_advisory_xact_lock(hashtext('cancel|'  || v_doc));

  v_impact := public.document_edit_impact(v_doc);
  IF NOT (v_impact->>'editable')::BOOLEAN THEN
    RAISE EXCEPTION 'Sənəd redaktə edilə bilməz: %',
      COALESCE((SELECT string_agg(b->>'message', ' · ')
                  FROM jsonb_array_elements(v_impact->'blocks') b), 'naməlum səbəb');
  END IF;

  v_type_old := v_impact->>'type';
  v_dir_old  := v_impact->>'direction';

  FOR v_line IN SELECT jsonb_array_elements(p_lines) LOOP
    v_ln := v_ln + 1;

    IF (v_line->>'type') IS NULL
       OR (v_line->>'type') NOT IN ('Satınalma', 'Qaytarma', 'İcarə', 'Silinmə', 'Sahəyə', 'Satış') THEN
      RAISE EXCEPTION 'Sətir %: bu əməliyyat növü düzəlişdə istifadə edilə bilməz (%)',
        v_ln, COALESCE(v_line->>'type', 'boş');
    END IF;

    IF (v_line->>'in_qty') IS NULL OR (v_line->>'out_qty') IS NULL THEN
      RAISE EXCEPTION 'Sətir %: giriş/çıxış miqdarı tələb olunur', v_ln;
    END IF;

    IF v_dir_old = 'in'  AND NOT ((v_line->>'in_qty')::NUMERIC  > 0) THEN
      RAISE EXCEPTION 'Sətir %: mədaxil sənədi yalnız mədaxil sətirləri ilə düzəldilir', v_ln;
    END IF;
    IF v_dir_old = 'out' AND NOT ((v_line->>'out_qty')::NUMERIC > 0) THEN
      RAISE EXCEPTION 'Sətir %: məxaric sənədi yalnız məxaric sətirləri ilə düzəldilir', v_ln;
    END IF;
  END LOOP;

  SELECT COUNT(DISTINCT l->>'type') INTO v_ntype
    FROM jsonb_array_elements(p_lines) l;
  IF v_ntype <> 1 THEN
    RAISE EXCEPTION 'Düzəliş sənədi tək əməliyyat növündən ibarət olmalıdır';
  END IF;

  v_marker := 'Əvəz edir: ' || v_doc;
  SELECT jsonb_agg(
           l || jsonb_build_object(
             'note',
             CASE WHEN COALESCE(TRIM(l->>'note'), '') = '' THEN v_marker
                  ELSE TRIM(l->>'note') || ' · ' || v_marker END))
    INTO v_lines
    FROM jsonb_array_elements(p_lines) l;

  v_cancel  := public.cancel_document(v_doc, p_reversal_date);
  v_posted  := public.post_movement_document(v_lines, NULL);
  v_new_doc := v_posted->>'doc_num';

  INSERT INTO public.audit_log(ts, user_id, action, table_name, record_id,
                               old_values, new_values, reason)
  VALUES (now(), auth.uid(), 'UPDATE', 'movements', v_doc,
          jsonb_build_object('doc_num', v_doc,
                             'type', v_type_old,
                             'direction', v_dir_old,
                             'lines', v_impact->'lines',
                             'reversal_doc_num', v_cancel->>'reversal_doc_num'),
          jsonb_build_object('doc_num', v_new_doc,
                             'row_count', v_posted->'row_count',
                             'lines', v_lines),
          'Sənəd düzəlişi (correct_document): ' || v_reason);

  RETURN jsonb_build_object(
    'original_doc_num', v_doc,
    'reversal_doc_num', v_cancel->>'reversal_doc_num',
    'new_doc_num',      v_new_doc,
    'type',             v_type_old,
    'row_count',        v_posted->'row_count',
    'reason',           v_reason);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_serfiyyat_document(p_project_id uuid, p_doc_date date, p_kontragent text DEFAULT NULL::text, p_avtomobil_nomresi text DEFAULT NULL::text, p_alinma_kanali text DEFAULT NULL::text, p_invoice_num text DEFAULT NULL::text, p_note text DEFAULT NULL::text, p_lines jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role     TEXT := public.current_user_role();
  v_wh       TEXT := public.current_user_warehouse();
  v_project  RECORD;
  v_doc_id   UUID;
  v_doc_num  TEXT;
  v_line     JSONB;
  v_ln       INT := 0;
  v_code     TEXT;
  v_qty      NUMERIC;
  v_price    NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR v_role NOT IN ('admin','anbardar') THEN
    RAISE EXCEPTION 'İcazə yoxdur: Sərfiyyat Materialları sənədini yalnız Admin və ya Anbardar yarada bilər';
  END IF;

  SELECT * INTO v_project FROM public.serfiyyat_projects WHERE id = p_project_id AND active = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Layihə tapılmadı və ya deaktivdir';
  END IF;

  IF v_role = 'anbardar' AND (v_wh IS NULL OR v_project.linked_warehouse IS DISTINCT FROM v_wh) THEN
    RAISE EXCEPTION 'İcazə yoxdur: yalnız öz layihənizdə sənəd yarada bilərsiniz';
  END IF;

  IF p_doc_date IS NULL THEN
    RAISE EXCEPTION 'Tarix tələb olunur';
  END IF;

  IF p_alinma_kanali IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.reference_values r
    WHERE r.kind = 'serfiyyat_channel' AND lower(r.name) = lower(p_alinma_kanali) AND r.active = TRUE
  ) THEN
    RAISE EXCEPTION 'Yanlış alınma kanalı: "%"', p_alinma_kanali;
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Sənəddə ən azı bir material sətri olmalıdır';
  END IF;

  v_doc_num := public.next_serfiyyat_doc_num();
  INSERT INTO public.serfiyyat_documents
    (doc_num, project_id, kontragent, avtomobil_nomresi, alinma_kanali, invoice_num, doc_date, note, created_by)
  VALUES
    (v_doc_num, p_project_id, nullif(trim(coalesce(p_kontragent,'')),''),
     nullif(trim(coalesce(p_avtomobil_nomresi,'')),''), p_alinma_kanali,
     nullif(trim(coalesce(p_invoice_num,'')),''), p_doc_date,
     nullif(trim(coalesce(p_note,'')),''), auth.uid())
  RETURNING id INTO v_doc_id;

  FOR v_line IN SELECT jsonb_array_elements(p_lines) LOOP
    v_ln := v_ln + 1;
    v_code := nullif(trim(coalesce(v_line->>'code','')),'');
    IF v_code IS NULL THEN
      RAISE EXCEPTION 'Sətir %: mal kodu boşdur', v_ln;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.items WHERE code = v_code) THEN
      RAISE EXCEPTION 'Sətir %: mal kodu tapılmadı: %', v_ln, v_code;
    END IF;
    IF (v_line->>'qty') IS NULL OR (v_line->>'qty') !~ '^[0-9]+(\.[0-9]+)?$' OR (v_line->>'qty')::numeric <= 0 THEN
      RAISE EXCEPTION 'Sətir %: miqdar müsbət ədəd olmalıdır', v_ln;
    END IF;
    IF (v_line->>'price') IS NOT NULL AND (v_line->>'price') !~ '^[0-9]+(\.[0-9]+)?$' THEN
      RAISE EXCEPTION 'Sətir %: qiymət düzgün deyil', v_ln;
    END IF;
    v_qty := (v_line->>'qty')::numeric;
    v_price := coalesce((v_line->>'price')::numeric, 0);

    INSERT INTO public.serfiyyat_lines(document_id, item_code, qty, price)
    VALUES (v_doc_id, v_code, v_qty, v_price);
  END LOOP;

  INSERT INTO public.audit_log(ts, user_id, action, table_name, record_id, old_values, new_values, reason)
  VALUES (now(), auth.uid(), 'INSERT', 'serfiyyat_documents', v_doc_id, NULL,
          jsonb_build_object('doc_num', v_doc_num, 'project_id', p_project_id,
                             'invoice_num', p_invoice_num, 'lines', jsonb_array_length(p_lines)),
          'Sərfiyyat Materialları sənədi yaradıldı');

  RETURN jsonb_build_object('ok', TRUE, 'id', v_doc_id, 'doc_num', v_doc_num, 'lines', v_ln);
END;
$function$;

CREATE OR REPLACE FUNCTION public.current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.effective_role(role)
  FROM public.users
  WHERE id = auth.uid() AND active = TRUE;
$function$;

CREATE OR REPLACE FUNCTION public.current_user_warehouse()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT warehouse
  FROM public.users
  WHERE id = auth.uid() AND active = TRUE AND role = 'anbardar';
$function$;

CREATE OR REPLACE FUNCTION public.delete_serfiyyat_document(p_doc_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_doc      RECORD;
  v_old_json JSONB;
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: sənədi yalnız Admin silə bilər';
  END IF;

  SELECT * INTO v_doc FROM public.serfiyyat_documents WHERE id = p_doc_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sənəd tapılmadı'; END IF;

  SELECT jsonb_build_object(
    'doc_num', v_doc.doc_num, 'project_id', v_doc.project_id, 'kontragent', v_doc.kontragent,
    'avtomobil_nomresi', v_doc.avtomobil_nomresi, 'alinma_kanali', v_doc.alinma_kanali,
    'doc_date', v_doc.doc_date, 'note', v_doc.note,
    'lines', (SELECT coalesce(jsonb_agg(jsonb_build_object('item_code', l.item_code, 'qty', l.qty, 'price', l.price)), '[]'::jsonb)
              FROM public.serfiyyat_lines l WHERE l.document_id = p_doc_id)
  ) INTO v_old_json;

  DELETE FROM public.serfiyyat_documents WHERE id = p_doc_id;

  INSERT INTO public.audit_log(ts, user_id, action, table_name, record_id, old_values, new_values, reason)
  VALUES (now(), auth.uid(), 'DELETE', 'serfiyyat_documents', p_doc_id, v_old_json, NULL,
          'Sərfiyyat Materialları sənədi silindi');

  RETURN jsonb_build_object('ok', TRUE, 'id', p_doc_id, 'doc_num', v_doc.doc_num);
END;
$function$;

CREATE OR REPLACE FUNCTION public.document_edit_impact(p_doc_num text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role     TEXT;
  v_doc      TEXT;
  v_type     TEXT;
  v_ntypes   INT;
  v_dir      TEXT;
  v_after    TIMESTAMPTZ;
  v_blocks   JSONB := '[]'::JSONB;
  v_lines    JSONB := '[]'::JSONB;
  r          RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role <> 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: sənədi yalnız Admin redaktə edə bilər (rol: %)', COALESCE(v_role, 'naməlum');
  END IF;

  v_doc := NULLIF(TRIM(COALESCE(p_doc_num, '')), '');
  IF v_doc IS NULL THEN
    RAISE EXCEPTION 'Etibarlı sənəd nömrəsi yoxdur';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.movements WHERE doc_num = v_doc) THEN
    RAISE EXCEPTION 'Sənəd tapılmadı: %', v_doc;
  END IF;

  SELECT COUNT(DISTINCT type) INTO v_ntypes FROM public.movements WHERE doc_num = v_doc;
  IF v_ntypes <> 1 THEN
    v_blocks := v_blocks || jsonb_build_object(
      'code', 'mixed_types',
      'message', 'Sənəd qarışıq əməliyyat növlərindən ibarətdir — redaktə edilə bilmir');
  END IF;

  SELECT type INTO v_type FROM public.movements WHERE doc_num = v_doc LIMIT 1;

  IF v_type = 'Yerdəyişmə' THEN
    v_blocks := v_blocks || jsonb_build_object(
      'code', 'transfer',
      'message', 'Yerdəyişmə sənədi bu yolla redaktə edilmir — sənədi ləğv edin və yenisini yazın');
  END IF;

  IF v_type = 'Əvvələ qalıq' THEN
    v_blocks := v_blocks || jsonb_build_object(
      'code', 'initial_balance',
      'message', 'Tarixi ilkin qalıq sənədi redaktə edilmir');
  END IF;

  IF v_type IS NOT NULL AND v_type NOT IN ('Satınalma', 'Qaytarma', 'İcarə', 'Silinmə', 'Sahəyə', 'Satış') THEN
    v_blocks := v_blocks || jsonb_build_object(
      'code', 'unsupported_type',
      'message', format('Bu əməliyyat növü redaktə edilmir: %s', v_type));
  END IF;

  IF (SELECT COUNT(*) FROM public.movements WHERE doc_num = v_doc AND in_qty  > 0) > 0
 AND (SELECT COUNT(*) FROM public.movements WHERE doc_num = v_doc AND out_qty > 0) > 0 THEN
    v_blocks := v_blocks || jsonb_build_object(
      'code', 'mixed_direction',
      'message', 'Sənəddə həm mədaxil, həm məxaric sətri var — bu halda redaktə sətrin istiqamətini dəyişə bilər, ona görə bloklanır');
  END IF;

  IF EXISTS (SELECT 1 FROM public.movements
               WHERE doc_num = v_doc
                 AND (note LIKE 'Ləğv: %' OR note LIKE 'Ləğv (əks yerdəyişmə): %')) THEN
    v_blocks := v_blocks || jsonb_build_object(
      'code', 'is_reversal',
      'message', 'Bu, ləğv (əks yazı) sənədidir — redaktə edilmir');
  END IF;

  IF EXISTS (SELECT 1 FROM public.movements WHERE note = 'Ləğv: ' || v_doc) THEN
    v_blocks := v_blocks || jsonb_build_object(
      'code', 'already_cancelled',
      'message', 'Bu sənəd artıq ləğv edilib — redaktə edilmir');
  END IF;

  IF EXISTS (SELECT 1 FROM public.movements x
               WHERE x.note LIKE 'Ləğv ID: %'
                 AND TRIM(SUBSTRING(x.note FROM '^Ləğv ID:[[:space:]]*(.+)$'))
                     IN (SELECT id::TEXT FROM public.movements WHERE doc_num = v_doc)) THEN
    v_blocks := v_blocks || jsonb_build_object(
      'code', 'row_replaced',
      'message', 'Sənədin bir sətrində mal artıq əvəz edilib — sənəd bütövlükdə redaktə edilmir');
  END IF;

  SELECT MAX(created_at) INTO v_after FROM public.movements WHERE doc_num = v_doc;

  FOR r IN
    SELECT later.doc_num AS blocking_doc,
           later.type    AS blocking_type,
           later.date    AS blocking_date,
           later.warehouse,
           later.item_code,
           COUNT(*)      AS rows_affected
      FROM public.movements later
      JOIN (SELECT DISTINCT warehouse, item_code
              FROM public.movements WHERE doc_num = v_doc) mine
        ON mine.warehouse = later.warehouse AND mine.item_code = later.item_code
     WHERE later.doc_num IS DISTINCT FROM v_doc
       AND later.created_at > v_after
     GROUP BY later.doc_num, later.type, later.date, later.warehouse, later.item_code
     ORDER BY later.date, later.doc_num
  LOOP
    v_blocks := v_blocks || jsonb_build_object(
      'code', 'later_movement',
      'message', format('Bu sənəddən sonra "%s" anbarında %s kodu üzrə əməliyyat aparılıb (%s, %s, sənəd: %s)',
                        r.warehouse, r.item_code, r.blocking_type, r.blocking_date,
                        COALESCE(r.blocking_doc, '—')),
      'doc_num',   r.blocking_doc,
      'type',      r.blocking_type,
      'date',      r.blocking_date,
      'warehouse', r.warehouse,
      'item_code', r.item_code);
  END LOOP;

  IF to_regclass('public.stock_conditions') IS NOT NULL THEN
    FOR r IN
      SELECT sc.warehouse, sc.item_code, sc.unfit_qty, sc.repair_qty, sc.onsite_qty
        FROM public.stock_conditions sc
        JOIN (SELECT DISTINCT warehouse, item_code
                FROM public.movements WHERE doc_num = v_doc) mine
          ON mine.warehouse = sc.warehouse AND mine.item_code = sc.item_code
       WHERE sc.unfit_qty > 0 OR sc.repair_qty > 0 OR sc.onsite_qty > 0
       ORDER BY sc.warehouse, sc.item_code
    LOOP
      v_blocks := v_blocks || jsonb_build_object(
        'code', 'stock_condition',
        'message', format('"%s" anbarında %s kodu üzrə mal vəziyyəti qeydi var (yararsız %s, təmirə %s, sahədə %s) — əvvəlcə onu silin',
                          r.warehouse, r.item_code, r.unfit_qty, r.repair_qty, r.onsite_qty),
        'warehouse', r.warehouse,
        'item_code', r.item_code);
    END LOOP;
  END IF;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'ln'), '[]'::JSONB) INTO v_lines
  FROM (
    SELECT jsonb_build_object(
             'ln',        LPAD(ROW_NUMBER() OVER (ORDER BY m.id)::TEXT, 6, '0'),
             'id',        m.id,
             'date',      m.date,
             'warehouse', m.warehouse,
             'code',      m.item_code,
             'type',      m.type,
             'in_qty',    m.in_qty,
             'out_qty',   m.out_qty,
             'partner',   m.partner,
             'channel',   m.channel,
             'contract',  m.contract_num,
             'invoice',   m.invoice_num,
             'price',     m.price,
             'note',      m.note) AS x
      FROM public.movements m WHERE m.doc_num = v_doc
  ) s;

  SELECT CASE WHEN BOOL_OR(in_qty > 0) THEN 'in' ELSE 'out' END INTO v_dir
    FROM public.movements WHERE doc_num = v_doc;

  RETURN jsonb_build_object(
    'doc_num',   v_doc,
    'type',      v_type,
    'direction', v_dir,
    'editable',  jsonb_array_length(v_blocks) = 0,
    'blocks',    v_blocks,
    'lines',     v_lines,
    'export_warning',
      'Excel ixracı qeyd edilmir — bu sənəd artıq ixrac edilibsə və ya mühasibatlığa verilibsə, redaktə etməyin.');
END;
$function$;

CREATE OR REPLACE FUNCTION public.edit_serfiyyat_document(p_doc_id uuid, p_project_id uuid, p_doc_date date, p_kontragent text DEFAULT NULL::text, p_avtomobil_nomresi text DEFAULT NULL::text, p_alinma_kanali text DEFAULT NULL::text, p_invoice_num text DEFAULT NULL::text, p_note text DEFAULT NULL::text, p_lines jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_doc      RECORD;
  v_project  RECORD;
  v_old_json JSONB;
  v_line     JSONB;
  v_ln       INT := 0;
  v_code     TEXT;
  v_qty      NUMERIC;
  v_price    NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: provedilmiş sənədi yalnız Admin düzəldə bilər';
  END IF;

  SELECT * INTO v_doc FROM public.serfiyyat_documents WHERE id = p_doc_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sənəd tapılmadı'; END IF;

  SELECT * INTO v_project FROM public.serfiyyat_projects WHERE id = p_project_id AND active = TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Layihə tapılmadı və ya deaktivdir'; END IF;

  IF p_doc_date IS NULL THEN RAISE EXCEPTION 'Tarix tələb olunur'; END IF;

  IF p_alinma_kanali IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.reference_values r
    WHERE r.kind = 'serfiyyat_channel' AND lower(r.name) = lower(p_alinma_kanali) AND r.active = TRUE
  ) THEN
    RAISE EXCEPTION 'Yanlış alınma kanalı: "%"', p_alinma_kanali;
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Sənəddə ən azı bir material sətri olmalıdır';
  END IF;

  SELECT jsonb_build_object(
    'doc_num', v_doc.doc_num, 'project_id', v_doc.project_id, 'kontragent', v_doc.kontragent,
    'avtomobil_nomresi', v_doc.avtomobil_nomresi, 'alinma_kanali', v_doc.alinma_kanali,
    'invoice_num', v_doc.invoice_num, 'doc_date', v_doc.doc_date, 'note', v_doc.note,
    'lines', (SELECT coalesce(jsonb_agg(jsonb_build_object('item_code', l.item_code, 'qty', l.qty, 'price', l.price)), '[]'::jsonb)
              FROM public.serfiyyat_lines l WHERE l.document_id = p_doc_id)
  ) INTO v_old_json;

  FOR v_line IN SELECT jsonb_array_elements(p_lines) LOOP
    v_ln := v_ln + 1;
    v_code := nullif(trim(coalesce(v_line->>'code','')),'');
    IF v_code IS NULL THEN RAISE EXCEPTION 'Sətir %: mal kodu boşdur', v_ln; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.items WHERE code = v_code) THEN
      RAISE EXCEPTION 'Sətir %: mal kodu tapılmadı: %', v_ln, v_code;
    END IF;
    IF (v_line->>'qty') IS NULL OR (v_line->>'qty') !~ '^[0-9]+(\.[0-9]+)?$' OR (v_line->>'qty')::numeric <= 0 THEN
      RAISE EXCEPTION 'Sətir %: miqdar müsbət ədəd olmalıdır', v_ln;
    END IF;
    IF (v_line->>'price') IS NOT NULL AND (v_line->>'price') !~ '^[0-9]+(\.[0-9]+)?$' THEN
      RAISE EXCEPTION 'Sətir %: qiymət düzgün deyil', v_ln;
    END IF;
  END LOOP;

  UPDATE public.serfiyyat_documents SET
    project_id = p_project_id,
    kontragent = nullif(trim(coalesce(p_kontragent,'')),''),
    avtomobil_nomresi = nullif(trim(coalesce(p_avtomobil_nomresi,'')),''),
    alinma_kanali = p_alinma_kanali,
    invoice_num = nullif(trim(coalesce(p_invoice_num,'')),''),
    doc_date = p_doc_date,
    note = nullif(trim(coalesce(p_note,'')),'')
  WHERE id = p_doc_id;

  DELETE FROM public.serfiyyat_lines WHERE document_id = p_doc_id;
  FOR v_line IN SELECT jsonb_array_elements(p_lines) LOOP
    v_code := trim(v_line->>'code');
    v_qty := (v_line->>'qty')::numeric;
    v_price := coalesce((v_line->>'price')::numeric, 0);
    INSERT INTO public.serfiyyat_lines(document_id, item_code, qty, price)
    VALUES (p_doc_id, v_code, v_qty, v_price);
  END LOOP;

  INSERT INTO public.audit_log(ts, user_id, action, table_name, record_id, old_values, new_values, reason)
  VALUES (now(), auth.uid(), 'UPDATE', 'serfiyyat_documents', p_doc_id, v_old_json,
          jsonb_build_object('doc_num', v_doc.doc_num, 'project_id', p_project_id,
                             'invoice_num', p_invoice_num, 'lines', jsonb_array_length(p_lines)),
          'Sərfiyyat Materialları sənədi düzəldildi (provedildikdən sonra)');

  RETURN jsonb_build_object('ok', TRUE, 'id', p_doc_id, 'doc_num', v_doc.doc_num, 'lines', v_ln);
END;
$function$;

CREATE OR REPLACE FUNCTION public.effective_role(p_role text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_role = 'admin' THEN 'admin'
    WHEN p_role = 'anbardar' THEN 'anbardar'
    ELSE 'rehber'  -- rehber, techizat, muhasib, baxis, NULL, or any unknown value
  END;
$function$;

CREATE OR REPLACE FUNCTION public.end_other_sessions(p_keep_device_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_n   INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;

  DELETE FROM public.sessions
   WHERE user_id = v_uid AND device_id IS DISTINCT FROM p_keep_device_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  IF v_n > 0 THEN
    INSERT INTO public.audit_log(ts, user_id, action, table_name, record_id,
                                 old_values, new_values, reason)
    VALUES (now(), v_uid, 'DELETE', 'sessions', COALESCE(p_keep_device_id, '—'),
            jsonb_build_object('ended_count', v_n), NULL,
            'Digər cihazlardakı sessiyalar bağlandı');
  END IF;

  RETURN jsonb_build_object('ended', v_n);
END;
$function$;

CREATE OR REPLACE FUNCTION public.end_session(p_device_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_n   INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;

  DELETE FROM public.sessions WHERE user_id = v_uid AND device_id = p_device_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  IF v_n > 0 THEN
    INSERT INTO public.audit_log(ts, user_id, action, table_name, record_id,
                                 old_values, new_values, reason)
    VALUES (now(), v_uid, 'DELETE', 'sessions', p_device_id,
            jsonb_build_object('device_id', p_device_id), NULL, 'Sessiya bağlandı');
  END IF;

  RETURN jsonb_build_object('ended', v_n);
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_anbardar_warehouse()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role = 'anbardar' THEN
    IF NEW.warehouse IS NULL OR TRIM(NEW.warehouse) = '' THEN
      RAISE EXCEPTION 'anbardar rolu üçün konkret anbar təyin edilməlidir';
    END IF;
    IF NEW.warehouse = 'Ofis' THEN
      RAISE EXCEPTION 'anbardar Ofisə təyin edilə bilməz';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.warehouses w
      WHERE w.name = NEW.warehouse AND w.type = 'anbar' AND w.active = TRUE
    ) THEN
      RAISE EXCEPTION 'Anbar tapılmadı və ya aktiv deyil: %', NEW.warehouse;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_reference_values()
 RETURNS TABLE(id uuid, kind text, name text, active boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.kind, r.name, r.active
  FROM public.reference_values r
  WHERE public.current_user_role() IS NOT NULL
    AND (r.active = TRUE OR public.current_user_role() = 'admin')
  ORDER BY r.kind, r.active DESC, r.name;
$function$;

CREATE OR REPLACE FUNCTION public.get_stock_layers(p_warehouse text, p_item_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_role TEXT; v_wh TEXT; v_active BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role:=public.current_user_role();
  IF v_role IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: aktiv istifadəçi tapılmadı'; END IF;
  v_wh:=NULLIF(btrim(COALESCE(p_warehouse,'')),'');
  IF v_wh IS NULL OR NULLIF(btrim(COALESCE(p_item_code,'')),'') IS NULL THEN
    RAISE EXCEPTION 'Anbar və mal kodu tələb olunur';
  END IF;
  IF v_role='anbardar' AND v_wh IS DISTINCT FROM public.current_user_warehouse() THEN
    RAISE EXCEPTION 'İcazə yoxdur: yalnız öz anbarınızın partiyalarını görə bilərsiniz';
  END IF;
  SELECT active INTO v_active FROM public.stock_layer_settings WHERE singleton=TRUE;
  IF NOT COALESCE(v_active,FALSE) THEN RAISE EXCEPTION 'Partiya uçotu aktiv deyil'; END IF;
  RETURN jsonb_build_object(
    'warehouse',v_wh,'code',p_item_code,
    'revision',public.stock_layer_revision(v_wh,p_item_code),
    'balance_qty',(SELECT COALESCE(SUM(in_qty-out_qty),0) FROM public.movements
                   WHERE warehouse=v_wh AND item_code=p_item_code),
    'layers',COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',l.id,'source_type',l.source_type,'source_movement_id',l.source_movement_id,
      'received_date',l.received_date,'source_doc_num',COALESCE(l.source_doc_num,''),
      'source_invoice_num',COALESCE(l.source_invoice_num,''),'price_status',l.price_status,
      'unit_price',l.unit_price,'available_qty',l.available_qty)
      ORDER BY l.received_date NULLS FIRST,l.created_at,l.id)
      FROM public.stock_layers l WHERE l.warehouse=v_wh AND l.item_code=p_item_code
        AND l.active AND l.available_qty>0),'[]'::jsonb));
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_transfer_destinations()
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı';
  END IF;
  v_role := public.current_user_role();
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'İcazə yoxdur: istifadəçi profili tapılmadı və ya aktiv deyil';
  END IF;
  IF v_role NOT IN ('admin', 'anbardar') THEN
    RAISE EXCEPTION 'İcazə yoxdur: "%" rolu yerdəyişmə təyinat siyahısına müraciət edə bilməz', v_role;
  END IF;
  RETURN ARRAY(
    SELECT name FROM public.warehouses
    WHERE active = TRUE AND type = 'anbar'
    ORDER BY name
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_directory()
 RETURNS TABLE(id uuid, email text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT u.id, u.email FROM public.users u WHERE u.active = TRUE;
$function$;

CREATE OR REPLACE FUNCTION public.guard_and_capture_stock_layer_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_active BOOLEAN; v_bypass BOOLEAN;
BEGIN
  SELECT active INTO v_active FROM public.stock_layer_settings WHERE singleton=TRUE;
  IF NOT COALESCE(v_active,FALSE) THEN RETURN NEW; END IF;
  v_bypass:=COALESCE(current_setting('anbar.stock_layers_write',TRUE),'')='on';
  IF v_bypass THEN RETURN NEW; END IF;
  IF COALESCE(NEW.out_qty,0)>0 THEN
    RAISE EXCEPTION 'Partiya seçimi tələb olunur — səhifəni yeniləyin və əməliyyatı yenidən daxil edin';
  END IF;
  IF COALESCE(NEW.in_qty,0)>0 THEN
    INSERT INTO public.stock_layers(warehouse,item_code,source_type,source_movement_id,root_movement_id,
      received_date,source_doc_num,source_invoice_num,price_status,unit_price,
      initial_qty,available_qty,created_by)
    VALUES(NEW.warehouse,NEW.item_code,
      CASE WHEN COALESCE(NEW.note,'') LIKE 'Ləğv:%' THEN 'legacy_adjustment' ELSE 'receipt' END,
      NEW.id,NEW.id,NEW.date,NULLIF(NEW.doc_num,''),NULLIF(NEW.invoice_num,''),
      CASE WHEN COALESCE(NEW.price,0)>0 THEN 'known' ELSE 'unknown' END,
      CASE WHEN COALESCE(NEW.price,0)>0 THEN NEW.price ELSE NULL END,
      NEW.in_qty,NEW.in_qty,NEW.created_by);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_item_category()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new TEXT;
  v_old TEXT;
BEGIN
  v_new := NULLIF(TRIM(COALESCE(NEW.category, '')), '');
  IF TG_OP = 'UPDATE' THEN
    v_old := NULLIF(TRIM(COALESCE(OLD.category, '')), '');
  ELSE
    v_old := NULL;
  END IF;

  -- Kateqoriya dəyişmirsə — heç nə etmə (mövcud item redaktəsini pozma)
  IF v_new IS NOT DISTINCT FROM v_old THEN
    RETURN NEW;
  END IF;

  -- 1) Rol yoxlaması — 007-dəki current_user_role() (aktivlik + legacy rol
  --    xəritələmə onun daxilindədir), ayrıca users sorğusu təkrarlanmır.
  IF auth.uid() IS NULL OR public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: kateqoriyanı yalnız aktiv Admin dəyişə bilər';
  END IF;

  -- 2) Dəyər yoxlaması — statik CHECK əvəzinə mərkəzi sorğuça.
  --    NULL və 'Təyin edilməyib' sistem dəyərləridir, həmişə icazəlidir.
  --    Gizlədilmiş (active=FALSE) kateqoriya qəbul edilmir — yalnız aktiv qiymərlər.
  IF v_new IS NOT NULL AND v_new <> 'Təyin edilməyib'
     AND NOT EXISTS (
       SELECT 1 FROM public.reference_values r
       WHERE r.kind = 'item_category' AND lower(r.name) = lower(v_new) AND r.active = TRUE
     ) THEN
    RAISE EXCEPTION 'Yanlış kateqoriya: "%" Sorğuçalarda mövcud deyil və ya gizlədilmişdir', v_new;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_item_unit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new TEXT;
  v_old TEXT;
BEGIN
  v_new := NULLIF(TRIM(COALESCE(NEW.unit, '')), '');
  IF TG_OP = 'UPDATE' THEN
    v_old := NULLIF(TRIM(COALESCE(OLD.unit, '')), '');
  ELSE
    v_old := NULL;
  END IF;

  IF v_new IS NOT DISTINCT FROM v_old THEN
    RETURN NEW;
  END IF;

  IF v_new IS NULL THEN
    RAISE EXCEPTION 'Ölçü vahidi tələb olunur';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.reference_values r
    WHERE r.kind = 'unit' AND lower(r.name) = lower(v_new) AND r.active = TRUE
  ) THEN
    RAISE EXCEPTION 'Yanlış ölçü vahidi: "%" Sorğuçalarda mövcud deyil və ya gizlədilmişdir', v_new;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_movement_labels()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pt        TEXT := nullif(trim(coalesce(NEW.partner, '')), '');
  v_ch        TEXT := nullif(trim(coalesce(NEW.channel, '')), '');
  v_transfer  BOOLEAN := (NEW.type = 'Yerdəyişmə');
  v_note      TEXT := coalesce(NEW.note, '');
  v_reversal  BOOLEAN := FALSE;
BEGIN
  -- (b) Ad dəyişmə ilə seriyalaş: kilidlər manage_reference() ilə EYNİ açar
  -- formatını işlədir. Kilidlər sabit sıra ilə (partner sonra channel) alınır —
  -- deadlock istisna edilir. manage_reference() hər çağırışda yalnız tək prefiks
  -- kilidlədiyi üçün dövr yaranmır.
  --
  -- ⚠ KİLİDLƏR v_reversal SÜBUTUNDAN ƏVVƏL alınır. Əks halda paralel
  -- manage_reference() ad dəyişməsi tarixi movements-i kaskad yeniləyə bilər,
  -- ancaq bu triqqerin sübut sorğusu köhnə (gizlədilmiş) etiketi hələ də oxuyar
  -- və köhnə etiketli ləğv sətrini buraxardı. Bütün kilidlər alındıqdan sonra sorğu
  -- kaskadın nəticəsini görür: köhnə etiket artıq uyğun gəlmir → rədd olunur,
  -- kaskad edilmiş cari etiket uyğun gəlir → keçir.
  -- Kilidlər öncə alınır, əks halda partner+channel qeyd-dəyişməsi arasında
  -- yarış pəncərəsi açılır.
  IF v_pt IS NOT NULL AND NOT v_transfer THEN
    PERFORM public.lock_reference_labels('ref:partner:', v_pt);
  END IF;
  IF v_ch IS NOT NULL THEN
    PERFORM public.lock_reference_labels('ref:channel:', v_ch);
  END IF;

  -- ---- F6 — ləğv əks yazısı üçün kryptoqrafik istisna ----
  -- Ləğv sənədinin reversalı marker + komplit uyğunlaq yolu ilə sübut olunur.
  -- Əgər marker deyir "bu SND-XXXX sənədinin ləğvi", triqqer orijinal hərəkət
  -- cədvəldə axtarır və bütün sahələri yoxlayır (tip, anbar, kod, miqdarlar,
  -- partner, kanal). Əgər uyğun gəlirsə, aktiv-lookup yoxlaması atlanır.
  -- Yoxsa markerli ədədi ləğvə rağmən səhv olur. Bunlar RPC dəyişdirmə tələb
  -- etmir — cəbində sistem markeri yazır; 007 kod tam saxlanılır.
  -- Sorğu kilidlərdən SONRA icra olunur (yuxarıdakı izaha bax).
  IF v_note LIKE 'Ləğv: %' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.movements o
      WHERE o.doc_num = substr(v_note, length('Ləğv: ') + 1)
        AND o.type = NEW.type AND o.warehouse = NEW.warehouse AND o.item_code = NEW.item_code
        AND coalesce(o.in_qty,0) = coalesce(NEW.out_qty,0)
        AND coalesce(o.out_qty,0) = coalesce(NEW.in_qty,0)
        AND lower(trim(coalesce(o.partner,''))) = lower(trim(coalesce(NEW.partner,'')))
        AND lower(trim(coalesce(o.channel,''))) = lower(trim(coalesce(NEW.channel,'')))
    ) INTO v_reversal;
  ELSIF v_note LIKE 'Ləğv ID: %' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.movements o
      WHERE o.id::text = substr(v_note, length('Ləğv ID: ') + 1)
        AND o.type = NEW.type AND o.warehouse = NEW.warehouse AND o.item_code = NEW.item_code
        AND coalesce(o.in_qty,0) = coalesce(NEW.out_qty,0)
        AND coalesce(o.out_qty,0) = coalesce(NEW.in_qty,0)
        AND lower(trim(coalesce(o.partner,''))) = lower(trim(coalesce(NEW.partner,'')))
        AND lower(trim(coalesce(o.channel,''))) = lower(trim(coalesce(NEW.channel,'')))
    ) INTO v_reversal;
  ELSIF v_note LIKE 'Ləğv (əks yerdəyişmə): %' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.movements o
      WHERE o.doc_num = substr(v_note, length('Ləğv (əks yerdəyişmə): ') + 1)
        AND o.type = 'Yerdəyişmə' AND o.warehouse = NEW.warehouse AND o.item_code = NEW.item_code
        AND coalesce(o.in_qty,0) = coalesce(NEW.out_qty,0)
        AND coalesce(o.out_qty,0) = coalesce(NEW.in_qty,0)
        AND lower(trim(coalesce(o.channel,''))) = lower(trim(coalesce(NEW.channel,'')))
    ) INTO v_reversal;
  ELSIF v_note LIKE 'Ləğv (əks yerdəyişmə) ID: %' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.movements o
      WHERE (o.id::text = split_part(substr(v_note, length('Ləğv (əks yerdəyişmə) ID: ') + 1), ':', 1)
          OR o.id::text = split_part(substr(v_note, length('Ləğv (əks yerdəyişmə) ID: ') + 1), ':', 2))
        AND o.type = 'Yerdəyişmə' AND o.warehouse = NEW.warehouse AND o.item_code = NEW.item_code
        AND coalesce(o.in_qty,0) = coalesce(NEW.out_qty,0)
        AND coalesce(o.out_qty,0) = coalesce(NEW.in_qty,0)
    ) INTO v_reversal;
  END IF;

  -- Əks yazı: tarixi mətn olduğu kimi keçirilir, aktivlik yoxlanmır.
  IF v_reversal THEN
    RETURN NEW;
  END IF;

  -- (a) Aktiv sorğuça ilə doğrula.
  IF v_ch IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.reference_values r
    WHERE r.kind = 'purchase_channel'
      AND lower(r.name) = lower(v_ch) AND r.active = TRUE
  ) THEN
    RAISE EXCEPTION 'Yanlış alış kanalı: "%" Sorğuçalarda aktiv deyil — səhifəni yeniləyin', v_ch;
  END IF;

  IF v_pt IS NOT NULL AND NOT v_transfer AND v_pt <> 'Sahə üzrə məsul şəxs' THEN
    IF NOT EXISTS (
          SELECT 1 FROM public.partners p
          WHERE lower(trim(p.name)) = lower(v_pt) AND p.active = TRUE
        )
       AND NOT EXISTS (
          SELECT 1 FROM public.warehouses w
          WHERE lower(trim(w.name)) = lower(v_pt) AND w.active = TRUE
        ) THEN
      RAISE EXCEPTION 'Yanlış kontragent/ünvan: "%" Sorğuçalarda aktiv deyil — səhifəni yeniləyin', v_pt;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.users (id, email, name, role, warehouse, active)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
          coalesce(new.raw_user_meta_data->>'role', 'baxis'),
          new.raw_user_meta_data->>'warehouse', true)
  on conflict (id) do nothing;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.icare_exposure(p_warehouse text, p_item_code text, p_out_qty numeric)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT GREATEST(
           COALESCE(p_out_qty, 0)
           - GREATEST(
               (SELECT COALESCE(SUM(in_qty - out_qty), 0) FROM public.movements
                 WHERE warehouse = p_warehouse AND item_code = p_item_code)
               - (SELECT COALESCE(icare_qty, 0) FROM public.stock_conditions
                   WHERE warehouse = p_warehouse AND item_code = p_item_code),
               0),
           0);
$function$;

CREATE OR REPLACE FUNCTION public.import_new_items(p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lock_key   BIGINT := 424242;   -- nomenklatura kod ayırması üçün sabit açar
  v_next_code  BIGINT;
  v_item       JSONB;
  v_name       TEXT;
  v_unit       TEXT;
  v_norm       TEXT;
  v_code       TEXT;
  v_role       TEXT;
  v_created    JSONB := '[]'::JSONB;
  v_skipped    JSONB := '[]'::JSONB;
BEGIN
  -- ---- Avtorizasiya: 007 rol modeli, YALNIZ aktiv Admin --------------------
  -- current_user_role() aktivliyi və legacy rol xəritələməsini özü həll edir,
  -- ona görə users cədvəlinə ayrıca sorğu yoxdur.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı';
  END IF;
  v_role := public.current_user_role();
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'İcazə yoxdur: istifadəçi profili tapılmadı və ya aktiv deyil';
  END IF;
  IF v_role <> 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: nomenklaturaya yeni mal yalnız aktiv Admin əlavə edə bilər (cari rol: %). Anbardar üçün: Nomenklatura sorğusu yaradın.', v_role;
  END IF;

  -- ---- Giriş yoxlanışı (001-dən dəyişməyib) --------------------------------
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items massiv (JSON array) olmalıdır';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('created', v_created, 'skipped', v_skipped,
                              'created_count', 0, 'skipped_count', 0);
  END IF;

  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT COALESCE(MAX(code::BIGINT), 0) + 1
    INTO v_next_code
    FROM items
   WHERE code ~ '^[0-9]{1,7}$';

  FOR v_item IN SELECT jsonb_array_elements(p_items) LOOP
    v_name := TRIM(COALESCE(v_item->>'name', ''));
    v_unit := NULLIF(TRIM(COALESCE(v_item->>'unit', '')), '');
    IF v_unit IS NULL THEN v_unit := 'ədəd'; END IF;

    IF char_length(v_name) < 3 THEN
      RAISE EXCEPTION 'Yanlış sətir: ad boşdur və ya 3 simvoldan qısadır ("%") — paket ləğv edildi', v_name;
    END IF;

    v_norm := nom_norm(v_name);

    IF EXISTS (SELECT 1 FROM items WHERE nom_norm(name) = v_norm) THEN
      v_skipped := v_skipped || jsonb_build_object('name', v_name, 'unit', v_unit,
                    'reason', 'Bazada dəqiq uyğunluq mövcuddur');
      CONTINUE;
    END IF;

    IF v_next_code > 9999999 THEN
      RAISE EXCEPTION '7 rəqəmli kod diapazonu doldu (>9999999) — paket ləğv edildi';
    END IF;

    v_code := LPAD(v_next_code::TEXT, 7, '0');
    INSERT INTO items (code, name, unit, price)
    VALUES (v_code, v_name, v_unit, 0);

    v_created := v_created || jsonb_build_object('code', v_code, 'name', v_name, 'unit', v_unit);
    v_next_code := v_next_code + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'created', v_created,
    'skipped', v_skipped,
    'created_count', jsonb_array_length(v_created),
    'skipped_count', jsonb_array_length(v_skipped)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.current_user_role() = 'admin';
$function$;

CREATE OR REPLACE FUNCTION public.is_anbardar()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.current_user_role() = 'anbardar';
$function$;

CREATE OR REPLACE FUNCTION public.is_rehber()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.current_user_role() = 'rehber';
$function$;

CREATE OR REPLACE FUNCTION public.item_request_candidates(p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_norm  TEXT;
  v_items JSONB;
  v_reqs  JSONB;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  IF public.current_user_role() IS NULL THEN
    RAISE EXCEPTION 'İcazə yoxdur: istifadəçi profili tapılmadı və ya aktiv deyil';
  END IF;

  v_norm := public.item_request_norm(p_name);
  IF length(v_norm) = 0 THEN
    RETURN jsonb_build_object('norm', '', 'items', '[]'::JSONB, 'requests', '[]'::JSONB);
  END IF;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'match', x->>'name'), '[]'::JSONB) INTO v_items
  FROM (
    SELECT jsonb_build_object(
             'code', i.code, 'name', i.name, 'unit', i.unit,
             'match', CASE WHEN public.item_request_norm(i.name) = v_norm THEN 'exact' ELSE 'similar' END) AS x
    FROM public.items i
    WHERE public.item_request_norm(i.name) = v_norm
       OR (length(v_norm) >= 4 AND position(v_norm IN public.item_request_norm(i.name)) > 0)
       OR (length(public.item_request_norm(i.name)) >= 4
           AND position(public.item_request_norm(i.name) IN v_norm) > 0)
    LIMIT 10
  ) s;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'match', x->>'name'), '[]'::JSONB) INTO v_reqs
  FROM (
    SELECT jsonb_build_object(
             'id', r.id, 'name', r.name, 'unit', r.unit, 'status', r.status,
             'warehouse', r.created_warehouse, 'created_at', r.created_at,
             'match', CASE WHEN r.name_norm = v_norm THEN 'exact' ELSE 'similar' END) AS x
    FROM public.item_requests r
    WHERE r.status = 'pending'
      AND (r.name_norm = v_norm
           OR (length(v_norm) >= 4 AND position(v_norm IN r.name_norm) > 0)
           OR (length(r.name_norm) >= 4 AND position(r.name_norm IN v_norm) > 0))
    LIMIT 10
  ) s;

  RETURN jsonb_build_object('norm', v_norm, 'items', v_items, 'requests', v_reqs);
END;
$function$;

CREATE OR REPLACE FUNCTION public.item_request_norm(p_name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT public.nom_norm(btrim(normalize(COALESCE(p_name, ''), NFKC)));
$function$;

CREATE OR REPLACE FUNCTION public.legacy_transfer_strip_suffix(p_partner text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT TRIM(REGEXP_REPLACE(COALESCE(p_partner, ''), '\s+anbar(ına|ı)?$', '', 'i'));
$function$;

CREATE OR REPLACE FUNCTION public.list_my_sessions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid  UUID := auth.uid();
  v_role TEXT;
  v_list JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role := public.current_user_role();

  DELETE FROM public.sessions
   WHERE user_id = v_uid AND updated_at < public.session_stale_cutoff();

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'device_id', device_id, 'label', device_label,
           'since', created_at, 'last_seen', updated_at) ORDER BY updated_at DESC), '[]'::JSONB)
    INTO v_list FROM public.sessions WHERE user_id = v_uid;

  RETURN jsonb_build_object('limit', public.session_device_limit(v_role),
                            'devices', v_list);
END;
$function$;

CREATE OR REPLACE FUNCTION public.lock_reference_labels(p_prefix text, VARIADIC p_names text[])
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT p_prefix || lower(trim(n)) AS k
    FROM unnest(p_names) AS n
    WHERE nullif(trim(coalesce(n, '')), '') IS NOT NULL
    ORDER BY 1
  LOOP
    PERFORM pg_advisory_xact_lock(hashtext(r.k));
  END LOOP;
END $function$;

CREATE OR REPLACE FUNCTION public.log_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if tg_op = 'INSERT' then
    insert into audit_log (user_id, action, table_name, record_id, new_values)
    values (auth.uid(), 'INSERT', tg_table_name, new.id::text, to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    insert into audit_log (user_id, action, table_name, record_id, old_values, new_values)
    values (auth.uid(), 'UPDATE', tg_table_name, new.id::text, to_jsonb(old), to_jsonb(new));
  else
    insert into audit_log (user_id, action, table_name, record_id, old_values)
    values (auth.uid(), 'DELETE', tg_table_name, old.id::text, to_jsonb(old));
  end if;
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.log_icare_exposure(p_warehouse text, p_item_code text, p_out_qty numeric, p_type text, p_doc_num text, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_exp NUMERIC;
BEGIN
  IF COALESCE(p_out_qty, 0) <= 0 THEN RETURN; END IF;
  v_exp := public.icare_exposure(p_warehouse, p_item_code, p_out_qty);
  IF COALESCE(v_exp, 0) <= 0 THEN RETURN; END IF;

  INSERT INTO public.audit_log(ts, user_id, action, table_name, record_id,
                               old_values, new_values, reason)
  VALUES (now(), auth.uid(), 'UPDATE', 'movements',
          COALESCE(p_doc_num, '—') || '|' || p_warehouse || '|' || p_item_code,
          NULL,
          jsonb_build_object('warehouse', p_warehouse, 'item_code', p_item_code,
                             'type', p_type, 'out_qty', p_out_qty,
                             'from_icare', v_exp, 'doc_num', p_doc_num),
          'İcarədə olan maldan məxaric: ' || COALESCE(NULLIF(btrim(p_note), ''), 'səbəb göstərilməyib'));
EXCEPTION WHEN OTHERS THEN
  -- A descriptive audit note must never abort a movement document.
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.manage_reference_uuid_internal(p_kind text, p_action text, p_id uuid DEFAULT NULL::uuid, p_name text DEFAULT NULL::text, p_meta jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_name     TEXT := nullif(trim(coalesce(p_name, '')), '');
  v_old      TEXT;
  v_type     TEXT;
  v_used     BOOLEAN;
  v_id       UUID;
  v_refkind  TEXT;
  v_cascade  INT := 0;
  v_audit    BOOLEAN := FALSE;
  v_table    TEXT;
  v_old_json JSONB;
  v_new_json JSONB;
  v_linked   TEXT;
BEGIN
  -- --- authorisation ------------------------------------------------------
  IF auth.uid() IS NULL OR public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: Sorğuçaları yalnız Admin idarə edir';
  END IF;
  IF p_kind NOT IN ('channel','partner','warehouse','location','unit','category','project','serfiyyat_channel') THEN
    RAISE EXCEPTION 'Etibarsız sorğuça növü';
  END IF;
  IF p_action NOT IN ('create','update','deactivate','activate','delete') THEN
    RAISE EXCEPTION 'Etibarsız əməliyyat';
  END IF;
  IF p_action IN ('create','update') AND v_name IS NULL THEN
    RAISE EXCEPTION 'Ad tələb olunur';
  END IF;
  IF p_action IN ('create','update') AND length(v_name) < 2 THEN
    RAISE EXCEPTION 'Ad ən azı 2 simvol olmalıdır';
  END IF;
  IF p_action <> 'create' AND p_id IS NULL THEN
    RAISE EXCEPTION 'Sorğuça seçilməyib';
  END IF;

  -- =========================================================================
  -- YENİ: Layihələr (Sərfiyyat Materialları üçün, anbarlardan müstəqil)
  -- =========================================================================
  IF p_kind = 'project' THEN
    v_table := 'serfiyyat_projects';
    v_audit := TRUE;
    v_linked := nullif(trim(coalesce(p_meta->>'linked_warehouse', '')), '');

    IF v_linked IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.warehouses w WHERE w.name = v_linked AND w.type = 'anbar' AND w.active = TRUE
    ) THEN
      RAISE EXCEPTION 'Bağlı anbar tapılmadı və ya aktiv deyil: %', v_linked;
    END IF;

    IF p_action = 'create' THEN
      INSERT INTO public.serfiyyat_projects(name, linked_warehouse)
      VALUES (v_name, v_linked) RETURNING id INTO v_id;
      v_new_json := jsonb_build_object('name', v_name, 'linked_warehouse', v_linked);

    ELSE
      SELECT id, name INTO v_id, v_old FROM public.serfiyyat_projects WHERE id = p_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Layihə tapılmadı'; END IF;
      v_old_json := jsonb_build_object('name', v_old);

      IF p_action = 'update' THEN
        UPDATE public.serfiyyat_projects
        SET name = v_name, linked_warehouse = v_linked, updated_at = now()
        WHERE id = v_id;
        v_new_json := jsonb_build_object('name', v_name, 'linked_warehouse', v_linked);
        -- Layihə adı sənədlərdə mətn kimi TƏKRARLANMIR (serfiyyat_documents
        -- yalnız project_id saxlayır), ona görə kaskad yeniləmə lazım deyil —
        -- ad dəyişikliyi bütün keçmiş sənədlərdə avtomatik əks olunur.

      ELSIF p_action = 'deactivate' THEN
        UPDATE public.serfiyyat_projects SET active = FALSE, updated_at = now() WHERE id = v_id;
        v_new_json := jsonb_build_object('name', v_old, 'active', FALSE);

      ELSIF p_action = 'activate' THEN
        UPDATE public.serfiyyat_projects SET active = TRUE, updated_at = now() WHERE id = v_id;
        v_new_json := jsonb_build_object('name', v_old, 'active', TRUE);

      ELSE -- delete
        v_used := EXISTS (SELECT 1 FROM public.serfiyyat_documents WHERE project_id = v_id);
        IF v_used THEN
          RAISE EXCEPTION 'Layihə sənədlərdə istifadə olunub: silinmir, yalnız gizlədilə bilər';
        END IF;
        DELETE FROM public.serfiyyat_projects WHERE id = v_id;
        v_new_json := NULL;
      END IF;
    END IF;

  -- =========================================================================
  -- YENİ: Sərfiyyat Materialları üçün Alınma kanalı (Köçürmə/Nağd) — reference_values
  -- =========================================================================
  ELSIF p_kind = 'serfiyyat_channel' THEN
    v_refkind := 'serfiyyat_channel';
    v_table := 'reference_values';
    v_audit := TRUE;

    IF p_action = 'create' THEN
      INSERT INTO public.reference_values(kind, name)
      VALUES (v_refkind, v_name) RETURNING id INTO v_id;
      v_new_json := jsonb_build_object('kind', v_refkind, 'name', v_name, 'active', TRUE);
    ELSE
      SELECT id, name INTO v_id, v_old
      FROM public.reference_values WHERE id = p_id AND kind = v_refkind FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Sorğuça tapılmadı'; END IF;
      v_old_json := jsonb_build_object('kind', v_refkind, 'name', v_old);

      IF p_action = 'update' THEN
        UPDATE public.reference_values SET name = v_name, updated_at = now() WHERE id = v_id;
        IF v_old IS DISTINCT FROM v_name THEN
          PERFORM public.lock_reference_labels('ref:serfiyyat_channel:', v_old, v_name);
          UPDATE public.serfiyyat_documents SET alinma_kanali = v_name
          WHERE lower(trim(coalesce(alinma_kanali, ''))) = lower(trim(v_old));
          GET DIAGNOSTICS v_cascade = ROW_COUNT;
        END IF;
        v_new_json := jsonb_build_object('kind', v_refkind, 'name', v_name, 'cascaded_rows', v_cascade);
      ELSIF p_action = 'deactivate' THEN
        UPDATE public.reference_values SET active = FALSE, updated_at = now() WHERE id = v_id;
        v_new_json := jsonb_build_object('kind', v_refkind, 'name', v_old, 'active', FALSE);
      ELSIF p_action = 'activate' THEN
        UPDATE public.reference_values SET active = TRUE, updated_at = now() WHERE id = v_id;
        v_new_json := jsonb_build_object('kind', v_refkind, 'name', v_old, 'active', TRUE);
      ELSE -- delete
        v_used := EXISTS (SELECT 1 FROM public.serfiyyat_documents
                          WHERE lower(trim(coalesce(alinma_kanali, ''))) = lower(trim(v_old)));
        IF v_used THEN
          RAISE EXCEPTION 'Dəyər istifadə olunub: silinmir, yalnız gizlədilə bilər';
        END IF;
        DELETE FROM public.reference_values WHERE id = v_id;
        v_new_json := NULL;
      END IF;
    END IF;

  -- =========================================================================
  -- MÖVCUD BUDAQLAR (dəyişməz) — channel/unit/category, partner, warehouse/location
  -- =========================================================================
  ELSIF p_kind IN ('channel','unit','category') THEN
    v_refkind := CASE p_kind WHEN 'channel' THEN 'purchase_channel'
                             WHEN 'unit'    THEN 'unit'
                             ELSE 'item_category' END;
    v_table := 'reference_values';
    v_audit := TRUE;

    IF p_action = 'create' THEN
      INSERT INTO public.reference_values(kind, name)
      VALUES (v_refkind, v_name) RETURNING id INTO v_id;
      v_new_json := jsonb_build_object('kind', v_refkind, 'name', v_name, 'active', TRUE);

    ELSE
      SELECT id, name INTO v_id, v_old
      FROM public.reference_values WHERE id = p_id AND kind = v_refkind FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Sorğuça tapılmadı'; END IF;
      v_old_json := jsonb_build_object('kind', v_refkind, 'name', v_old);

      IF p_action = 'update' THEN
        UPDATE public.reference_values SET name = v_name, updated_at = now() WHERE id = v_id;
        IF p_kind = 'channel' AND v_old IS DISTINCT FROM v_name THEN
          PERFORM public.lock_reference_labels('ref:channel:', v_old, v_name);
          UPDATE public.movements SET channel = v_name
          WHERE lower(trim(coalesce(channel, ''))) = lower(trim(v_old));
          GET DIAGNOSTICS v_cascade = ROW_COUNT;
        ELSIF p_kind = 'unit' AND v_old IS DISTINCT FROM v_name THEN
          UPDATE public.items SET unit = v_name
          WHERE lower(trim(coalesce(unit, ''))) = lower(trim(v_old));
          GET DIAGNOSTICS v_cascade = ROW_COUNT;
        ELSIF p_kind = 'category' AND v_old IS DISTINCT FROM v_name THEN
          UPDATE public.items SET category = v_name
          WHERE lower(trim(coalesce(category, ''))) = lower(trim(v_old));
          GET DIAGNOSTICS v_cascade = ROW_COUNT;
        END IF;
        v_new_json := jsonb_build_object('kind', v_refkind, 'name', v_name, 'cascaded_rows', v_cascade);

      ELSIF p_action = 'deactivate' THEN
        UPDATE public.reference_values SET active = FALSE, updated_at = now() WHERE id = v_id;
        v_new_json := jsonb_build_object('kind', v_refkind, 'name', v_old, 'active', FALSE);

      ELSIF p_action = 'activate' THEN
        UPDATE public.reference_values SET active = TRUE, updated_at = now() WHERE id = v_id;
        v_new_json := jsonb_build_object('kind', v_refkind, 'name', v_old, 'active', TRUE);

      ELSE  -- delete
        IF p_kind = 'channel' THEN
          v_used := EXISTS (SELECT 1 FROM public.movements
                            WHERE lower(trim(coalesce(channel, ''))) = lower(trim(v_old)));
        ELSIF p_kind = 'unit' THEN
          v_used := EXISTS (SELECT 1 FROM public.items
                            WHERE lower(trim(coalesce(unit, ''))) = lower(trim(v_old)));
        ELSE
          v_used := EXISTS (SELECT 1 FROM public.items
                            WHERE lower(trim(coalesce(category, ''))) = lower(trim(v_old)));
        END IF;
        IF v_used THEN
          RAISE EXCEPTION 'Dəyər istifadə olunub: silinmir, yalnız gizlədilə bilər';
        END IF;
        DELETE FROM public.reference_values WHERE id = v_id;
        v_new_json := NULL;
      END IF;
    END IF;

  ELSIF p_kind = 'partner' THEN
    IF p_action = 'create' THEN
      IF EXISTS (SELECT 1 FROM public.warehouses w WHERE lower(trim(w.name)) = lower(trim(v_name))) THEN
        RAISE EXCEPTION 'Kontragent adı anbar adı ilə eyni ola bilməz';
      END IF;
      INSERT INTO public.partners(name, voen, contract, contract_date, active, created_by)
      VALUES (v_name,
              coalesce(p_meta->>'voen',''),
              coalesce(p_meta->>'contract',''),
              nullif(p_meta->>'contract_date','')::date,
              TRUE, auth.uid())
      RETURNING id INTO v_id;

    ELSE
      SELECT id, name INTO v_id, v_old FROM public.partners WHERE id = p_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Kontragent tapılmadı'; END IF;

      IF p_action = 'update' THEN
        IF EXISTS (SELECT 1 FROM public.warehouses w WHERE lower(trim(w.name)) = lower(trim(v_name))) THEN
          RAISE EXCEPTION 'Kontragent adı anbar adı ilə eyni ola bilməz';
        END IF;
        UPDATE public.partners
        SET name = v_name,
            voen = coalesce(p_meta->>'voen',''),
            contract = coalesce(p_meta->>'contract',''),
            contract_date = nullif(p_meta->>'contract_date','')::date
        WHERE id = v_id;
        IF v_old IS DISTINCT FROM v_name THEN
          PERFORM public.lock_reference_labels('ref:partner:', v_old, v_name);
          UPDATE public.movements SET partner = v_name
          WHERE lower(trim(coalesce(partner, ''))) = lower(trim(v_old));
          GET DIAGNOSTICS v_cascade = ROW_COUNT;
        END IF;

      ELSIF p_action = 'deactivate' THEN
        UPDATE public.partners SET active = FALSE WHERE id = v_id;
      ELSIF p_action = 'activate' THEN
        UPDATE public.partners SET active = TRUE WHERE id = v_id;
      ELSE
        IF EXISTS (SELECT 1 FROM public.movements
                   WHERE lower(trim(coalesce(partner, ''))) = lower(trim(v_old))) THEN
          RAISE EXCEPTION 'Kontragent əməliyyatlarda istifadə olunub: silinmir, yalnız gizlədilə bilər';
        END IF;
        DELETE FROM public.partners WHERE id = v_id;
      END IF;
    END IF;

  ELSE -- warehouse | location (mövcud, dəyişməz)
    v_type := CASE WHEN p_kind = 'warehouse' THEN 'anbar' ELSE 'layihə' END;
    v_table := 'warehouses';
    v_audit := TRUE;

    IF p_action = 'create' THEN
      IF EXISTS (SELECT 1 FROM public.partners pt WHERE lower(trim(pt.name)) = lower(trim(v_name))) THEN
        RAISE EXCEPTION 'Bu ad artıq kontragent kimi mövcuddur';
      END IF;
      INSERT INTO public.warehouses(name, type, active)
      VALUES (v_name, v_type, TRUE) RETURNING id INTO v_id;
      v_new_json := jsonb_build_object('name', v_name, 'type', v_type, 'active', TRUE);

    ELSE
      SELECT id, name INTO v_id, v_old
      FROM public.warehouses WHERE id = p_id AND type = v_type FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Sorğuça tapılmadı'; END IF;
      v_old_json := jsonb_build_object('name', v_old, 'type', v_type);

      v_used := EXISTS (SELECT 1 FROM public.movements
                        WHERE lower(trim(coalesce(warehouse, ''))) = lower(trim(v_old))
                           OR lower(trim(coalesce(partner, ''))) = lower(trim(v_old)))
             OR EXISTS (SELECT 1 FROM public.users
                        WHERE lower(trim(coalesce(warehouse, ''))) = lower(trim(v_old)));

      IF p_action = 'update' THEN
        IF v_used THEN
          RAISE EXCEPTION 'İstifadə olunmuş anbar/ünvanın adı dəyişdirilmir. Siyahılardan çıxarmaq üçün "Gizlət" istifadə edin.';
        END IF;
        UPDATE public.warehouses SET name = v_name WHERE id = v_id;
        v_new_json := jsonb_build_object('name', v_name, 'type', v_type);

      ELSIF p_action = 'deactivate' THEN
        IF p_kind = 'warehouse' AND EXISTS (
          SELECT 1 FROM public.movements m
          WHERE lower(trim(coalesce(m.warehouse, ''))) = lower(trim(v_old))
          GROUP BY m.item_code
          HAVING abs(sum(coalesce(m.in_qty,0) - coalesce(m.out_qty,0))) > 0.000001
        ) THEN
          RAISE EXCEPTION 'Anbarda sıfırdan fərqli qalıq var: əvvəlcə malı köçürün';
        END IF;
        IF EXISTS (SELECT 1 FROM public.users
                   WHERE lower(trim(coalesce(warehouse, ''))) = lower(trim(v_old)) AND active = TRUE) THEN
          RAISE EXCEPTION 'Anbara aktiv anbardar təyin olunub';
        END IF;
        UPDATE public.warehouses SET active = FALSE WHERE id = v_id;
        v_new_json := jsonb_build_object('name', v_old, 'type', v_type, 'active', FALSE);

      ELSIF p_action = 'activate' THEN
        UPDATE public.warehouses SET active = TRUE WHERE id = v_id;
        v_new_json := jsonb_build_object('name', v_old, 'type', v_type, 'active', TRUE);

      ELSE  -- delete
        IF v_used THEN
          RAISE EXCEPTION 'İstifadə olunmuş anbar/ünvan silinmir: "Gizlət" istifadə edin';
        END IF;
        DELETE FROM public.warehouses WHERE id = v_id;
        v_new_json := NULL;
      END IF;
    END IF;
  END IF;

  IF v_audit THEN
    INSERT INTO public.audit_log(ts, user_id, action, table_name, record_id, old_values, new_values, reason)
    VALUES (now(), auth.uid(),
            CASE p_action WHEN 'create' THEN 'INSERT' WHEN 'delete' THEN 'DELETE' ELSE 'UPDATE' END,
            v_table, v_id, v_old_json, v_new_json,
            'Sorğuçalar: ' || p_kind || '/' || p_action);
  END IF;

  RETURN jsonb_build_object('ok', TRUE, 'kind', p_kind, 'action', p_action,
                            'id', v_id, 'cascaded_rows', v_cascade);
END;
$function$;

CREATE OR REPLACE FUNCTION public.manage_reference(p_kind text, p_action text, p_id text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_meta jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_name      TEXT := nullif(trim(coalesce(p_name, '')), '');
  v_old       TEXT;
  v_type      TEXT;
  v_used      BOOLEAN;
  v_wh_id     INTEGER;
  v_new_json  JSONB;
  v_old_json  JSONB;
BEGIN
  -- UUID-backed directories retain their existing, audited implementation.
  IF p_kind NOT IN ('warehouse','location') THEN
    RETURN public.manage_reference_uuid_internal(
      p_kind, p_action,
      CASE WHEN p_id IS NULL THEN NULL ELSE p_id::UUID END,
      p_name, p_meta
    );
  END IF;

  IF auth.uid() IS NULL OR public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: Sorğuçaları yalnız Admin idarə edir';
  END IF;
  IF p_action NOT IN ('create','update','deactivate','activate','delete') THEN
    RAISE EXCEPTION 'Etibarsız əməliyyat';
  END IF;
  IF p_action IN ('create','update') AND v_name IS NULL THEN
    RAISE EXCEPTION 'Ad tələb olunur';
  END IF;
  IF p_action IN ('create','update') AND length(v_name) < 2 THEN
    RAISE EXCEPTION 'Ad ən azı 2 simvol olmalıdır';
  END IF;
  IF p_action <> 'create' AND p_id IS NULL THEN
    RAISE EXCEPTION 'Sorğuça seçilməyib';
  END IF;

  v_type := CASE WHEN p_kind = 'warehouse' THEN 'anbar' ELSE 'layihə' END;

  IF p_action <> 'create' THEN
    IF p_id !~ '^[0-9]+$' OR length(p_id) > 10
       OR p_id::NUMERIC > 2147483647 THEN
      RAISE EXCEPTION 'Etibarsız anbar identifikatoru';
    END IF;
    v_wh_id := p_id::INTEGER;
  END IF;

  IF p_action = 'create' THEN
    IF EXISTS (
      SELECT 1 FROM public.partners pt
      WHERE lower(trim(pt.name)) = lower(trim(v_name))
    ) THEN
      RAISE EXCEPTION 'Bu ad artıq kontragent kimi mövcuddur';
    END IF;
    INSERT INTO public.warehouses(name, type, active)
    VALUES (v_name, v_type, TRUE)
    RETURNING id INTO v_wh_id;
    v_new_json := jsonb_build_object('name', v_name, 'type', v_type, 'active', TRUE);
  ELSE
    SELECT id, name INTO v_wh_id, v_old
    FROM public.warehouses
    WHERE id = v_wh_id AND type = v_type
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Sorğuça tapılmadı'; END IF;

    v_old_json := jsonb_build_object('name', v_old, 'type', v_type);
    v_used := EXISTS (
      SELECT 1 FROM public.movements
      WHERE lower(trim(coalesce(warehouse, ''))) = lower(trim(v_old))
         OR lower(trim(coalesce(partner, ''))) = lower(trim(v_old))
    ) OR EXISTS (
      SELECT 1 FROM public.users
      WHERE lower(trim(coalesce(warehouse, ''))) = lower(trim(v_old))
    );

    IF p_action = 'update' THEN
      IF v_used THEN
        RAISE EXCEPTION 'İstifadə olunmuş anbar/ünvanın adı dəyişdirilmir. Siyahılardan çıxarmaq üçün "Gizlət" istifadə edin.';
      END IF;
      UPDATE public.warehouses SET name = v_name WHERE id = v_wh_id;
      v_new_json := jsonb_build_object('name', v_name, 'type', v_type);

    ELSIF p_action = 'deactivate' THEN
      IF p_kind = 'warehouse' AND EXISTS (
        SELECT 1 FROM public.movements m
        WHERE lower(trim(coalesce(m.warehouse, ''))) = lower(trim(v_old))
        GROUP BY m.item_code
        HAVING abs(sum(coalesce(m.in_qty,0) - coalesce(m.out_qty,0))) > 0.000001
      ) THEN
        RAISE EXCEPTION 'Anbarda sıfırdan fərqli qalıq var: əvvəlcə malı köçürün';
      END IF;
      IF EXISTS (
        SELECT 1 FROM public.users
        WHERE lower(trim(coalesce(warehouse, ''))) = lower(trim(v_old)) AND active = TRUE
      ) THEN
        RAISE EXCEPTION 'Anbara aktiv anbardar təyin olunub';
      END IF;
      UPDATE public.warehouses SET active = FALSE WHERE id = v_wh_id;
      v_new_json := jsonb_build_object('name', v_old, 'type', v_type, 'active', FALSE);

    ELSIF p_action = 'activate' THEN
      UPDATE public.warehouses SET active = TRUE WHERE id = v_wh_id;
      v_new_json := jsonb_build_object('name', v_old, 'type', v_type, 'active', TRUE);

    ELSE
      IF v_used THEN
        RAISE EXCEPTION 'İstifadə olunmuş anbar/ünvan silinmir: "Gizlət" istifadə edin';
      END IF;
      DELETE FROM public.warehouses WHERE id = v_wh_id;
      v_new_json := NULL;
    END IF;
  END IF;

  INSERT INTO public.audit_log(ts, user_id, action, table_name, record_id, old_values, new_values, reason)
  VALUES (
    now(), auth.uid(),
    CASE p_action WHEN 'create' THEN 'INSERT' WHEN 'delete' THEN 'DELETE' ELSE 'UPDATE' END,
    'warehouses', v_wh_id::TEXT, v_old_json, v_new_json,
    'Sorğuçalar: ' || p_kind || '/' || p_action
  );

  RETURN jsonb_build_object('ok', TRUE, 'kind', p_kind, 'action', p_action,
                            'id', v_wh_id, 'cascaded_rows', 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.movement_split_supported()
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$ SELECT TRUE $function$;

CREATE OR REPLACE FUNCTION public.my_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select role from public.users where id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.my_warehouse()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select warehouse from public.users where id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.next_serfiyyat_doc_num()
 RETURNS text
 LANGUAGE sql
AS $function$
  SELECT 'SM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.serfiyyat_doc_seq')::text, 6, '0');
$function$;

CREATE OR REPLACE FUNCTION public.nom_norm(p_name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT LOWER(
    REGEXP_REPLACE(COALESCE(p_name, ''), '[[:space:]/.,"''`’()\-–—]+', '', 'g')
  );
$function$;

CREATE OR REPLACE FUNCTION public.post_layer_movement_document(p_lines jsonb, p_request_key uuid, p_doc_num text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT; v_payload JSONB; v_hash TEXT; v_existing public.stock_layer_requests%ROWTYPE;
  v_line JSONB; v_alloc JSONB; v_ln INT:=0; v_qty NUMERIC; v_sum NUMERIC;
  v_known NUMERIC; v_unknown NUMERIC; v_source NUMERIC; v_final NUMERIC;
  v_method TEXT; v_reason TEXT; v_price NUMERIC; v_base JSONB:='[]'::jsonb;
  v_result JSONB; v_row JSONB; v_movement UUID; r RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role:=public.current_user_role();
  IF v_role NOT IN ('admin','anbardar') THEN RAISE EXCEPTION 'Mal çıxışına icazəniz yoxdur'; END IF;
  IF p_request_key IS NULL THEN RAISE EXCEPTION 'Təkrar sorğu açarı tələb olunur'; END IF;
  IF p_lines IS NULL OR jsonb_typeof(p_lines)<>'array' OR jsonb_array_length(p_lines)=0 THEN
    RAISE EXCEPTION 'Sənəd sətirləri boşdur';
  END IF;
  IF NOT (SELECT active FROM public.stock_layer_settings WHERE singleton=TRUE) THEN
    RAISE EXCEPTION 'Partiya uçotu aktiv deyil';
  END IF;
  v_payload:=jsonb_build_object('lines',p_lines,'doc_num',COALESCE(p_doc_num,''));
  v_hash:=md5(v_payload::text);
  PERFORM pg_advisory_xact_lock(hashtext('layer-request|'||p_request_key::text));
  SELECT * INTO v_existing FROM public.stock_layer_requests WHERE request_key=p_request_key;
  IF FOUND THEN
    IF v_existing.actor_id<>auth.uid() OR v_existing.payload<>v_payload THEN
      RAISE EXCEPTION 'Eyni sorğu açarı fərqli məlumatla istifadə edilib';
    END IF;
    IF v_existing.result IS NULL THEN RAISE EXCEPTION 'Sorğu hələ tamamlanmayıb'; END IF;
    RETURN v_existing.result;
  END IF;
  INSERT INTO public.stock_layer_requests(request_key,actor_id,payload_hash,payload)
  VALUES(p_request_key,auth.uid(),v_hash,v_payload);

  CREATE TEMP TABLE _lr(
    ln INT PRIMARY KEY, d DATE, wh TEXT, code TEXT, typ TEXT, qty NUMERIC,
    partner TEXT,ch TEXT,ct TEXT,iv TEXT,note TEXT,cond JSONB,revision TEXT,
    override_amount NUMERIC,override_reason TEXT
  ) ON COMMIT DROP;
  CREATE TEMP TABLE _la(ln INT,layer_id UUID,qty NUMERIC,PRIMARY KEY(ln,layer_id)) ON COMMIT DROP;
  CREATE TEMP TABLE _lv(ln INT PRIMARY KEY,source_amount NUMERIC,known_amount NUMERIC,
    unknown_qty NUMERIC,final_amount NUMERIC,method TEXT,reason TEXT) ON COMMIT DROP;

  FOR v_line IN SELECT jsonb_array_elements(p_lines) LOOP
    v_ln:=v_ln+1;
    IF COALESCE(v_line->>'type','') NOT IN ('Silinmə','Sahəyə','Satış','Qaytarma') THEN
      RAISE EXCEPTION 'Sətir %: partiyalı çıxış növü dəstəklənmir (%)',v_ln,v_line->>'type';
    END IF;
    IF COALESCE(v_line->>'out_qty','') !~ '^[0-9]+(\.[0-9]{1,4})?$'
       OR (v_line->>'out_qty')::numeric<=0 THEN RAISE EXCEPTION 'Sətir %: miqdar düzgün deyil',v_ln; END IF;
    IF jsonb_typeof(v_line->'allocations')<>'array' OR jsonb_array_length(v_line->'allocations')=0 THEN
      RAISE EXCEPTION 'Sətir %: partiya seçilməyib',v_ln;
    END IF;
    IF NULLIF(btrim(COALESCE(v_line->>'final_amount','')),'') IS NOT NULL
       AND btrim(v_line->>'final_amount') !~ '^(0|[1-9][0-9]{0,15})(\.[0-9]{1,2})?$' THEN
      RAISE EXCEPTION 'Sətir %: yekun məbləğ 0–9999999999999999.99 aralığında və ən çox 2 onluq rəqəmlə yazılmalıdır',v_ln;
    END IF;
    INSERT INTO _lr VALUES(v_ln,(v_line->>'date')::date,btrim(v_line->>'warehouse'),btrim(v_line->>'code'),
      v_line->>'type',(v_line->>'out_qty')::numeric,COALESCE(v_line->>'partner',''),
      COALESCE(v_line->>'channel',''),COALESCE(v_line->>'contract',''),COALESCE(v_line->>'invoice',''),
      COALESCE(v_line->>'note',''),CASE WHEN jsonb_typeof(v_line->'conditions')='object' THEN v_line->'conditions' END,
      COALESCE(v_line->>'revision',''),
      CASE WHEN NULLIF(btrim(COALESCE(v_line->>'final_amount','')),'') IS NULL THEN NULL
           ELSE (v_line->>'final_amount')::numeric END,
      NULLIF(btrim(COALESCE(v_line->>'override_reason','')),''));
    FOR v_alloc IN SELECT jsonb_array_elements(v_line->'allocations') LOOP
      IF COALESCE(v_alloc->>'qty','') !~ '^[0-9]+(\.[0-9]{1,4})?$' OR (v_alloc->>'qty')::numeric<=0 THEN
        RAISE EXCEPTION 'Sətir %: partiya miqdarı düzgün deyil',v_ln;
      END IF;
      INSERT INTO _la VALUES(v_ln,(v_alloc->>'layer_id')::uuid,(v_alloc->>'qty')::numeric)
      ON CONFLICT(ln,layer_id) DO UPDATE SET qty=_la.qty+EXCLUDED.qty;
    END LOOP;
  END LOOP;

  FOR r IN SELECT DISTINCT wh,code FROM _lr ORDER BY wh,code LOOP
    PERFORM pg_advisory_xact_lock(hashtext(r.wh||'|'||r.code));
  END LOOP;
  FOR r IN SELECT DISTINCT layer_id FROM _la ORDER BY layer_id LOOP
    PERFORM 1 FROM public.stock_layers WHERE id=r.layer_id FOR UPDATE;
  END LOOP;

  FOR r IN SELECT * FROM _lr ORDER BY ln LOOP
    IF v_role='anbardar' AND r.wh IS DISTINCT FROM public.current_user_warehouse() THEN
      RAISE EXCEPTION 'Sətir %: yalnız öz anbarınızdan çıxış edə bilərsiniz',r.ln;
    END IF;
    IF r.revision IS DISTINCT FROM public.stock_layer_revision(r.wh,r.code) THEN
      RAISE EXCEPTION 'Sətir %: partiya qalığı dəyişib — siyahını yeniləyin',r.ln;
    END IF;
    SELECT COALESCE(SUM(a.qty),0),
           COALESCE(SUM(CASE WHEN l.price_status IN('known','free') THEN ROUND(a.qty*l.unit_price,2) ELSE 0 END),0),
           COALESCE(SUM(CASE WHEN l.price_status='unknown' THEN a.qty ELSE 0 END),0)
      INTO v_sum,v_known,v_unknown
    FROM _la a JOIN public.stock_layers l ON l.id=a.layer_id
    WHERE a.ln=r.ln AND l.active AND l.warehouse=r.wh AND l.item_code=r.code;
    IF v_sum<>r.qty THEN RAISE EXCEPTION 'Sətir %: partiya miqdarı çıxış miqdarına bərabər deyil',r.ln; END IF;
    IF EXISTS(SELECT 1 FROM _la a LEFT JOIN public.stock_layers l ON l.id=a.layer_id
              WHERE a.ln=r.ln AND (l.id IS NULL OR NOT l.active OR l.warehouse<>r.wh OR l.item_code<>r.code
                                    OR l.available_qty<a.qty)) THEN
      RAISE EXCEPTION 'Sətir %: partiya qalığı kifayət etmir və ya başqa mala aiddir',r.ln;
    END IF;
    v_source:=CASE WHEN v_unknown>0 THEN NULL ELSE ROUND(v_known,2) END;
    IF r.override_amount IS NOT NULL THEN
      IF v_role<>'admin' THEN RAISE EXCEPTION 'Sətir %: məbləği yalnız Admin dəyişə bilər',r.ln; END IF;
      IF r.override_amount<0 OR r.override_amount>9999999999999999.99 THEN RAISE EXCEPTION 'Sətir %: məbləğ düzgün deyil',r.ln; END IF;
      IF r.override_reason IS NULL THEN RAISE EXCEPTION 'Sətir %: məbləğ dəyişikliyinin səbəbi tələb olunur',r.ln; END IF;
      v_final:=ROUND(r.override_amount,2); v_method:='admin_override'; v_reason:=r.override_reason;
    ELSE
      v_final:=v_source; v_method:=CASE WHEN v_unknown>0 THEN 'unknown' ELSE 'source' END; v_reason:=NULL;
    END IF;
    v_price:=CASE WHEN v_final IS NULL THEN 0 ELSE ROUND(v_final/r.qty,4) END;
    INSERT INTO _lv VALUES(r.ln,v_source,ROUND(v_known,2),v_unknown,v_final,v_method,v_reason);
    v_base:=v_base||jsonb_build_array(jsonb_build_object(
      'date',r.d,'warehouse',r.wh,'code',r.code,'type',r.typ,'in_qty',0,'out_qty',r.qty,
      'partner',r.partner,'channel',r.ch,'contract',r.ct,'invoice',r.iv,'price',v_price,'note',r.note,
      'conditions',r.cond));
  END LOOP;

  /* Eyni partiya sənədin bir neçə sətrində seçilə bilər. Sətir-sətir yoxlama
     bunun ümumi qalığı aşmasını tutmur; kiliddən sonra cəm ayrıca yoxlanır. */
  IF EXISTS(
    SELECT 1
    FROM (SELECT layer_id,SUM(qty) AS required_qty FROM _la GROUP BY layer_id) x
    JOIN public.stock_layers l ON l.id=x.layer_id
    WHERE l.available_qty<x.required_qty
  ) THEN
    RAISE EXCEPTION 'Sənəddə eyni partiyadan seçilən ümumi miqdar mövcud qalığı aşır — partiyaları yeniləyin';
  END IF;

  UPDATE public.stock_layers l SET available_qty=l.available_qty-x.qty,updated_at=now()
  FROM (SELECT layer_id,SUM(qty) qty FROM _la GROUP BY layer_id) x WHERE l.id=x.layer_id;
  PERFORM set_config('anbar.stock_layers_write','on',TRUE);
  v_result:=public.post_movement_document(v_base,p_doc_num);

  FOR v_row IN SELECT jsonb_array_elements(v_result->'rows') LOOP
    v_movement:=(v_row->>'id')::uuid; v_ln:=(v_row->>'line')::int;
    INSERT INTO public.writeoff_valuations(movement_id,source_amount,known_amount,unknown_qty,
      final_amount,valuation_method,override_reason,created_by)
    SELECT v_movement,source_amount,known_amount,unknown_qty,final_amount,method,reason,auth.uid()
    FROM _lv WHERE ln=v_ln;
    INSERT INTO public.stock_layer_allocations(writeoff_movement_id,layer_id,qty,source_movement_id,
      source_doc_num_snapshot,source_invoice_snapshot,source_date_snapshot,price_status_snapshot,
      unit_price_snapshot,source_amount_snapshot,created_by)
    SELECT v_movement,l.id,a.qty,l.source_movement_id,l.source_doc_num,l.source_invoice_num,l.received_date,
      l.price_status,l.unit_price,
      CASE WHEN l.price_status='unknown' THEN NULL ELSE ROUND(a.qty*l.unit_price,2) END,auth.uid()
    FROM _la a JOIN public.stock_layers l ON l.id=a.layer_id WHERE a.ln=v_ln;
  END LOOP;
  v_result:=v_result||jsonb_build_object('request_key',p_request_key,'layer_version',36);
  UPDATE public.stock_layer_requests SET result=v_result,completed_at=now() WHERE request_key=p_request_key;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.post_layer_transfer_document(p_lines jsonb, p_request_key uuid, p_doc_num text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT; v_payload JSONB; v_existing public.stock_layer_requests%ROWTYPE;
  v_line JSONB; v_alloc JSONB; v_ln INT:=0; v_sum NUMERIC; v_base JSONB:='[]'::jsonb;
  v_result JSONB; v_row JSONB; v_out UUID; v_in UUID; v_dest_layer UUID; r RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  v_role:=public.current_user_role();
  IF v_role NOT IN('admin','anbardar') THEN RAISE EXCEPTION 'Yerdəyişməyə icazəniz yoxdur'; END IF;
  IF p_request_key IS NULL THEN RAISE EXCEPTION 'Təkrar sorğu açarı tələb olunur'; END IF;
  IF p_lines IS NULL OR jsonb_typeof(p_lines)<>'array' OR jsonb_array_length(p_lines)=0 THEN
    RAISE EXCEPTION 'Yerdəyişmə sətirləri boşdur';
  END IF;
  IF NOT(SELECT active FROM public.stock_layer_settings WHERE singleton=TRUE) THEN
    RAISE EXCEPTION 'Partiya uçotu aktiv deyil';
  END IF;
  v_payload:=jsonb_build_object('operation','transfer','lines',p_lines,'doc_num',COALESCE(p_doc_num,''));
  PERFORM pg_advisory_xact_lock(hashtext('layer-request|'||p_request_key::text));
  SELECT * INTO v_existing FROM public.stock_layer_requests WHERE request_key=p_request_key;
  IF FOUND THEN
    IF v_existing.actor_id<>auth.uid() OR v_existing.payload<>v_payload THEN
      RAISE EXCEPTION 'Eyni sorğu açarı fərqli məlumatla istifadə edilib';
    END IF;
    IF v_existing.result IS NULL THEN RAISE EXCEPTION 'Sorğu hələ tamamlanmayıb'; END IF;
    RETURN v_existing.result;
  END IF;
  INSERT INTO public.stock_layer_requests(request_key,actor_id,payload_hash,payload)
  VALUES(p_request_key,auth.uid(),md5(v_payload::text),v_payload);
  CREATE TEMP TABLE _tr(ln INT PRIMARY KEY,d DATE,src TEXT,dst TEXT,code TEXT,qty NUMERIC,
    note TEXT,ch TEXT,ct TEXT,iv TEXT,cond JSONB,revision TEXT) ON COMMIT DROP;
  CREATE TEMP TABLE _ta(ln INT,layer_id UUID,qty NUMERIC,PRIMARY KEY(ln,layer_id)) ON COMMIT DROP;
  FOR v_line IN SELECT jsonb_array_elements(p_lines) LOOP
    v_ln:=v_ln+1;
    IF COALESCE(v_line->>'qty','') !~ '^[0-9]+(\.[0-9]{1,4})?$' OR (v_line->>'qty')::numeric<=0 THEN
      RAISE EXCEPTION 'Sətir %: miqdar düzgün deyil',v_ln;
    END IF;
    IF jsonb_typeof(v_line->'allocations')<>'array' OR jsonb_array_length(v_line->'allocations')=0 THEN
      RAISE EXCEPTION 'Sətir %: mənbə partiyası seçilməyib',v_ln;
    END IF;
    INSERT INTO _tr VALUES(v_ln,(v_line->>'date')::date,btrim(v_line->>'source'),btrim(v_line->>'dest'),
      btrim(v_line->>'code'),(v_line->>'qty')::numeric,COALESCE(v_line->>'note',''),
      COALESCE(v_line->>'channel',''),COALESCE(v_line->>'contract',''),COALESCE(v_line->>'invoice',''),
      CASE WHEN jsonb_typeof(v_line->'conditions')='object' THEN v_line->'conditions' END,
      COALESCE(v_line->>'revision',''));
    FOR v_alloc IN SELECT jsonb_array_elements(v_line->'allocations') LOOP
      IF COALESCE(v_alloc->>'qty','') !~ '^[0-9]+(\.[0-9]{1,4})?$' OR (v_alloc->>'qty')::numeric<=0 THEN
        RAISE EXCEPTION 'Sətir %: partiya miqdarı düzgün deyil',v_ln;
      END IF;
      INSERT INTO _ta VALUES(v_ln,(v_alloc->>'layer_id')::uuid,(v_alloc->>'qty')::numeric)
      ON CONFLICT(ln,layer_id) DO UPDATE SET qty=_ta.qty+EXCLUDED.qty;
    END LOOP;
  END LOOP;
  FOR r IN SELECT DISTINCT src,code FROM _tr ORDER BY src,code LOOP
    PERFORM pg_advisory_xact_lock(hashtext(r.src||'|'||r.code));
  END LOOP;
  FOR r IN SELECT DISTINCT layer_id FROM _ta ORDER BY layer_id LOOP
    PERFORM 1 FROM public.stock_layers WHERE id=r.layer_id FOR UPDATE;
  END LOOP;
  FOR r IN SELECT * FROM _tr ORDER BY ln LOOP
    IF v_role='anbardar' AND r.src IS DISTINCT FROM public.current_user_warehouse() THEN
      RAISE EXCEPTION 'Sətir %: yalnız öz anbarınızdan yerdəyişmə edə bilərsiniz',r.ln;
    END IF;
    IF r.revision IS DISTINCT FROM public.stock_layer_revision(r.src,r.code) THEN
      RAISE EXCEPTION 'Sətir %: partiya qalığı dəyişib — siyahını yeniləyin',r.ln;
    END IF;
    SELECT COALESCE(SUM(a.qty),0) INTO v_sum FROM _ta a JOIN public.stock_layers l ON l.id=a.layer_id
    WHERE a.ln=r.ln AND l.active AND l.warehouse=r.src AND l.item_code=r.code;
    IF v_sum<>r.qty THEN RAISE EXCEPTION 'Sətir %: partiya cəmi yerdəyişmə miqdarına bərabər deyil',r.ln; END IF;
    IF EXISTS(SELECT 1 FROM _ta a LEFT JOIN public.stock_layers l ON l.id=a.layer_id
      WHERE a.ln=r.ln AND(l.id IS NULL OR NOT l.active OR l.warehouse<>r.src OR l.item_code<>r.code OR l.available_qty<a.qty)) THEN
      RAISE EXCEPTION 'Sətir %: partiya qalığı kifayət etmir',r.ln;
    END IF;
    v_base:=v_base||jsonb_build_array(jsonb_build_object('date',r.d,'source',r.src,'dest',r.dst,
      'code',r.code,'qty',r.qty,'note',r.note,'channel',r.ch,'contract',r.ct,'invoice',r.iv,'conditions',r.cond));
  END LOOP;
  IF EXISTS(
    SELECT 1
    FROM (SELECT layer_id,SUM(qty) AS required_qty FROM _ta GROUP BY layer_id) x
    JOIN public.stock_layers l ON l.id=x.layer_id
    WHERE l.available_qty<x.required_qty
  ) THEN
    RAISE EXCEPTION 'Yerdəyişmə sənədində eyni partiyadan seçilən ümumi miqdar mövcud qalığı aşır — partiyaları yeniləyin';
  END IF;
  UPDATE public.stock_layers l SET available_qty=l.available_qty-x.qty,updated_at=now()
  FROM(SELECT layer_id,SUM(qty)qty FROM _ta GROUP BY layer_id)x WHERE l.id=x.layer_id;
  PERFORM set_config('anbar.stock_layers_write','on',TRUE);
  v_result:=public.post_transfer_document(v_base,p_doc_num);
  FOR v_row IN SELECT jsonb_array_elements(v_result->'rows') LOOP
    v_ln:=(v_row->>'line')::int;v_out:=(v_row->>'out_id')::uuid;v_in:=(v_row->>'in_id')::uuid;
    FOR r IN SELECT a.qty,l.* FROM _ta a JOIN public.stock_layers l ON l.id=a.layer_id WHERE a.ln=v_ln ORDER BY l.id LOOP
      INSERT INTO public.stock_layers(warehouse,item_code,source_type,source_movement_id,root_movement_id,
        parent_layer_id,received_date,source_doc_num,source_invoice_num,price_status,unit_price,
        initial_qty,available_qty,created_by)
      VALUES(v_row->>'dest',v_row->>'code','transfer',v_in,COALESCE(r.root_movement_id,r.source_movement_id),
        r.id,(SELECT d FROM _tr WHERE ln=v_ln),v_result->>'doc_num',r.source_invoice_num,r.price_status,r.unit_price,r.qty,r.qty,auth.uid())
      RETURNING id INTO v_dest_layer;
      INSERT INTO public.stock_layer_transfers(transfer_out_movement_id,transfer_in_movement_id,
        source_layer_id,destination_layer_id,qty,created_by)
      VALUES(v_out,v_in,r.id,v_dest_layer,r.qty,auth.uid());
    END LOOP;
  END LOOP;
  v_result:=v_result||jsonb_build_object('request_key',p_request_key,'layer_version',36);
  UPDATE public.stock_layer_requests SET result=v_result,completed_at=now() WHERE request_key=p_request_key;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.post_movement_document(p_lines jsonb, p_doc_num text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role    TEXT;
  v_wh      TEXT;
  v_doc     TEXT;
  v_line    JSONB;
  v_ln      INT := 0;
  v_bal     NUMERIC;
  v_new_id  UUID;
  v_exp     NUMERIC;   -- <<031>> how much of an outbound line comes out of İcarədə
  v_created JSONB := '[]'::JSONB;
  r         RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı';
  END IF;
  v_role := public.current_user_role();
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'İcazə yoxdur: istifadəçi profili tapılmadı və ya aktiv deyil';
  END IF;
  IF v_role NOT IN ('admin', 'anbardar') THEN
    RAISE EXCEPTION 'İcazə yoxdur: "%" rolu mal hərəkəti əlavə edə bilməz', v_role;
  END IF;
  v_wh := public.current_user_warehouse();

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Sənəd sətirləri boşdur';
  END IF;

  CREATE TEMP TABLE _pl (
    ln INT, d DATE, wh TEXT, code TEXT, typ TEXT,
    in_qty NUMERIC, out_qty NUMERIC, partner TEXT,
    ch TEXT, ct TEXT, iv TEXT, price NUMERIC, note TEXT,
    cond JSONB                                    -- <<031>> per-condition split
  ) ON COMMIT DROP;

  FOR v_line IN SELECT jsonb_array_elements(p_lines) LOOP
    v_ln := v_ln + 1;

    -- <<031>> 'İcarə' added to the accepted type list (mədaxil only — the XOR
    -- check below plus the UI keep it inbound; a məxaric İcarə is not a
    -- supported business event, see this file's header).
    IF (v_line->>'type') IS NULL
       OR (v_line->>'type') NOT IN ('Satınalma', 'Əvvələ qalıq', 'Qaytarma', 'İcarə', 'Silinmə', 'Sahəyə', 'Satış') THEN
      RAISE EXCEPTION 'Sətir %: etibarsız əməliyyat növü (%)', v_ln, (v_line->>'type');
    END IF;
    IF (v_line->>'date') IS NULL OR (v_line->>'date') = '' THEN
      RAISE EXCEPTION 'Sətir %: tarix tələb olunur', v_ln;
    END IF;
    IF COALESCE(TRIM(v_line->>'warehouse'), '') = '' THEN
      RAISE EXCEPTION 'Sətir %: anbar tələb olunur', v_ln;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.warehouses WHERE name = TRIM(v_line->>'warehouse')) THEN
      RAISE EXCEPTION 'Sətir %: anbar tapılmadı (%)', v_ln, TRIM(v_line->>'warehouse');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.items WHERE code = TRIM(v_line->>'code')) THEN
      RAISE EXCEPTION 'Sətir %: mal tapılmadı (%)', v_ln, TRIM(v_line->>'code');
    END IF;

    -- <<031>> An İcarə line is inbound by definition; refuse an outbound one
    -- explicitly rather than letting it quietly lower somebody's İcarədə figure.
    IF (v_line->>'type') = 'İcarə' AND COALESCE((v_line->>'out_qty')::NUMERIC, 0) > 0 THEN
      RAISE EXCEPTION 'Sətir %: «İcarə» yalnız mədaxil əməliyyatıdır', v_ln;
    END IF;

    IF v_role = 'anbardar' THEN
      IF v_wh IS NULL OR TRIM(v_line->>'warehouse') <> v_wh THEN
        RAISE EXCEPTION 'Sətir %: bu anbarda əməliyyat aparmağa icazəniz yoxdur (%)', v_ln, TRIM(v_line->>'warehouse');
      END IF;
    END IF;

    IF (v_line->>'in_qty') IS NULL OR (v_line->>'in_qty') !~ '^[0-9]+(\.[0-9]+)?$'
       OR (v_line->>'out_qty') IS NULL OR (v_line->>'out_qty') !~ '^[0-9]+(\.[0-9]+)?$' THEN
      RAISE EXCEPTION 'Sətir %: giriş/çıxış miqdarı düzgün ədəd olmalıdır', v_ln;
    END IF;
    IF NOT (((v_line->>'in_qty')::NUMERIC > 0) <> ((v_line->>'out_qty')::NUMERIC > 0)) THEN
      RAISE EXCEPTION 'Sətir %: giriş və ya çıxış miqdarından yalnız biri sıfırdan böyük olmalıdır', v_ln;
    END IF;

    -- <<031>> A split only describes stock LEAVING a line. Accepting one on an
    -- inbound row would silently do nothing, so it is refused outright.
    IF v_line ? 'conditions' AND jsonb_typeof(v_line->'conditions') = 'object'
       AND COALESCE((v_line->>'in_qty')::NUMERIC, 0) > 0 THEN
      RAISE EXCEPTION 'Sətir %: mədaxil sətrində tiplərə görə bölgü ola bilməz', v_ln;
    END IF;

    INSERT INTO _pl(ln, d, wh, code, typ, in_qty, out_qty, partner, ch, ct, iv, price, note, cond)
    VALUES (
      v_ln, (v_line->>'date')::DATE, TRIM(v_line->>'warehouse'), TRIM(v_line->>'code'),
      v_line->>'type', (v_line->>'in_qty')::NUMERIC, (v_line->>'out_qty')::NUMERIC,
      COALESCE(v_line->>'partner',''), COALESCE(v_line->>'channel',''),
      COALESCE(v_line->>'contract',''), COALESCE(v_line->>'invoice',''),
      COALESCE((v_line->>'price')::NUMERIC, 0), COALESCE(v_line->>'note',''),
      CASE WHEN jsonb_typeof(v_line->'conditions') = 'object' THEN v_line->'conditions' END
    );
  END LOOP;

  FOR r IN SELECT DISTINCT wh, code FROM _pl ORDER BY wh, code LOOP
    PERFORM pg_advisory_xact_lock(hashtext(r.wh || '|' || r.code));
  END LOOP;

  FOR r IN SELECT wh, code, SUM(out_qty) AS need FROM _pl WHERE out_qty > 0 GROUP BY wh, code LOOP
    SELECT COALESCE(SUM(in_qty - out_qty), 0) INTO v_bal
      FROM public.movements WHERE warehouse = r.wh AND item_code = r.code;
    IF v_bal < r.need THEN
      RAISE EXCEPTION 'Kifayət qədər qalıq yoxdur: "%" anbarında % kodu üzrə mövcud %, tələb olunan % — sənəd yazılmadı',
        r.wh, r.code, v_bal, r.need;
    END IF;
  END LOOP;

  v_doc := NULLIF(TRIM(COALESCE(p_doc_num, '')), '');
  IF v_doc IS NULL THEN
    v_doc := 'SND-' || UPPER(SUBSTR(MD5(clock_timestamp()::TEXT || random()::TEXT), 1, 10));
  END IF;
  IF EXISTS (SELECT 1 FROM public.movements WHERE doc_num = v_doc) THEN
    RAISE EXCEPTION 'Sənəd nömrəsi artıq mövcuddur: %', v_doc;
  END IF;

  FOR r IN SELECT * FROM _pl ORDER BY ln LOOP
    -- <<031>> MUST run BEFORE the INSERT: icare_exposure() reads the live
    -- balance, and once this row is written the balance already reflects it,
    -- which would overstate how much came out of the rented part. Running it
    -- per line in order also makes several lines on the same (warehouse, item)
    -- consume the free stock cumulatively, which is the intended reading.
    -- Qaytarma is excluded — handing rented goods back is what the İcarədə
    -- figure exists for, not an exception to it.
    IF r.out_qty > 0 AND r.cond IS NOT NULL THEN
      -- <<031>> An EXPLICIT split wins over the inferred one. The two must never
      -- both run: icare_exposure() infers "free stock first, rented last", which
      -- is precisely the guess the split exists to replace — running both would
      -- take the rented units off the line twice.
      PERFORM public.apply_cond_split(r.wh, NULL, r.code, r.cond, r.out_qty, r.typ, v_doc, r.note);
    ELSIF r.out_qty > 0 AND r.typ <> 'Qaytarma' THEN
      v_exp := public.icare_exposure(r.wh, r.code, r.out_qty);
      IF v_exp > 0 THEN
        PERFORM public.log_icare_exposure(r.wh, r.code, r.out_qty, r.typ, v_doc, r.note);
        -- The rented units that just left are no longer standing on this line,
        -- so the İcarədə figure must come down with them — exactly what a
        -- transfer already does to its source warehouse. Without this the line
        -- would read "4 units, of which 5 are rented", which is not a warning,
        -- it is a wrong number on the balance screen.
        PERFORM public.apply_icare_delta(r.wh, r.code, -v_exp);
      END IF;
    END IF;

    INSERT INTO public.movements(date, warehouse, item_code, in_qty, out_qty, type, partner,
                          channel, contract_num, invoice_num, price, note, doc_num, created_by)
    VALUES (r.d, r.wh, r.code, r.in_qty, r.out_qty, r.typ, r.partner,
            r.ch, r.ct, r.iv, r.price, r.note, v_doc, auth.uid())
    RETURNING id INTO v_new_id;

    IF r.typ = 'Satınalma' AND r.price > 0 THEN
      UPDATE public.items SET price = r.price, price_source = 'sənəd' WHERE code = r.code;
    END IF;

    -- <<031>> The rented-in figure follows the documents automatically:
    --   İcarə   (mədaxil) — goods arrive on rent            -> raise it
    --   Qaytarma (məxaric) — goods handed back to the owner  -> lower it
    -- apply_icare_delta clamps at 0, so a məxaric Qaytarma of goods that were
    -- never rented (returning a purchase to its supplier) leaves the figure at
    -- 0 instead of driving it negative.
    IF r.typ = 'İcarə' AND r.in_qty > 0 THEN
      PERFORM public.apply_icare_delta(r.wh, r.code, r.in_qty);
    END IF;
    IF r.typ = 'Qaytarma' AND r.out_qty > 0 THEN
      PERFORM public.apply_icare_delta(r.wh, r.code, -r.out_qty);
    END IF;

    v_created := v_created || jsonb_build_object(
      'line', r.ln, 'code', r.code, 'warehouse', r.wh, 'type', r.typ,
      'in_qty', r.in_qty, 'out_qty', r.out_qty, 'id', v_new_id);
  END LOOP;

  RETURN jsonb_build_object('doc_num', v_doc, 'rows', v_created,
                            'row_count', jsonb_array_length(v_created));
END;
$function$;

CREATE OR REPLACE FUNCTION public.post_transfer_document(p_lines jsonb, p_doc_num text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role    TEXT;
  v_wh      TEXT;
  v_doc     TEXT;
  v_line    JSONB;
  v_ln      INT := 0;
  v_bal     NUMERIC;
  v_out_id  UUID;
  v_in_id   UUID;
  v_exp     NUMERIC;
  v_created JSONB := '[]'::JSONB;
  r         RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı';
  END IF;
  v_role := public.current_user_role();
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'İcazə yoxdur: istifadəçi profili tapılmadı və ya aktiv deyil';
  END IF;
  IF v_role NOT IN ('admin', 'anbardar') THEN
    RAISE EXCEPTION 'İcazə yoxdur: "%" rolu yerdəyişmə əlavə edə bilməz', v_role;
  END IF;
  v_wh := public.current_user_warehouse();

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Yerdəyişmə sətirləri boşdur';
  END IF;

  CREATE TEMP TABLE _tl (
    ln   INT, d DATE, src TEXT, dst TEXT, code TEXT, qty NUMERIC,
    note TEXT, ch TEXT, ct TEXT, iv TEXT,
    cond JSONB                                    -- <<031>> per-condition split
  ) ON COMMIT DROP;

  FOR v_line IN SELECT jsonb_array_elements(p_lines) LOOP
    v_ln := v_ln + 1;

    IF (v_line->>'qty') IS NULL OR (v_line->>'qty') !~ '^[0-9]+(\.[0-9]+)?$' THEN
      RAISE EXCEPTION 'Sətir %: miqdar müsbət ədəd olmalıdır', v_ln;
    END IF;
    IF (v_line->>'qty')::NUMERIC <= 0 THEN
      RAISE EXCEPTION 'Sətir %: miqdar sıfırdan böyük olmalıdır', v_ln;
    END IF;
    IF COALESCE(TRIM(v_line->>'source'), '') = '' OR COALESCE(TRIM(v_line->>'dest'), '') = '' THEN
      RAISE EXCEPTION 'Sətir %: mənbə və təyinat anbarı tələb olunur', v_ln;
    END IF;
    IF TRIM(v_line->>'source') = TRIM(v_line->>'dest') THEN
      RAISE EXCEPTION 'Sətir %: mənbə və təyinat anbarı eyni ola bilməz (%)', v_ln, TRIM(v_line->>'source');
    END IF;
    IF (v_line->>'date') IS NULL OR (v_line->>'date') = '' THEN
      RAISE EXCEPTION 'Sətir %: tarix tələb olunur', v_ln;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.warehouses WHERE name = TRIM(v_line->>'source')) THEN
      RAISE EXCEPTION 'Sətir %: mənbə anbar tapılmadı (%)', v_ln, TRIM(v_line->>'source');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.warehouses WHERE name = TRIM(v_line->>'dest')) THEN
      RAISE EXCEPTION 'Sətir %: təyinat anbar tapılmadı (%)', v_ln, TRIM(v_line->>'dest');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.items WHERE code = TRIM(v_line->>'code')) THEN
      RAISE EXCEPTION 'Sətir %: mal tapılmadı (%)', v_ln, TRIM(v_line->>'code');
    END IF;

    -- <<031-fix>> TRANSCRIBED VERBATIM FROM THE LIVE DATABASE, 2026-08-22.
    --
    --   This block previously read, copied from sql/007:
    --     IF v_wh IS NULL OR TRIM(v_line->>'source') <> ALL(public.source_group_warehouses(v_wh))
    --
    --   That is NOT what runs in production, and the preflight caught it before
    --   this file was applied. The live rule is stricter in two ways at once:
    --     * the source must be the anbardar's OWN warehouse — not any warehouse
    --       in their source group (Astara↔Harmony);
    --     * transferring INTO «Ofis» is forbidden for anbardar — a rule that
    --       appears nowhere in the repository.
    --   public.source_group_warehouses() does not exist in the database at all.
    --
    --   Applying the sql/007 version would therefore have widened an anbardar's
    --   source scope AND silently deleted the Ofis restriction, while raising
    --   "function does not exist" on every anbardar transfer. Per CLAUDE.md §5
    --   the live database outranks repository code, so the live rule is kept
    --   exactly as it is. DO NOT "restore" the sql/007 form: sql/007 is the
    --   file that is wrong, not this one.
    IF v_role = 'anbardar' THEN
      IF v_wh IS NULL OR TRIM(v_line->>'source') <> v_wh THEN
        RAISE EXCEPTION 'Sətir %: yalnız öz anbarınızdan yerdəyişmə edə bilərsiniz (%)', v_ln, TRIM(v_line->>'source');
      END IF;
      IF TRIM(v_line->>'dest') = 'Ofis' THEN
        RAISE EXCEPTION 'Sətir %: Ofisə yerdəyişməyə icazəniz yoxdur', v_ln;
      END IF;
    END IF;

    INSERT INTO _tl(ln, d, src, dst, code, qty, note, ch, ct, iv, cond) VALUES (
      v_ln, (v_line->>'date')::DATE, TRIM(v_line->>'source'), TRIM(v_line->>'dest'),
      TRIM(v_line->>'code'), (v_line->>'qty')::NUMERIC,
      COALESCE(v_line->>'note',''), COALESCE(v_line->>'channel',''),
      COALESCE(v_line->>'contract',''), COALESCE(v_line->>'invoice',''),
      CASE WHEN jsonb_typeof(v_line->'conditions') = 'object' THEN v_line->'conditions' END
    );
  END LOOP;

  FOR r IN SELECT DISTINCT src, code FROM _tl ORDER BY src, code LOOP
    PERFORM pg_advisory_xact_lock(hashtext(r.src || '|' || r.code));
  END LOOP;

  FOR r IN SELECT src, code, SUM(qty) AS need FROM _tl GROUP BY src, code LOOP
    SELECT COALESCE(SUM(in_qty - out_qty), 0) INTO v_bal
      FROM public.movements WHERE warehouse = r.src AND item_code = r.code;
    IF v_bal < r.need THEN
      RAISE EXCEPTION 'Kifayət qədər qalıq yoxdur: "%" anbarında % kodu üzrə mövcud %, tələb olunan % — sənəd yazılmadı',
        r.src, r.code, v_bal, r.need;
    END IF;
  END LOOP;

  v_doc := NULLIF(TRIM(COALESCE(p_doc_num, '')), '');
  IF v_doc IS NULL THEN
    v_doc := 'SND-' || UPPER(SUBSTR(MD5(clock_timestamp()::TEXT || random()::TEXT), 1, 10));
  END IF;
  IF EXISTS (SELECT 1 FROM public.movements WHERE doc_num = v_doc) THEN
    RAISE EXCEPTION 'Sənəd nömrəsi artıq mövcuddur: %', v_doc;
  END IF;

  FOR r IN SELECT * FROM _tl ORDER BY ln LOOP
    -- <<031>> Rent follows the goods. Measured BEFORE the outbound leg is
    -- written, because icare_exposure() reads the live balance; afterwards the
    -- balance already reflects this move and the figure would be overstated.
    -- Per line and in order, so several lines on the same (warehouse, item)
    -- consume the free stock cumulatively.
    IF r.cond IS NOT NULL THEN
      -- <<031>> Explicit split: the caller states which buckets move, and the
      -- SAME buckets appear at the destination — a rented or unfit unit keeps
      -- its status across the move. Mutually exclusive with the inferred path
      -- below, otherwise the rented part would be moved twice.
      PERFORM public.apply_cond_split(r.src, r.dst, r.code, r.cond, r.qty, 'Yerdəyişmə', v_doc, r.note);
    ELSE
      v_exp := public.icare_exposure(r.src, r.code, r.qty);
      IF COALESCE(v_exp, 0) > 0 THEN
        PERFORM public.log_icare_exposure(r.src, r.code, r.qty, 'Yerdəyişmə', v_doc, r.note);
        PERFORM public.apply_icare_delta(r.src, r.code, -v_exp);
        PERFORM public.apply_icare_delta(r.dst, r.code,  v_exp);
      END IF;
    END IF;

    INSERT INTO public.movements(date, warehouse, item_code, in_qty, out_qty, type, partner,
                          channel, contract_num, invoice_num, price, note, doc_num, created_by)
    VALUES (r.d, r.src, r.code, 0, r.qty, 'Yerdəyişmə', r.dst || ' anbarına',
            r.ch, r.ct, r.iv, 0, r.note, v_doc, auth.uid())
    RETURNING id INTO v_out_id;

    INSERT INTO public.movements(date, warehouse, item_code, in_qty, out_qty, type, partner,
                          channel, contract_num, invoice_num, price, note, doc_num, created_by)
    VALUES (r.d, r.dst, r.code, r.qty, 0, 'Yerdəyişmə', r.src || ' anbarı',
            r.ch, r.ct, r.iv, 0, r.note, v_doc, auth.uid())
    RETURNING id INTO v_in_id;

    v_created := v_created || jsonb_build_object(
      'line', r.ln, 'code', r.code, 'source', r.src, 'dest', r.dst, 'qty', r.qty,
      'out_id', v_out_id, 'in_id', v_in_id);
  END LOOP;

  RETURN jsonb_build_object('doc_num', v_doc, 'rows', v_created,
                            'row_count', jsonb_array_length(v_created));
END;
$function$;

CREATE OR REPLACE FUNCTION public.register_session(p_device_id text, p_device_label text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid    UUID := auth.uid();
  v_role   TEXT;
  v_dev    TEXT;
  v_label  TEXT;
  v_limit  INT;
  v_active INT;
  v_mine   BOOLEAN;
  v_list   JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;

  v_role := public.current_user_role();
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'İcazə yoxdur: istifadəçi profili tapılmadı və ya aktiv deyil';
  END IF;

  v_dev := NULLIF(btrim(COALESCE(p_device_id, '')), '');
  IF v_dev IS NULL THEN RAISE EXCEPTION 'Cihaz identifikatoru tələb olunur'; END IF;
  IF length(v_dev) > 64 THEN RAISE EXCEPTION 'Cihaz identifikatoru həddindən uzundur'; END IF;
  v_label := left(NULLIF(btrim(COALESCE(p_device_label, '')), ''), 120);

  v_limit := public.session_device_limit(v_role);

  -- Serialise every concurrent registration for THIS user only.
  PERFORM pg_advisory_xact_lock(hashtext('anbar_session:' || v_uid::TEXT));

  DELETE FROM public.sessions
   WHERE user_id = v_uid AND updated_at < public.session_stale_cutoff();

  SELECT EXISTS (SELECT 1 FROM public.sessions WHERE user_id = v_uid AND device_id = v_dev)
    INTO v_mine;

  IF NOT v_mine THEN
    SELECT count(*) INTO v_active FROM public.sessions WHERE user_id = v_uid;
    IF v_active >= v_limit THEN
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'device_id', device_id, 'label', device_label,
               'since', created_at, 'last_seen', updated_at) ORDER BY updated_at DESC), '[]'::JSONB)
        INTO v_list FROM public.sessions WHERE user_id = v_uid;
      RETURN jsonb_build_object('allowed', FALSE, 'limit', v_limit,
                                'active', v_active, 'devices', v_list);
    END IF;
  END IF;

  INSERT INTO public.sessions AS s (user_id, device_id, device_label, updated_at)
  VALUES (v_uid, v_dev, v_label, now())
  ON CONFLICT (user_id, device_id) DO UPDATE
    SET updated_at   = now(),
        device_label = COALESCE(EXCLUDED.device_label, s.device_label);

  IF NOT v_mine THEN
    INSERT INTO public.audit_log(ts, user_id, action, table_name, record_id,
                                 old_values, new_values, reason)
    VALUES (now(), v_uid, 'INSERT', 'sessions', v_dev, NULL,
            jsonb_build_object('device_id', v_dev, 'label', v_label, 'role', v_role),
            'Sessiya açıldı');
  END IF;

  SELECT count(*) INTO v_active FROM public.sessions WHERE user_id = v_uid;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'device_id', device_id, 'label', device_label,
           'since', created_at, 'last_seen', updated_at) ORDER BY updated_at DESC), '[]'::JSONB)
    INTO v_list FROM public.sessions WHERE user_id = v_uid;

  RETURN jsonb_build_object('allowed', TRUE, 'limit', v_limit,
                            'active', v_active, 'devices', v_list);
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_item_request(p_request_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_req    public.item_requests%ROWTYPE;
  v_reason TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;
  IF COALESCE(public.current_user_role(), '') <> 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: sorğunu yalnız aktiv Admin rədd edə bilər';
  END IF;

  v_reason := NULLIF(btrim(COALESCE(p_reason, '')), '');
  IF v_reason IS NULL THEN RAISE EXCEPTION 'Rədd səbəbi tələb olunur'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Sorğu identifikatoru tələb olunur'; END IF;

  SELECT * INTO v_req FROM public.item_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sorğu tapılmadı'; END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Sorğu artıq qapanıb (status: %) — rədd edilə bilməz', v_req.status;
  END IF;

  UPDATE public.item_requests
     SET status = 'rejected', decided_by = auth.uid(), decided_at = now(),
         decision_reason = v_reason, updated_at = now()
   WHERE id = v_req.id;

  INSERT INTO public.audit_log(ts, user_id, action, table_name, record_id, old_values, new_values, reason)
  VALUES (now(), auth.uid(), 'UPDATE', 'item_requests', v_req.id::TEXT,
          jsonb_build_object('status', 'pending', 'name', v_req.name),
          jsonb_build_object('status', 'rejected'),
          'Nomenklatura sorğusu rədd edildi: ' || v_reason);

  RETURN jsonb_build_object('id', v_req.id, 'status', 'rejected', 'reason', v_reason);
END;
$function$;

CREATE OR REPLACE FUNCTION public.replace_movement_item(p_movement_id uuid, p_new_item_code text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role      TEXT;
  v_orig      public.movements%ROWTYPE;
  v_new_code  TEXT;
  v_reason    TEXT;
  v_marker    TEXT;
  v_note      TEXT;
  v_bal       NUMERIC;
  v_rev_id    UUID;
  v_rep_id    UUID;
BEGIN
  -- ---- authorization: Admin only (mirrors 007) ----------------------------
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı';
  END IF;
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role <> 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: malı yalnız aktiv Admin əvəz edə bilər';
  END IF;

  v_new_code := NULLIF(TRIM(COALESCE(p_new_item_code, '')), '');
  v_reason   := NULLIF(TRIM(COALESCE(p_reason, '')), '');
  IF p_movement_id IS NULL OR v_new_code IS NULL THEN
    RAISE EXCEPTION 'Hərəkət qeydi və yeni mal kodu tələb olunur';
  END IF;
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'Əvəzləmənin səbəbi tələb olunur (audit üçün məcburi)';
  END IF;

  -- ---- lock this movement, then read it -----------------------------------
  PERFORM pg_advisory_xact_lock(hashtext('replace-item|' || p_movement_id::TEXT));
  SELECT * INTO v_orig FROM public.movements WHERE id = p_movement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hərəkət qeydi tapılmadı';
  END IF;

  -- ---- what may be replaced ----------------------------------------------
  IF v_orig.type = 'Yerdəyişmə' THEN
    RAISE EXCEPTION 'Yerdəyişmə sətrində mal əvəzlənmir: sənədi ləğv edin və yenidən yazın';
  END IF;
  IF v_orig.type NOT IN ('Satınalma', 'Əvvələ qalıq', 'Qaytarma', 'Silinmə', 'Sahəyə', 'Satış') THEN
    RAISE EXCEPTION 'Bu əməliyyat növü üçün mal əvəzlənməsi dəstəklənmir: %', v_orig.type;
  END IF;
  IF (COALESCE(v_orig.in_qty, 0) > 0) = (COALESCE(v_orig.out_qty, 0) > 0) THEN
    RAISE EXCEPTION 'Qeydin giriş/çıxış istiqaməti etibarlı deyil';
  END IF;

  -- the row must not itself be a technical reversal row
  IF COALESCE(TRIM(v_orig.note), '') ~ '^Ləğv( ID:|:| \(əks yerdəyişmə\))' THEN
    RAISE EXCEPTION 'Ləğv (əks) sətri əvəzlənə bilməz';
  END IF;

  -- the row must not already be cancelled row-wise …
  v_marker := 'Ləğv ID: ' || v_orig.id::TEXT;
  IF EXISTS (SELECT 1 FROM public.movements WHERE note = v_marker) THEN
    RAISE EXCEPTION 'Bu sətir artıq ləğv edilib və ya əvəzlənib';
  END IF;
  -- … nor may its whole document have been cancelled
  IF COALESCE(v_orig.doc_num, '') <> '' AND EXISTS (
       SELECT 1 FROM public.movements
        WHERE note IN ('Ləğv: ' || v_orig.doc_num,
                       'Ləğv (əks yerdəyişmə): ' || v_orig.doc_num)
     ) THEN
    RAISE EXCEPTION 'Bu sənəd artıq bütövlükdə ləğv edilib: %', v_orig.doc_num;
  END IF;

  -- ---- the new item must exist and actually differ ------------------------
  IF NOT EXISTS (SELECT 1 FROM public.items WHERE code = v_new_code) THEN
    RAISE EXCEPTION 'Yeni mal kodu nomenklaturada tapılmadı: %', v_new_code;
  END IF;
  IF v_new_code = v_orig.item_code THEN
    RAISE EXCEPTION 'Yeni mal kodu köhnə ilə eynidir: %', v_new_code;
  END IF;

  -- ---- stock safety -------------------------------------------------------
  -- Lock both item balances in a stable order to avoid deadlocks.
  IF v_orig.item_code < v_new_code THEN
    PERFORM pg_advisory_xact_lock(hashtext(v_orig.warehouse || '|' || v_orig.item_code));
    PERFORM pg_advisory_xact_lock(hashtext(v_orig.warehouse || '|' || v_new_code));
  ELSE
    PERFORM pg_advisory_xact_lock(hashtext(v_orig.warehouse || '|' || v_new_code));
    PERFORM pg_advisory_xact_lock(hashtext(v_orig.warehouse || '|' || v_orig.item_code));
  END IF;

  IF COALESCE(v_orig.in_qty, 0) > 0 THEN
    -- reversing an inbound removes the OLD item again: it must still be there
    SELECT COALESCE(SUM(in_qty - out_qty), 0) INTO v_bal
      FROM public.movements
     WHERE warehouse = v_orig.warehouse AND item_code = v_orig.item_code;
    IF v_bal < v_orig.in_qty THEN
      RAISE EXCEPTION 'Əvəzləmə mümkün deyil: "%" anbarında % kodu üzrə mövcud %, geri çıxarılmalı %',
        v_orig.warehouse, v_orig.item_code, v_bal, v_orig.in_qty;
    END IF;
  ELSE
    -- the replacement is an outbound of the NEW item: it must be available
    SELECT COALESCE(SUM(in_qty - out_qty), 0) INTO v_bal
      FROM public.movements
     WHERE warehouse = v_orig.warehouse AND item_code = v_new_code;
    IF v_bal < v_orig.out_qty THEN
      RAISE EXCEPTION 'Kifayət qədər qalıq yoxdur: "%" anbarında % kodu üzrə mövcud %, tələb olunan %',
        v_orig.warehouse, v_new_code, v_bal, v_orig.out_qty;
    END IF;
  END IF;

  -- ---- 1) reversal of the original line, SAME doc_num ---------------------
  -- note is EXACTLY the marker: operationalMovements() parses it to hide the
  -- original row by id. Nothing may be appended to it.
  INSERT INTO public.movements(date, warehouse, item_code, in_qty, out_qty, type, partner,
                               channel, contract_num, invoice_num, price, note, doc_num, created_by)
  VALUES (v_orig.date, v_orig.warehouse, v_orig.item_code,
          COALESCE(v_orig.out_qty, 0), COALESCE(v_orig.in_qty, 0),
          v_orig.type, v_orig.partner, v_orig.channel, v_orig.contract_num,
          v_orig.invoice_num, v_orig.price, v_marker, v_orig.doc_num, auth.uid())
  RETURNING id INTO v_rev_id;

  -- ---- 2) replacement line with the NEW item, SAME doc_num ----------------
  v_note := CASE WHEN COALESCE(TRIM(v_orig.note), '') <> ''
                 THEN TRIM(v_orig.note) || ' · ' ELSE '' END
            || 'Mal əvəzləndi: ' || v_orig.item_code || ' → ' || v_new_code
            || ' · Səbəb: ' || v_reason;

  INSERT INTO public.movements(date, warehouse, item_code, in_qty, out_qty, type, partner,
                               channel, contract_num, invoice_num, price, note, doc_num, created_by)
  VALUES (v_orig.date, v_orig.warehouse, v_new_code,
          COALESCE(v_orig.in_qty, 0), COALESCE(v_orig.out_qty, 0),
          v_orig.type, v_orig.partner, v_orig.channel, v_orig.contract_num,
          v_orig.invoice_num, v_orig.price, v_note, v_orig.doc_num, auth.uid())
  RETURNING id INTO v_rep_id;

  -- ---- audit --------------------------------------------------------------
  INSERT INTO public.audit_log(ts, user_id, action, table_name, record_id, old_values, new_values, reason)
  VALUES (now(), auth.uid(), 'UPDATE', 'movements', v_orig.id::TEXT,
          jsonb_build_object('item_code', v_orig.item_code, 'doc_num', v_orig.doc_num,
                             'warehouse', v_orig.warehouse, 'date', v_orig.date,
                             'in_qty', v_orig.in_qty, 'out_qty', v_orig.out_qty),
          jsonb_build_object('item_code', v_new_code, 'doc_num', v_orig.doc_num,
                             'reversal_movement_id', v_rev_id,
                             'replacement_movement_id', v_rep_id),
          'Mal əvəzləndi (sətir üzrə): ' || v_reason);

  RETURN jsonb_build_object(
    'original_movement_id',    v_orig.id,
    'reversal_movement_id',    v_rev_id,
    'replacement_movement_id', v_rep_id,
    'doc_num',                 v_orig.doc_num,
    'old_item_code',           v_orig.item_code,
    'new_item_code',           v_new_code);
END;
$function$;

CREATE OR REPLACE FUNCTION public.request_new_item(p_name text, p_unit text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role  TEXT;
  v_wh    TEXT;
  v_name  TEXT;
  v_unit  TEXT;
  v_cat   TEXT;
  v_note  TEXT;
  v_norm  TEXT;
  v_dup   TEXT;
  v_id    UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;

  v_role := public.current_user_role();
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'İcazə yoxdur: istifadəçi profili tapılmadı və ya aktiv deyil';
  END IF;
  IF v_role <> 'anbardar' THEN
    RAISE EXCEPTION 'İcazə yoxdur: nomenklatura sorğusunu yalnız anbardar yarada bilər (cari rol: %)', v_role;
  END IF;

  v_wh := public.current_user_warehouse();
  IF NULLIF(btrim(COALESCE(v_wh, '')), '') IS NULL THEN
    RAISE EXCEPTION 'İcazə yoxdur: anbardara anbar təyin edilməyib';
  END IF;

  v_name := btrim(normalize(COALESCE(p_name, ''), NFKC));
  v_name := regexp_replace(v_name, '[[:space:]]+', ' ', 'g');   -- boşluqları normallaşdır
  IF length(v_name) < 3 THEN
    RAISE EXCEPTION 'Malın adı boşdur və ya 3 simvoldan qısadır';
  END IF;

  v_unit := NULLIF(btrim(normalize(COALESCE(p_unit, ''), NFKC)), '');
  v_cat  := NULLIF(btrim(normalize(COALESCE(p_category, ''), NFKC)), '');
  v_note := NULLIF(btrim(COALESCE(p_note, '')), '');

  -- Kateqoriya verilibsə, YALNIZ sorğuçalardakı aktiv dəyər ola bilər.
  IF v_cat IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.reference_values
        WHERE kind = 'item_category' AND active = TRUE AND lower(btrim(name)) = lower(v_cat)) THEN
    RAISE EXCEPTION 'Kateqoriya sorğuçalarda aktiv deyil: %', v_cat;
  END IF;

  -- Vahid də sorğuçadan kənara çıxa bilməz. Bu, 012-nin trg_guard_item_unit
  -- triggeri ilə eyni qaydadır: onsuz da təsdiq anında items INSERT-i həmin
  -- trigger tərəfindən rədd edilərdi — burada anbardar dərhal aydın xəta alır.
  IF v_unit IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.reference_values
        WHERE kind = 'unit' AND active = TRUE AND lower(btrim(name)) = lower(v_unit)) THEN
    RAISE EXCEPTION 'Ölçü vahidi sorğuçalarda aktiv deyil: %', v_unit;
  END IF;

  v_norm := public.item_request_norm(v_name);

  -- Nomenklaturada dəqiq uyğunluq varsa, sorğuya ehtiyac yoxdur.
  SELECT i.code INTO v_dup FROM public.items i
   WHERE public.item_request_norm(i.name) = v_norm LIMIT 1;
  IF v_dup IS NOT NULL THEN
    RAISE EXCEPTION 'Bu mal nomenklaturada artıq var (kod %) — sorğu yaradılmadı', v_dup;
  END IF;

  -- Eyni ad üzrə gözləyən sorğu. Yarışda son sözü uq_item_requests_pending_name
  -- indeksi deyir; bu yoxlama yalnız aydın mesaj üçündür.
  IF EXISTS (SELECT 1 FROM public.item_requests WHERE status = 'pending' AND name_norm = v_norm) THEN
    RAISE EXCEPTION 'Bu ad üzrə gözləyən sorğu artıq mövcuddur';
  END IF;

  INSERT INTO public.item_requests(name, name_norm, unit, category, note,
                                   status, created_by, created_warehouse)
  VALUES (v_name, v_norm, v_unit, v_cat, v_note, 'pending', auth.uid(), v_wh)
  RETURNING id INTO v_id;

  INSERT INTO public.audit_log(ts, user_id, action, table_name, record_id, old_values, new_values, reason)
  VALUES (now(), auth.uid(), 'INSERT', 'item_requests', v_id::TEXT, NULL,
          jsonb_build_object('name', v_name, 'unit', v_unit, 'category', v_cat,
                             'warehouse', v_wh, 'status', 'pending'),
          'Nomenklatura sorğusu yaradıldı');

  RETURN jsonb_build_object('id', v_id, 'name', v_name, 'unit', v_unit,
                            'category', v_cat, 'status', 'pending', 'warehouse', v_wh);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Bu ad üzrə gözləyən sorğu artıq mövcuddur';
END;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.session_device_limit(p_role text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN p_role = 'admin' THEN 3 ELSE 1 END;
$function$;

CREATE OR REPLACE FUNCTION public.session_stale_cutoff()
 RETURNS timestamp with time zone
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT now() - INTERVAL '3 minutes';
$function$;

CREATE OR REPLACE FUNCTION public.set_item_categories(p_mappings jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_allowed  TEXT[];
  v_elem     JSONB;
  v_badcat   TEXT;
  v_missing  TEXT;
  v_updated  INT;
  v_expected INT;
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'İcazə yoxdur: kateqoriya idxalını yalnız Admin edə bilər';
  END IF;

  IF p_mappings IS NULL OR jsonb_typeof(p_mappings) <> 'array' THEN
    RAISE EXCEPTION 'Yanlış format: massiv (array) gözlənilir';
  END IF;
  IF jsonb_array_length(p_mappings) = 0 THEN
    RAISE EXCEPTION 'Boş siyahı: tətbiq ediləcək uyğunluq yoxdur';
  END IF;
  v_expected := jsonb_array_length(p_mappings);

  -- İcazəli kateqoriyalar: mərkəzi sorğuça (yalnız aktiv) + sistem dəyəri
  SELECT array_agg(r.name) || ARRAY['Təyin edilməyib'] INTO v_allowed
  FROM public.reference_values r
  WHERE r.kind = 'item_category' AND r.active = TRUE;
  IF v_allowed IS NULL THEN
    v_allowed := ARRAY['Təyin edilməyib'];
  END IF;

  -- Hər element TAM OLARAQ {code, category} JSON obyekti olmalıdır
  FOR v_elem IN SELECT jsonb_array_elements(p_mappings) LOOP
    IF jsonb_typeof(v_elem) <> 'object' THEN
      RAISE EXCEPTION 'Yanlış format: hər element {code, category} JSON obyekti olmalıdır (skalyar/massiv element tapıldı)';
    END IF;
    IF (SELECT count(*) FROM jsonb_object_keys(v_elem)) <> 2
       OR NOT (v_elem ? 'code') OR NOT (v_elem ? 'category') THEN
      RAISE EXCEPTION 'Yanlış format: hər obyektdə YALNIZ "code" və "category" açarları olmalıdır (əlavə və ya çatışmayan açar tapıldı)';
    END IF;
    IF jsonb_typeof(v_elem->'code') <> 'string' OR jsonb_typeof(v_elem->'category') <> 'string' THEN
      RAISE EXCEPTION 'Yanlış format: "code" və "category" mətn (string) olmalıdır';
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_mappings) AS x(code text, category text)
    WHERE x.code IS NULL OR btrim(x.code) = '' OR x.category IS NULL OR btrim(x.category) = ''
  ) THEN
    RAISE EXCEPTION 'Yanlış format: boş "code" və ya "category" dəyəri var';
  END IF;

  IF EXISTS (
    SELECT btrim(x.code) FROM jsonb_to_recordset(p_mappings) AS x(code text, category text)
    GROUP BY btrim(x.code) HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Yanlış format: eyni kod bir neçə dəfə göstərilib';
  END IF;

  SELECT string_agg(t.code, ', ') INTO v_missing FROM (
    SELECT DISTINCT btrim(x.code) AS code
    FROM jsonb_to_recordset(p_mappings) AS x(code text, category text)
  ) t
  LEFT JOIN public.items i ON i.code = t.code
  WHERE i.code IS NULL;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Bazada olmayan kodlar: %', v_missing;
  END IF;

  SELECT string_agg(DISTINCT btrim(x.category), ', ') INTO v_badcat
  FROM jsonb_to_recordset(p_mappings) AS x(code text, category text)
  WHERE NOT (btrim(x.category) = ANY(v_allowed));
  IF v_badcat IS NOT NULL THEN
    RAISE EXCEPTION 'Yanlış kateqoriyalar: % (Sorğuçalarda aktiv deyil)', v_badcat;
  END IF;

  -- Tətbiq (all-or-none — funksiya tək tranzaksiyadır)
  -- "Təyin edilməyib" → NULL
  UPDATE public.items i
  SET category = NULLIF(btrim(m.category), 'Təyin edilməyib')
  FROM jsonb_to_recordset(p_mappings) AS m(code text, category text)
  WHERE i.code = btrim(m.code);
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Yekun yoxlama (006-dan saxlanılır): dəyişən sətir sayı gözlənilənlə TAM
  -- uyğun olmalıdır. Uyğunsuzluq — məsələn yoxlama ilə UPDATE arasında malın
  -- paralel silinməsi — EXCEPTION verir və bütün UPDATE geri qaytarılır.
  -- Qismən tətbiq olunmuş idxal heç vaxt qalmır.
  IF v_updated <> v_expected THEN
    RAISE EXCEPTION 'Uyğunsuzluq: % sətir gözlənilirdi, % sətir yeniləndi — heç bir dəyişiklik tətbiq olunmadı', v_expected, v_updated;
  END IF;

  RETURN jsonb_build_object('ok', TRUE, 'updated', v_updated);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_stock_condition(p_warehouse text, p_item_code text, p_unfit_qty numeric DEFAULT 0, p_repair_qty numeric DEFAULT 0, p_onsite_qty numeric DEFAULT 0, p_icare_qty numeric DEFAULT 0, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role   TEXT;
  v_wh     TEXT;
  v_code   TEXT;
  v_unfit  NUMERIC;
  v_repair NUMERIC;
  v_onsite NUMERIC;
  v_icare  NUMERIC;
  v_note   TEXT;
  v_old    public.stock_conditions%ROWTYPE;
  v_bal    NUMERIC;
  v_sum    NUMERIC;
  v_action TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;

  v_role := public.current_user_role();
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'İcazə yoxdur: istifadəçi profili tapılmadı və ya aktiv deyil';
  END IF;
  IF v_role NOT IN ('admin', 'anbardar') THEN
    RAISE EXCEPTION 'İcazə yoxdur: mal vəziyyətini yalnız Admin və ya anbardar dəyişə bilər (cari rol: %)', v_role;
  END IF;

  v_wh   := NULLIF(btrim(normalize(COALESCE(p_warehouse, ''), NFKC)), '');
  v_code := NULLIF(btrim(COALESCE(p_item_code, '')), '');
  IF v_wh IS NULL   THEN RAISE EXCEPTION 'Anbar seçilməyib'; END IF;
  IF v_code IS NULL THEN RAISE EXCEPTION 'Mal kodu tələb olunur'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.warehouses
                  WHERE name = v_wh AND active = TRUE AND type = 'anbar') THEN
    RAISE EXCEPTION 'Anbar tapılmadı və ya aktiv deyil: %', v_wh;
  END IF;

  IF v_role = 'anbardar' THEN
    IF COALESCE(public.current_user_warehouse(), '') <> v_wh THEN
      RAISE EXCEPTION 'İcazə yoxdur: yalnız öz anbarınızda mal vəziyyətini dəyişə bilərsiniz';
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.items WHERE code = v_code) THEN
    RAISE EXCEPTION 'Mal nomenklaturada tapılmadı: %', v_code;
  END IF;

  v_unfit  := COALESCE(p_unfit_qty,  0);
  v_repair := COALESCE(p_repair_qty, 0);
  v_onsite := COALESCE(p_onsite_qty, 0);
  v_icare  := COALESCE(p_icare_qty,  0);

  IF v_unfit  IN ('NaN'::NUMERIC, 'Infinity'::NUMERIC, '-Infinity'::NUMERIC)
  OR v_repair IN ('NaN'::NUMERIC, 'Infinity'::NUMERIC, '-Infinity'::NUMERIC)
  OR v_onsite IN ('NaN'::NUMERIC, 'Infinity'::NUMERIC, '-Infinity'::NUMERIC)
  OR v_icare  IN ('NaN'::NUMERIC, 'Infinity'::NUMERIC, '-Infinity'::NUMERIC) THEN
    RAISE EXCEPTION 'Miqdar düzgün ədəd olmalıdır';
  END IF;
  IF v_unfit < 0 OR v_repair < 0 OR v_onsite < 0 OR v_icare < 0 THEN
    RAISE EXCEPTION 'Miqdar mənfi ola bilməz';
  END IF;
  IF v_unfit > 999999999999 OR v_repair > 999999999999
     OR v_onsite > 999999999999 OR v_icare > 999999999999 THEN
    RAISE EXCEPTION 'Miqdar həddindən böyükdür';
  END IF;

  v_unfit  := ROUND(v_unfit,  2);
  v_repair := ROUND(v_repair, 2);
  v_onsite := ROUND(v_onsite, 2);
  v_icare  := ROUND(v_icare,  2);
  v_note   := NULLIF(btrim(COALESCE(p_note, '')), '');

  v_bal := public.stock_condition_balance(v_wh, v_code);
  v_sum := v_unfit + v_repair + v_onsite + v_icare;

  SELECT * INTO v_old FROM public.stock_conditions
   WHERE warehouse = v_wh AND item_code = v_code FOR UPDATE;

  IF v_sum = 0 AND v_note IS NULL THEN
    IF FOUND THEN
      DELETE FROM public.stock_conditions WHERE warehouse = v_wh AND item_code = v_code;
      v_action := 'DELETE';
    ELSE
      v_action := 'NOOP';
    END IF;
  ELSE
    INSERT INTO public.stock_conditions AS sc
      (warehouse, item_code, unfit_qty, repair_qty, onsite_qty, icare_qty, note, updated_by, updated_at)
    VALUES (v_wh, v_code, v_unfit, v_repair, v_onsite, v_icare, v_note, auth.uid(), now())
    ON CONFLICT (warehouse, item_code) DO UPDATE
      SET unfit_qty  = EXCLUDED.unfit_qty,
          repair_qty = EXCLUDED.repair_qty,
          onsite_qty = EXCLUDED.onsite_qty,
          icare_qty  = EXCLUDED.icare_qty,
          note       = EXCLUDED.note,
          updated_by = EXCLUDED.updated_by,
          updated_at = EXCLUDED.updated_at;
    v_action := CASE WHEN v_old.item_code IS NULL THEN 'INSERT' ELSE 'UPDATE' END;
  END IF;

  IF v_action <> 'NOOP' THEN
    INSERT INTO public.audit_log(ts, user_id, action, table_name, record_id,
                                 old_values, new_values, reason)
    VALUES (now(), auth.uid(), v_action, 'stock_conditions', v_wh || '|' || v_code,
            CASE WHEN v_old.item_code IS NULL THEN NULL
                 ELSE jsonb_build_object('unfit_qty',  v_old.unfit_qty,
                                         'repair_qty', v_old.repair_qty,
                                         'onsite_qty', v_old.onsite_qty,
                                         'icare_qty',  v_old.icare_qty,
                                         'note',       v_old.note) END,
            CASE WHEN v_action = 'DELETE' THEN NULL
                 ELSE jsonb_build_object('unfit_qty',  v_unfit,
                                         'repair_qty', v_repair,
                                         'onsite_qty', v_onsite,
                                         'icare_qty',  v_icare,
                                         'note',       v_note) END,
            'Mal vəziyyəti (yararsız / təmirə ehtiyaclı / sahədə / icarədə) yeniləndi');
  END IF;

  RETURN jsonb_build_object(
    'warehouse',       v_wh,
    'item_code',       v_code,
    'unfit_qty',       v_unfit,
    'repair_qty',      v_repair,
    'onsite_qty',      v_onsite,
    'icare_qty',       v_icare,
    'note',            v_note,
    'action',          v_action,
    'balance',         v_bal,
    'exceeds_balance', (v_sum > v_bal));
END;
$function$;

CREATE OR REPLACE FUNCTION public.stock_condition_balance(p_warehouse text, p_item_code text)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(in_qty - out_qty), 0)
    FROM public.movements
   WHERE warehouse = p_warehouse AND item_code = p_item_code;
$function$;

CREATE OR REPLACE FUNCTION public.stock_layer_revision(p_warehouse text, p_item_code text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT md5(COALESCE(string_agg(id::text||':'||available_qty::text||':'||updated_at::text,'|' ORDER BY id),'empty'))
  FROM public.stock_layers
  WHERE warehouse=p_warehouse AND item_code=p_item_code AND active AND available_qty>0;
$function$;

CREATE OR REPLACE FUNCTION public.stock_layers_supported()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object('version',36,'active',active,'cutover_at',cutover_at)
  FROM public.stock_layer_settings WHERE singleton=TRUE;
$function$;

CREATE OR REPLACE FUNCTION public.touch_session(p_device_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_n   INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'İcazə yoxdur: sessiya tapılmadı'; END IF;

  UPDATE public.sessions SET updated_at = now()
   WHERE user_id = v_uid AND device_id = p_device_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  RETURN jsonb_build_object('alive', v_n > 0);
END;
$function$;

CREATE VIEW public."azp_card_balances" WITH (security_invoker=on) AS  SELECT c.id AS card_id,
    c.module,
    c.card_no,
    c.holder,
    c.project,
    c.active,
    c.sort_order,
    COALESCE(sum(m.amount) FILTER (WHERE m.kind = 'medaxil'::text), 0::numeric)::numeric(14,2) AS medaxil_total,
    COALESCE(sum(m.amount) FILTER (WHERE m.kind = 'mexaric'::text), 0::numeric)::numeric(14,2) AS mexaric_total,
    round(COALESCE(sum(m.amount) FILTER (WHERE m.kind = 'medaxil'::text), 0::numeric) - COALESCE(sum(m.amount) FILTER (WHERE m.kind = 'mexaric'::text), 0::numeric), 2) AS balance,
    count(m.id) FILTER (WHERE m.id IS NOT NULL) AS mov_count
   FROM azp_cards c
     LEFT JOIN azp_movements m ON m.card_id = c.id AND m.cancelled = false AND m.module = c.module
  GROUP BY c.id, c.module, c.card_no, c.holder, c.project, c.active, c.sort_order;

CREATE VIEW public."balances" WITH (security_invoker=on) AS  SELECT m.warehouse,
    m.item_code,
    i.name AS item_name,
    i.unit,
    sum(m.in_qty) AS total_in,
    sum(m.out_qty) AS total_out,
    sum(m.in_qty) - sum(m.out_qty) AS balance_qty,
    i.price AS unit_price,
    (sum(m.in_qty) - sum(m.out_qty)) * i.price AS balance_value,
    max(m.date) AS last_movement_date,
    count(*) AS movement_count
   FROM movements m
     JOIN items i ON i.code = m.item_code
  GROUP BY m.warehouse, m.item_code, i.name, i.unit, i.price;

ALTER TABLE public."serfiyyat_documents" ADD CONSTRAINT "serfiyyat_documents_doc_num_key" UNIQUE (doc_num);

ALTER TABLE public."serfiyyat_documents" ADD CONSTRAINT "serfiyyat_documents_pkey" PRIMARY KEY (id);

ALTER TABLE public."serfiyyat_lines" ADD CONSTRAINT "serfiyyat_lines_pkey" PRIMARY KEY (id);

ALTER TABLE public."serfiyyat_lines" ADD CONSTRAINT "serfiyyat_lines_price_check" CHECK (price >= 0::numeric);

ALTER TABLE public."serfiyyat_lines" ADD CONSTRAINT "serfiyyat_lines_qty_check" CHECK (qty > 0::numeric);

ALTER TABLE public."items" ADD CONSTRAINT "items_pkey" PRIMARY KEY (code);

ALTER TABLE public."users" ADD CONSTRAINT "users_email_key" UNIQUE (email);

ALTER TABLE public."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY (id);

ALTER TABLE public."users" ADD CONSTRAINT "users_role_check" CHECK (role = ANY (ARRAY['admin'::text, 'rehber'::text, 'anbardar'::text, 'techizat'::text, 'muhasib'::text, 'baxis'::text]));

ALTER TABLE public."partners" ADD CONSTRAINT "partners_name_key" UNIQUE (name);

ALTER TABLE public."partners" ADD CONSTRAINT "partners_pkey" PRIMARY KEY (id);

ALTER TABLE public."warehouses" ADD CONSTRAINT "warehouses_name_key" UNIQUE (name);

ALTER TABLE public."warehouses" ADD CONSTRAINT "warehouses_pkey" PRIMARY KEY (id);

ALTER TABLE public."sessions" ADD CONSTRAINT "sessions_pkey" PRIMARY KEY (id);

ALTER TABLE public."sessions" ADD CONSTRAINT "sessions_user_device_key" UNIQUE (user_id, device_id);

ALTER TABLE public."audit_log" ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY (id);

ALTER TABLE public."movements" ADD CONSTRAINT "movements_pkey" PRIMARY KEY (id);

ALTER TABLE public."azp_movements" ADD CONSTRAINT "azp_movements_amount_check" CHECK (amount > 0::numeric);

ALTER TABLE public."azp_movements" ADD CONSTRAINT "azp_movements_kind_check" CHECK (kind = ANY (ARRAY['medaxil'::text, 'mexaric'::text]));

ALTER TABLE public."azp_movements" ADD CONSTRAINT "azp_movements_module_check" CHECK (module = ANY (ARRAY['azpetrol'::text, 'araz'::text]));

ALTER TABLE public."azp_movements" ADD CONSTRAINT "azp_movements_pkey" PRIMARY KEY (id);

ALTER TABLE public."azp_cards" ADD CONSTRAINT "azp_cards_card_no_check" CHECK (btrim(card_no) <> ''::text);

ALTER TABLE public."azp_cards" ADD CONSTRAINT "azp_cards_holder_check" CHECK (btrim(holder) <> ''::text);

ALTER TABLE public."azp_cards" ADD CONSTRAINT "azp_cards_module_check" CHECK (module = ANY (ARRAY['azpetrol'::text, 'araz'::text]));

ALTER TABLE public."azp_cards" ADD CONSTRAINT "azp_cards_pkey" PRIMARY KEY (id);

ALTER TABLE public."azp_audit_log" ADD CONSTRAINT "azp_audit_log_module_check" CHECK (module = ANY (ARRAY['azpetrol'::text, 'araz'::text]));

ALTER TABLE public."azp_audit_log" ADD CONSTRAINT "azp_audit_log_pkey" PRIMARY KEY (id);

ALTER TABLE public."azp_application_balances" ADD CONSTRAINT "azp_application_balances_current_balance_check" CHECK (current_balance >= 0::numeric);

ALTER TABLE public."azp_application_balances" ADD CONSTRAINT "azp_application_balances_module_check" CHECK (module = ANY (ARRAY['azpetrol'::text, 'araz'::text]));

ALTER TABLE public."azp_application_balances" ADD CONSTRAINT "azp_application_balances_pkey" PRIMARY KEY (module);

ALTER TABLE public."item_requests" ADD CONSTRAINT "item_requests_decision_complete" CHECK (status = 'pending'::text AND decided_by IS NULL AND decided_at IS NULL AND item_code IS NULL OR status = 'approved'::text AND decided_by IS NOT NULL AND decided_at IS NOT NULL AND item_code IS NOT NULL OR status = 'rejected'::text AND decided_by IS NOT NULL AND decided_at IS NOT NULL AND item_code IS NULL AND length(btrim(COALESCE(decision_reason, ''::text))) > 0 OR status = 'cancelled'::text AND decided_by IS NOT NULL AND decided_at IS NOT NULL AND item_code IS NULL);

ALTER TABLE public."item_requests" ADD CONSTRAINT "item_requests_name_check" CHECK (length(btrim(name)) >= 3);

ALTER TABLE public."item_requests" ADD CONSTRAINT "item_requests_name_norm_check" CHECK (length(name_norm) > 0);

ALTER TABLE public."item_requests" ADD CONSTRAINT "item_requests_pkey" PRIMARY KEY (id);

ALTER TABLE public."item_requests" ADD CONSTRAINT "item_requests_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text]));

ALTER TABLE public."stock_layer_settings" ADD CONSTRAINT "stock_layer_settings_check" CHECK (NOT active OR cutover_at IS NOT NULL AND cutover_by IS NOT NULL);

ALTER TABLE public."stock_layer_settings" ADD CONSTRAINT "stock_layer_settings_pkey" PRIMARY KEY (singleton);

ALTER TABLE public."stock_layer_settings" ADD CONSTRAINT "stock_layer_settings_schema_version_check" CHECK (schema_version = 36);

ALTER TABLE public."stock_layer_settings" ADD CONSTRAINT "stock_layer_settings_singleton_check" CHECK (singleton);

ALTER TABLE public."stock_layer_requests" ADD CONSTRAINT "stock_layer_requests_pkey" PRIMARY KEY (request_key);

ALTER TABLE public."stock_layers" ADD CONSTRAINT "stock_layers_available_qty_check" CHECK (available_qty >= 0::numeric);

ALTER TABLE public."stock_layers" ADD CONSTRAINT "stock_layers_check" CHECK (available_qty <= initial_qty);

ALTER TABLE public."stock_layers" ADD CONSTRAINT "stock_layers_check1" CHECK (price_status = 'known'::text AND unit_price > 0::numeric OR price_status = 'free'::text AND unit_price = 0::numeric OR price_status = 'unknown'::text AND unit_price IS NULL);

ALTER TABLE public."stock_layers" ADD CONSTRAINT "stock_layers_check2" CHECK (source_type = 'legacy_unresolved'::text AND source_movement_id IS NULL OR source_type <> 'legacy_unresolved'::text);

ALTER TABLE public."stock_layers" ADD CONSTRAINT "stock_layers_initial_qty_check" CHECK (initial_qty > 0::numeric);

ALTER TABLE public."stock_layers" ADD CONSTRAINT "stock_layers_pkey" PRIMARY KEY (id);

ALTER TABLE public."stock_layers" ADD CONSTRAINT "stock_layers_price_status_check" CHECK (price_status = ANY (ARRAY['known'::text, 'unknown'::text, 'free'::text]));

ALTER TABLE public."stock_layers" ADD CONSTRAINT "stock_layers_source_type_check" CHECK (source_type = ANY (ARRAY['legacy_unresolved'::text, 'receipt'::text, 'transfer'::text, 'legacy_adjustment'::text]));

ALTER TABLE public."writeoff_valuations" ADD CONSTRAINT "writeoff_valuations_check" CHECK (valuation_method = 'admin_override'::text AND final_amount IS NOT NULL AND length(btrim(COALESCE(override_reason, ''::text))) > 0 OR valuation_method <> 'admin_override'::text AND override_reason IS NULL);

ALTER TABLE public."writeoff_valuations" ADD CONSTRAINT "writeoff_valuations_check1" CHECK (unknown_qty = 0::numeric AND source_amount IS NOT NULL OR unknown_qty > 0::numeric AND source_amount IS NULL);

ALTER TABLE public."writeoff_valuations" ADD CONSTRAINT "writeoff_valuations_known_amount_check" CHECK (known_amount >= 0::numeric);

ALTER TABLE public."writeoff_valuations" ADD CONSTRAINT "writeoff_valuations_pkey" PRIMARY KEY (movement_id);

ALTER TABLE public."writeoff_valuations" ADD CONSTRAINT "writeoff_valuations_unknown_qty_check" CHECK (unknown_qty >= 0::numeric);

ALTER TABLE public."writeoff_valuations" ADD CONSTRAINT "writeoff_valuations_valuation_method_check" CHECK (valuation_method = ANY (ARRAY['source'::text, 'unknown'::text, 'admin_override'::text]));

ALTER TABLE public."stock_layer_allocations" ADD CONSTRAINT "stock_layer_allocations_check" CHECK (price_status_snapshot = 'known'::text AND unit_price_snapshot > 0::numeric AND source_amount_snapshot IS NOT NULL OR price_status_snapshot = 'free'::text AND unit_price_snapshot = 0::numeric AND source_amount_snapshot = 0::numeric OR price_status_snapshot = 'unknown'::text AND unit_price_snapshot IS NULL AND source_amount_snapshot IS NULL);

ALTER TABLE public."stock_layer_allocations" ADD CONSTRAINT "stock_layer_allocations_pkey" PRIMARY KEY (id);

ALTER TABLE public."stock_layer_allocations" ADD CONSTRAINT "stock_layer_allocations_price_status_snapshot_check" CHECK (price_status_snapshot = ANY (ARRAY['known'::text, 'unknown'::text, 'free'::text]));

ALTER TABLE public."stock_layer_allocations" ADD CONSTRAINT "stock_layer_allocations_qty_check" CHECK (qty > 0::numeric);

ALTER TABLE public."stock_layer_allocations" ADD CONSTRAINT "stock_layer_allocations_writeoff_movement_id_layer_id_key" UNIQUE (writeoff_movement_id, layer_id);

ALTER TABLE public."stock_layer_transfers" ADD CONSTRAINT "stock_layer_transfers_pkey" PRIMARY KEY (id);

ALTER TABLE public."stock_layer_transfers" ADD CONSTRAINT "stock_layer_transfers_qty_check" CHECK (qty > 0::numeric);

ALTER TABLE public."stock_layer_transfers" ADD CONSTRAINT "stock_layer_transfers_transfer_in_movement_id_source_layer__key" UNIQUE (transfer_in_movement_id, source_layer_id);

ALTER TABLE public."stock_conditions" ADD CONSTRAINT "stock_conditions_icare_qty_check" CHECK (icare_qty >= 0::numeric);

ALTER TABLE public."stock_conditions" ADD CONSTRAINT "stock_conditions_not_empty" CHECK (unfit_qty > 0::numeric OR repair_qty > 0::numeric OR onsite_qty > 0::numeric OR icare_qty > 0::numeric OR length(btrim(COALESCE(note, ''::text))) > 0);

ALTER TABLE public."stock_conditions" ADD CONSTRAINT "stock_conditions_onsite_qty_check" CHECK (onsite_qty >= 0::numeric);

ALTER TABLE public."stock_conditions" ADD CONSTRAINT "stock_conditions_pkey" PRIMARY KEY (warehouse, item_code);

ALTER TABLE public."stock_conditions" ADD CONSTRAINT "stock_conditions_repair_qty_check" CHECK (repair_qty >= 0::numeric);

ALTER TABLE public."stock_conditions" ADD CONSTRAINT "stock_conditions_unfit_qty_check" CHECK (unfit_qty >= 0::numeric);

ALTER TABLE public."reference_values" ADD CONSTRAINT "reference_values_kind_chk" CHECK (kind = ANY (ARRAY['purchase_channel'::text, 'unit'::text, 'item_category'::text, 'serfiyyat_channel'::text]));

ALTER TABLE public."reference_values" ADD CONSTRAINT "reference_values_name_check" CHECK (length(TRIM(BOTH FROM name)) >= 2);

ALTER TABLE public."reference_values" ADD CONSTRAINT "reference_values_pkey" PRIMARY KEY (id);

ALTER TABLE public."serfiyyat_projects" ADD CONSTRAINT "serfiyyat_projects_name_check" CHECK (length(TRIM(BOTH FROM name)) >= 2);

ALTER TABLE public."serfiyyat_projects" ADD CONSTRAINT "serfiyyat_projects_pkey" PRIMARY KEY (id);

ALTER TABLE public."serfiyyat_documents" ADD CONSTRAINT "serfiyyat_documents_project_id_fkey" FOREIGN KEY (project_id) REFERENCES serfiyyat_projects(id);

ALTER TABLE public."serfiyyat_lines" ADD CONSTRAINT "serfiyyat_lines_document_id_fkey" FOREIGN KEY (document_id) REFERENCES serfiyyat_documents(id) ON DELETE CASCADE;

ALTER TABLE public."serfiyyat_lines" ADD CONSTRAINT "serfiyyat_lines_item_code_fkey" FOREIGN KEY (item_code) REFERENCES items(code);

ALTER TABLE public."items" ADD CONSTRAINT "items_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE public."partners" ADD CONSTRAINT "partners_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE public."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE public."movements" ADD CONSTRAINT "movements_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE public."movements" ADD CONSTRAINT "movements_item_code_fkey" FOREIGN KEY (item_code) REFERENCES items(code);

ALTER TABLE public."movements" ADD CONSTRAINT "movements_warehouse_fkey" FOREIGN KEY (warehouse) REFERENCES warehouses(name);

ALTER TABLE public."azp_movements" ADD CONSTRAINT "azp_movements_card_id_fkey" FOREIGN KEY (card_id) REFERENCES azp_cards(id) ON DELETE RESTRICT;

ALTER TABLE public."azp_movements" ADD CONSTRAINT "azp_movements_replaced_by_fk" FOREIGN KEY (replaced_by) REFERENCES azp_movements(id) ON DELETE RESTRICT;

ALTER TABLE public."azp_movements" ADD CONSTRAINT "azp_movements_replaces_fk" FOREIGN KEY (replaces_id) REFERENCES azp_movements(id) ON DELETE RESTRICT;

ALTER TABLE public."item_requests" ADD CONSTRAINT "item_requests_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE public."item_requests" ADD CONSTRAINT "item_requests_decided_by_fkey" FOREIGN KEY (decided_by) REFERENCES users(id);

ALTER TABLE public."item_requests" ADD CONSTRAINT "item_requests_item_code_fkey" FOREIGN KEY (item_code) REFERENCES items(code);

ALTER TABLE public."stock_layer_settings" ADD CONSTRAINT "stock_layer_settings_cutover_by_fkey" FOREIGN KEY (cutover_by) REFERENCES users(id);

ALTER TABLE public."stock_layer_requests" ADD CONSTRAINT "stock_layer_requests_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES users(id);

ALTER TABLE public."stock_layers" ADD CONSTRAINT "stock_layers_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE public."stock_layers" ADD CONSTRAINT "stock_layers_item_code_fkey" FOREIGN KEY (item_code) REFERENCES items(code);

ALTER TABLE public."stock_layers" ADD CONSTRAINT "stock_layers_parent_layer_id_fkey" FOREIGN KEY (parent_layer_id) REFERENCES stock_layers(id);

ALTER TABLE public."stock_layers" ADD CONSTRAINT "stock_layers_root_movement_id_fkey" FOREIGN KEY (root_movement_id) REFERENCES movements(id);

ALTER TABLE public."stock_layers" ADD CONSTRAINT "stock_layers_source_movement_id_fkey" FOREIGN KEY (source_movement_id) REFERENCES movements(id);

ALTER TABLE public."writeoff_valuations" ADD CONSTRAINT "writeoff_valuations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE public."writeoff_valuations" ADD CONSTRAINT "writeoff_valuations_movement_id_fkey" FOREIGN KEY (movement_id) REFERENCES movements(id);

ALTER TABLE public."writeoff_valuations" ADD CONSTRAINT "writeoff_valuations_reversed_by_movement_id_fkey" FOREIGN KEY (reversed_by_movement_id) REFERENCES movements(id);

ALTER TABLE public."stock_layer_allocations" ADD CONSTRAINT "stock_layer_allocations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE public."stock_layer_allocations" ADD CONSTRAINT "stock_layer_allocations_layer_id_fkey" FOREIGN KEY (layer_id) REFERENCES stock_layers(id);

ALTER TABLE public."stock_layer_allocations" ADD CONSTRAINT "stock_layer_allocations_source_movement_id_fkey" FOREIGN KEY (source_movement_id) REFERENCES movements(id);

ALTER TABLE public."stock_layer_allocations" ADD CONSTRAINT "stock_layer_allocations_writeoff_movement_id_fkey" FOREIGN KEY (writeoff_movement_id) REFERENCES movements(id);

ALTER TABLE public."stock_layer_transfers" ADD CONSTRAINT "stock_layer_transfers_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE public."stock_layer_transfers" ADD CONSTRAINT "stock_layer_transfers_destination_layer_id_fkey" FOREIGN KEY (destination_layer_id) REFERENCES stock_layers(id);

ALTER TABLE public."stock_layer_transfers" ADD CONSTRAINT "stock_layer_transfers_source_layer_id_fkey" FOREIGN KEY (source_layer_id) REFERENCES stock_layers(id);

ALTER TABLE public."stock_layer_transfers" ADD CONSTRAINT "stock_layer_transfers_transfer_in_movement_id_fkey" FOREIGN KEY (transfer_in_movement_id) REFERENCES movements(id);

ALTER TABLE public."stock_layer_transfers" ADD CONSTRAINT "stock_layer_transfers_transfer_out_movement_id_fkey" FOREIGN KEY (transfer_out_movement_id) REFERENCES movements(id);

ALTER TABLE public."stock_conditions" ADD CONSTRAINT "stock_conditions_item_code_fkey" FOREIGN KEY (item_code) REFERENCES items(code);

ALTER TABLE public."stock_conditions" ADD CONSTRAINT "stock_conditions_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id);

CREATE INDEX idx_audit_user ON public.audit_log USING btree (user_id);

CREATE INDEX azp_movements_card_date_idx ON public.azp_movements USING btree (module, card_id, op_date);

CREATE INDEX idx_sessions_updated ON public.sessions USING btree (updated_at);

CREATE UNIQUE INDEX reference_values_kind_name_ci_uq ON public.reference_values USING btree (kind, lower(name));

CREATE UNIQUE INDEX uq_item_requests_pending_name ON public.item_requests USING btree (name_norm) WHERE (status = 'pending'::text);

CREATE INDEX serfiyyat_lines_document_idx ON public.serfiyyat_lines USING btree (document_id);

CREATE INDEX idx_item_requests_name_norm ON public.item_requests USING btree (name_norm);

CREATE INDEX idx_item_requests_created_by ON public.item_requests USING btree (created_by, created_at DESC);

CREATE UNIQUE INDEX serfiyyat_projects_name_ci_uq ON public.serfiyyat_projects USING btree (lower(name));

CREATE INDEX idx_mv_channel ON public.movements USING btree (channel);

CREATE INDEX idx_stock_conditions_warehouse ON public.stock_conditions USING btree (warehouse);

CREATE UNIQUE INDEX azp_cards_module_no_uq ON public.azp_cards USING btree (module, lower(btrim(card_no)));

CREATE INDEX azp_movements_module_idx ON public.azp_movements USING btree (module, cancelled, op_date);

CREATE INDEX azp_movements_card_idx ON public.azp_movements USING btree (card_id, cancelled);

CREATE INDEX idx_mv_partner ON public.movements USING btree (partner);

CREATE INDEX azp_audit_module_idx ON public.azp_audit_log USING btree (module, at DESC);

CREATE INDEX idx_mv_date ON public.movements USING btree (date);

CREATE INDEX idx_item_requests_status ON public.item_requests USING btree (status, created_at DESC);

CREATE INDEX stock_layers_scope_idx ON public.stock_layers USING btree (warehouse, item_code, active, received_date, id);

CREATE UNIQUE INDEX azp_movements_replaces_uq ON public.azp_movements USING btree (replaces_id) WHERE (replaces_id IS NOT NULL);

CREATE INDEX serfiyyat_documents_date_idx ON public.serfiyyat_documents USING btree (doc_date);

CREATE INDEX idx_items_request_norm ON public.items USING btree (item_request_norm(name));

CREATE INDEX stock_layer_allocations_layer_idx ON public.stock_layer_allocations USING btree (layer_id, reversed_at);

CREATE INDEX idx_mv_wh ON public.movements USING btree (warehouse);

CREATE INDEX stock_layers_source_idx ON public.stock_layers USING btree (source_movement_id);

CREATE INDEX serfiyyat_documents_project_idx ON public.serfiyyat_documents USING btree (project_id);

CREATE INDEX idx_mv_item ON public.movements USING btree (item_code);

CREATE INDEX azp_cards_module_idx ON public.azp_cards USING btree (module, active, sort_order);

CREATE INDEX idx_stock_conditions_item ON public.stock_conditions USING btree (item_code);

CREATE INDEX idx_mv_user ON public.movements USING btree (created_by);

CREATE INDEX stock_layers_root_idx ON public.stock_layers USING btree (root_movement_id);

CREATE INDEX idx_audit_table ON public.audit_log USING btree (table_name, ts);

CREATE INDEX idx_sessions_user ON public.sessions USING btree (user_id, updated_at DESC);

ALTER SEQUENCE public."warehouses_id_seq" OWNED BY public."warehouses"."id";

CREATE TRIGGER trg_stock_layer_movement AFTER INSERT ON movements FOR EACH ROW EXECUTE FUNCTION guard_and_capture_stock_layer_movement();

CREATE TRIGGER movements_audit AFTER INSERT OR DELETE OR UPDATE ON movements FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER partners_audit AFTER INSERT OR DELETE OR UPDATE ON partners FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER trg_enforce_anbardar_warehouse BEFORE INSERT OR UPDATE OF role, warehouse ON users FOR EACH ROW EXECUTE FUNCTION enforce_anbardar_warehouse();

CREATE TRIGGER trg_guard_item_category BEFORE INSERT OR UPDATE OF category ON items FOR EACH ROW EXECUTE FUNCTION guard_item_category();

CREATE TRIGGER trg_guard_item_unit BEFORE INSERT OR UPDATE OF unit ON items FOR EACH ROW EXECUTE FUNCTION guard_item_unit();

CREATE TRIGGER trg_guard_movement_labels BEFORE INSERT ON movements FOR EACH ROW EXECUTE FUNCTION guard_movement_labels();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

ALTER TABLE public."audit_log" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."azp_application_balances" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."azp_audit_log" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."azp_cards" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."azp_movements" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."item_requests" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."movements" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."partners" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."reference_values" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."serfiyyat_documents" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."serfiyyat_lines" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."serfiyyat_projects" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."sessions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."stock_conditions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."stock_layer_allocations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."stock_layer_requests" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."stock_layer_settings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."stock_layer_transfers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."stock_layers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."warehouses" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."writeoff_valuations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movements_update_admin" ON public."movements" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "movements_delete_admin" ON public."movements" AS PERMISSIVE FOR DELETE TO "authenticated" USING (is_admin());

CREATE POLICY "items_select" ON public."items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((current_user_role() IS NOT NULL));

CREATE POLICY "items_write_admin" ON public."items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (is_admin());

CREATE POLICY "items_update_admin" ON public."items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "items_delete_admin" ON public."items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (is_admin());

CREATE POLICY "partners_select" ON public."partners" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((current_user_role() IS NOT NULL));

CREATE POLICY "warehouses_select" ON public."warehouses" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((is_admin() OR is_rehber() OR (is_anbardar() AND (name <> 'Ofis'::text))));

CREATE POLICY "item_requests_select" ON public."item_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((is_admin() OR is_rehber() OR (is_anbardar() AND (created_by = auth.uid()))));

CREATE POLICY "stock_conditions_select" ON public."stock_conditions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((is_admin() OR is_rehber() OR (is_anbardar() AND (warehouse = current_user_warehouse()))));

CREATE POLICY "sessions_select_own" ON public."sessions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((user_id = auth.uid()) OR is_admin()));

CREATE POLICY "p_audit_read" ON public."audit_log" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((my_role() = 'rehber'::text));

CREATE POLICY "users_select" ON public."users" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((id = auth.uid()) OR is_admin()));

CREATE POLICY "users_insert" ON public."users" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (is_admin());

CREATE POLICY "users_update" ON public."users" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "users_delete" ON public."users" AS PERMISSIVE FOR DELETE TO "authenticated" USING (is_admin());

CREATE POLICY "movements_select" ON public."movements" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((is_admin() OR is_rehber() OR (is_anbardar() AND (warehouse = current_user_warehouse()))));

CREATE POLICY "movements_insert_admin" ON public."movements" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (is_admin());

CREATE POLICY "p_reference_values_read" ON public."reference_values" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((active = true) OR (current_user_role() = 'admin'::text)));

CREATE POLICY "azp_cards_select" ON public."azp_cards" AS PERMISSIVE FOR SELECT TO "authenticated" USING (azp_can_read());

CREATE POLICY "azp_movements_select" ON public."azp_movements" AS PERMISSIVE FOR SELECT TO "authenticated" USING (azp_can_read());

CREATE POLICY "azp_audit_select" ON public."azp_audit_log" AS PERMISSIVE FOR SELECT TO "authenticated" USING (azp_can_read());

CREATE POLICY "azp_application_balance_select" ON public."azp_application_balances" AS PERMISSIVE FOR SELECT TO "authenticated" USING (azp_can_read());

CREATE POLICY "p_serfiyyat_projects_read" ON public."serfiyyat_projects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((active = true) OR (current_user_role() = 'admin'::text)));

CREATE POLICY "p_serfiyyat_documents_read" ON public."serfiyyat_documents" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((current_user_role() = ANY (ARRAY['admin'::text, 'rehber'::text])) OR (EXISTS ( SELECT 1
   FROM serfiyyat_projects sp
  WHERE ((sp.id = serfiyyat_documents.project_id) AND (sp.linked_warehouse = current_user_warehouse()))))));

CREATE POLICY "p_serfiyyat_lines_read" ON public."serfiyyat_lines" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM serfiyyat_documents sd
  WHERE (sd.id = serfiyyat_lines.document_id))) AND (EXISTS ( SELECT 1
   FROM (serfiyyat_documents sd2
     JOIN serfiyyat_projects sp2 ON ((sp2.id = sd2.project_id)))
  WHERE ((sd2.id = serfiyyat_lines.document_id) AND ((current_user_role() = ANY (ARRAY['admin'::text, 'rehber'::text])) OR (sp2.linked_warehouse = current_user_warehouse())))))));

CREATE POLICY "stock_layers_select" ON public."stock_layers" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((is_admin() OR is_rehber() OR (is_anbardar() AND (warehouse = current_user_warehouse()))));

CREATE POLICY "writeoff_valuations_select" ON public."writeoff_valuations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM movements m
  WHERE (m.id = writeoff_valuations.movement_id))));

CREATE POLICY "stock_layer_allocations_select" ON public."stock_layer_allocations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM movements m
  WHERE (m.id = stock_layer_allocations.writeoff_movement_id))));

CREATE POLICY "stock_layer_transfers_select" ON public."stock_layer_transfers" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM movements m
  WHERE (m.id = stock_layer_transfers.transfer_out_movement_id))));

REVOKE ALL ON TABLE public."audit_log" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."audit_log" TO "anon";

GRANT SELECT, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."audit_log" TO "authenticated";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."audit_log" TO "service_role";

REVOKE ALL ON TABLE public."azp_application_balances" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."azp_application_balances" TO "anon";

GRANT SELECT, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."azp_application_balances" TO "authenticated";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."azp_application_balances" TO "service_role";

REVOKE ALL ON TABLE public."azp_audit_log" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."azp_audit_log" TO "anon";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."azp_audit_log" TO "service_role";

GRANT SELECT ON TABLE public."azp_audit_log" TO "authenticated";

REVOKE ALL ON TABLE public."azp_card_balances" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."azp_card_balances" TO "anon";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."azp_card_balances" TO "service_role";

GRANT SELECT ON TABLE public."azp_card_balances" TO "authenticated";

REVOKE ALL ON TABLE public."azp_cards" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."azp_cards" TO "anon";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."azp_cards" TO "service_role";

GRANT SELECT ON TABLE public."azp_cards" TO "authenticated";

REVOKE ALL ON TABLE public."azp_movements" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."azp_movements" TO "anon";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."azp_movements" TO "service_role";

GRANT SELECT ON TABLE public."azp_movements" TO "authenticated";

REVOKE ALL ON TABLE public."balances" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."balances" TO "anon";

GRANT SELECT, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."balances" TO "authenticated";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."balances" TO "service_role";

REVOKE ALL ON TABLE public."item_requests" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."item_requests" TO "anon";

GRANT SELECT, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."item_requests" TO "authenticated";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."item_requests" TO "service_role";

REVOKE ALL ON TABLE public."items" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."items" TO "anon";

GRANT INSERT, SELECT, UPDATE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."items" TO "authenticated";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."items" TO "service_role";

REVOKE ALL ON TABLE public."movements" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."movements" TO "anon";

GRANT INSERT, SELECT, UPDATE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."movements" TO "authenticated";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."movements" TO "service_role";

REVOKE ALL ON TABLE public."partners" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."partners" TO "anon";

GRANT INSERT, SELECT, UPDATE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."partners" TO "authenticated";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."partners" TO "service_role";

REVOKE ALL ON TABLE public."reference_values" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."reference_values" TO "anon";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."reference_values" TO "authenticated";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."reference_values" TO "service_role";

REVOKE ALL ON TABLE public."serfiyyat_documents" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."serfiyyat_documents" TO "anon";

GRANT SELECT, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."serfiyyat_documents" TO "authenticated";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."serfiyyat_documents" TO "service_role";

REVOKE ALL ON TABLE public."serfiyyat_lines" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."serfiyyat_lines" TO "anon";

GRANT SELECT, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."serfiyyat_lines" TO "authenticated";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."serfiyyat_lines" TO "service_role";

REVOKE ALL ON TABLE public."serfiyyat_projects" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."serfiyyat_projects" TO "anon";

GRANT SELECT, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."serfiyyat_projects" TO "authenticated";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."serfiyyat_projects" TO "service_role";

REVOKE ALL ON TABLE public."sessions" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."sessions" TO "service_role";

GRANT SELECT ON TABLE public."sessions" TO "authenticated";

REVOKE ALL ON TABLE public."stock_conditions" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."stock_conditions" TO "anon";

GRANT SELECT, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."stock_conditions" TO "authenticated";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."stock_conditions" TO "service_role";

REVOKE ALL ON TABLE public."stock_layer_allocations" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."stock_layer_allocations" TO "anon";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."stock_layer_allocations" TO "service_role";

GRANT SELECT ON TABLE public."stock_layer_allocations" TO "authenticated";

REVOKE ALL ON TABLE public."stock_layer_requests" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."stock_layer_requests" TO "anon";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."stock_layer_requests" TO "service_role";

REVOKE ALL ON TABLE public."stock_layer_settings" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."stock_layer_settings" TO "anon";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."stock_layer_settings" TO "service_role";

REVOKE ALL ON TABLE public."stock_layer_transfers" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."stock_layer_transfers" TO "anon";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."stock_layer_transfers" TO "service_role";

GRANT SELECT ON TABLE public."stock_layer_transfers" TO "authenticated";

REVOKE ALL ON TABLE public."stock_layers" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."stock_layers" TO "anon";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."stock_layers" TO "service_role";

GRANT SELECT ON TABLE public."stock_layers" TO "authenticated";

REVOKE ALL ON TABLE public."users" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."users" TO "anon";

GRANT SELECT, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."users" TO "authenticated";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."users" TO "service_role";

REVOKE ALL ON TABLE public."warehouses" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."warehouses" TO "anon";

GRANT SELECT, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."warehouses" TO "authenticated";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."warehouses" TO "service_role";

REVOKE ALL ON TABLE public."writeoff_valuations" FROM PUBLIC, anon, authenticated, service_role;

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."writeoff_valuations" TO "anon";

GRANT TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public."writeoff_valuations" TO "service_role";

GRANT SELECT ON TABLE public."writeoff_valuations" TO "authenticated";

REVOKE ALL ON SEQUENCE public."warehouses_id_seq" FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON SEQUENCE public."azp_movements_id_seq" FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON SEQUENCE public."azp_audit_log_id_seq" FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON SEQUENCE public."serfiyyat_doc_seq" FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.activate_stock_layers(bigint,timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.activate_stock_layers(bigint,timestamp with time zone) TO "authenticated";

REVOKE ALL ON FUNCTION public.admin_update_user(uuid,text,text,boolean) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid,text,text,boolean) TO "authenticated";

REVOKE ALL ON FUNCTION public.apply_cond_delta(text,text,text,numeric) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.apply_cond_split(text,text,text,jsonb,numeric,text,text,text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.apply_icare_delta(text,text,numeric) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.apply_legacy_layer_delta(text,text,numeric,date,text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.approve_item_request(uuid,text,text,text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.approve_item_request(uuid,text,text,text) TO "authenticated";

REVOKE ALL ON FUNCTION public.azp_can_read() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.azp_can_read() TO "authenticated";

REVOKE ALL ON FUNCTION public.azp_cancel_movement(text,bigint,text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.azp_cancel_movement(text,bigint,text) TO "authenticated";

REVOKE ALL ON FUNCTION public.azp_check_module(text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.azp_correct_movement(text,bigint,jsonb,text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.azp_correct_movement(text,bigint,jsonb,text) TO "authenticated";

REVOKE ALL ON FUNCTION public.azp_delete_card(text,uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.azp_delete_card(text,uuid) TO "authenticated";

REVOKE ALL ON FUNCTION public.azp_is_admin() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.azp_is_admin() TO "authenticated";

REVOKE ALL ON FUNCTION public.azp_post_movements(text,jsonb,text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.azp_post_movements(text,jsonb,text) TO "authenticated";

REVOKE ALL ON FUNCTION public.azp_save_card(text,jsonb) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.azp_save_card(text,jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION public.azp_set_application_balance(text,numeric) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.azp_set_application_balance(text,numeric) TO "authenticated";

REVOKE ALL ON FUNCTION public.azp_user_role() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.azp_user_role() TO "authenticated";

REVOKE ALL ON FUNCTION public.backfill_exact_receipt_layers(bigint,timestamp with time zone,bigint) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.backfill_exact_receipt_layers(bigint,timestamp with time zone,bigint) TO "authenticated";

REVOKE ALL ON FUNCTION public.cancel_document(text,date) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cancel_document(text,date) TO "authenticated";

REVOKE ALL ON FUNCTION public.cancel_documents_batch(text[],date) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cancel_documents_batch(text[],date) TO "authenticated";

REVOKE ALL ON FUNCTION public.cancel_item_request(uuid,text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cancel_item_request(uuid,text) TO "authenticated";

REVOKE ALL ON FUNCTION public.cancel_layer_document(text,date) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cancel_layer_document(text,date) TO "authenticated";

REVOKE ALL ON FUNCTION public.cancel_layer_documents_batch(text[],date) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cancel_layer_documents_batch(text[],date) TO "authenticated";

REVOKE ALL ON FUNCTION public.cancel_layer_legacy_movement(uuid,date) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cancel_layer_legacy_movement(uuid,date) TO "authenticated";

REVOKE ALL ON FUNCTION public.cancel_layer_legacy_transfer(uuid,date) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cancel_layer_legacy_transfer(uuid,date) TO "authenticated";

REVOKE ALL ON FUNCTION public.cancel_layer_movement_row(uuid,text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cancel_layer_movement_row(uuid,text) TO "authenticated";

REVOKE ALL ON FUNCTION public.cancel_layer_transfer_document(text,date) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cancel_layer_transfer_document(text,date) TO "authenticated";

REVOKE ALL ON FUNCTION public.cancel_legacy_movement(uuid,date) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cancel_legacy_movement(uuid,date) TO "authenticated";

REVOKE ALL ON FUNCTION public.cancel_legacy_transfer(uuid,date) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cancel_legacy_transfer(uuid,date) TO "authenticated";

REVOKE ALL ON FUNCTION public.cancel_movement_row(uuid,text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cancel_movement_row(uuid,text) TO "authenticated";

REVOKE ALL ON FUNCTION public.cancel_transfer_document(text,date) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cancel_transfer_document(text,date) TO "authenticated";

REVOKE ALL ON FUNCTION public.correct_document(text,jsonb,text,date) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.correct_document(text,jsonb,text,date) TO "authenticated";

REVOKE ALL ON FUNCTION public.create_serfiyyat_document(uuid,date,text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_serfiyyat_document(uuid,date,text,text,text,text,text,jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO "authenticated";

REVOKE ALL ON FUNCTION public.current_user_warehouse() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.current_user_warehouse() TO "authenticated";

REVOKE ALL ON FUNCTION public.delete_serfiyyat_document(uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.delete_serfiyyat_document(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION public.document_edit_impact(text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.document_edit_impact(text) TO "authenticated";

REVOKE ALL ON FUNCTION public.edit_serfiyyat_document(uuid,uuid,date,text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.edit_serfiyyat_document(uuid,uuid,date,text,text,text,text,text,jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION public.effective_role(text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.effective_role(text) TO "authenticated";

REVOKE ALL ON FUNCTION public.end_other_sessions(text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.end_other_sessions(text) TO "authenticated";

REVOKE ALL ON FUNCTION public.end_session(text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.end_session(text) TO "authenticated";

REVOKE ALL ON FUNCTION public.enforce_anbardar_warehouse() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.enforce_anbardar_warehouse() TO PUBLIC;

REVOKE ALL ON FUNCTION public.get_reference_values() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_reference_values() TO "authenticated";

REVOKE ALL ON FUNCTION public.get_stock_layers(text,text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_stock_layers(text,text) TO "authenticated";

REVOKE ALL ON FUNCTION public.get_transfer_destinations() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_transfer_destinations() TO "authenticated";

REVOKE ALL ON FUNCTION public.get_user_directory() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_user_directory() TO "authenticated";

REVOKE ALL ON FUNCTION public.guard_and_capture_stock_layer_movement() FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.guard_item_category() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.guard_item_category() TO PUBLIC;

REVOKE ALL ON FUNCTION public.guard_item_unit() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.guard_item_unit() TO PUBLIC;

REVOKE ALL ON FUNCTION public.guard_movement_labels() FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO PUBLIC;

REVOKE ALL ON FUNCTION public.icare_exposure(text,text,numeric) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.icare_exposure(text,text,numeric) TO "authenticated";

REVOKE ALL ON FUNCTION public.import_new_items(jsonb) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.import_new_items(jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.is_admin() TO "authenticated";

REVOKE ALL ON FUNCTION public.is_anbardar() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.is_anbardar() TO "authenticated";

REVOKE ALL ON FUNCTION public.is_rehber() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.is_rehber() TO "authenticated";

REVOKE ALL ON FUNCTION public.item_request_candidates(text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.item_request_candidates(text) TO "authenticated";

REVOKE ALL ON FUNCTION public.item_request_norm(text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.item_request_norm(text) TO "authenticated";

REVOKE ALL ON FUNCTION public.legacy_transfer_strip_suffix(text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.list_my_sessions() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.list_my_sessions() TO "authenticated";

REVOKE ALL ON FUNCTION public.lock_reference_labels(text,text[]) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.log_changes() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.log_changes() TO PUBLIC;

REVOKE ALL ON FUNCTION public.log_icare_exposure(text,text,numeric,text,text,text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.manage_reference_uuid_internal(text,text,uuid,text,jsonb) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.manage_reference(text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.manage_reference(text,text,text,text,jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION public.movement_split_supported() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.movement_split_supported() TO "authenticated";

REVOKE ALL ON FUNCTION public.my_role() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.my_role() TO PUBLIC;

REVOKE ALL ON FUNCTION public.my_warehouse() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.my_warehouse() TO PUBLIC;

REVOKE ALL ON FUNCTION public.next_serfiyyat_doc_num() FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.nom_norm(text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.nom_norm(text) TO PUBLIC;

REVOKE ALL ON FUNCTION public.post_layer_movement_document(jsonb,uuid,text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.post_layer_movement_document(jsonb,uuid,text) TO "authenticated";

REVOKE ALL ON FUNCTION public.post_layer_transfer_document(jsonb,uuid,text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.post_layer_transfer_document(jsonb,uuid,text) TO "authenticated";

REVOKE ALL ON FUNCTION public.post_movement_document(jsonb,text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.post_movement_document(jsonb,text) TO "authenticated";

REVOKE ALL ON FUNCTION public.post_transfer_document(jsonb,text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.post_transfer_document(jsonb,text) TO "authenticated";

REVOKE ALL ON FUNCTION public.register_session(text,text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.register_session(text,text) TO "authenticated";

REVOKE ALL ON FUNCTION public.reject_item_request(uuid,text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.reject_item_request(uuid,text) TO "authenticated";

REVOKE ALL ON FUNCTION public.replace_movement_item(uuid,text,text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.replace_movement_item(uuid,text,text) TO "authenticated";

REVOKE ALL ON FUNCTION public.request_new_item(text,text,text,text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.request_new_item(text,text,text,text) TO "authenticated";

REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO PUBLIC;

REVOKE ALL ON FUNCTION public.session_device_limit(text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.session_stale_cutoff() FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.set_item_categories(jsonb) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.set_item_categories(jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION public.set_stock_condition(text,text,numeric,numeric,numeric,numeric,text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.set_stock_condition(text,text,numeric,numeric,numeric,numeric,text) TO "authenticated";

REVOKE ALL ON FUNCTION public.stock_condition_balance(text,text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.stock_layer_revision(text,text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.stock_layers_supported() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.stock_layers_supported() TO "authenticated";

REVOKE ALL ON FUNCTION public.touch_session(text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.touch_session(text) TO "authenticated";

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

ALTER PUBLICATION "supabase_realtime" ADD TABLE public."movements";

COMMIT;
