


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."create_checkout_order"("customer" "jsonb", "items" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  customer_id uuid;
  checkout_order_id uuid;
  order_number text;
  order_subtotal numeric(10,2) := 0;
  item jsonb;
  product_row public.products%rowtype;
  quantity integer;
  line_total numeric(10,2);
  order_row public.orders%rowtype;
  customer_name text;
  customer_phone text;
  customer_email text;
  normalized_email text;
  normalized_phone text;
begin
  if customer is null or jsonb_typeof(customer) <> 'object' then
    raise exception 'Invalid customer payload';
  end if;

  if items is null
     or jsonb_typeof(items) <> 'array'
     or jsonb_array_length(items) = 0 then
    raise exception 'Cart is empty';
  end if;

  customer_name := nullif(trim(customer->>'name'), '');
  customer_phone := nullif(trim(customer->>'phone'), '');
  customer_email := nullif(lower(trim(customer->>'email')), '');

  normalized_email := customer_email;

  normalized_phone := nullif(
    regexp_replace(
      coalesce(customer_phone, ''),
      '[^0-9]',
      '',
      'g'
    ),
    ''
  );

  if customer_name is null
     or customer_phone is null
     or nullif(trim(customer->>'country'), '') is null
     or nullif(trim(customer->>'governorate'), '') is null
     or nullif(trim(customer->>'city'), '') is null
     or nullif(trim(customer->>'address'), '') is null then
    raise exception 'Required customer details are missing';
  end if;

  select public.find_or_create_customer(
    customer_name,
    customer_email,
    normalized_phone
  )
  into customer_id;

  order_number :=
    'TRN-' ||
    to_char(now(), 'YYYYMMDD') ||
    '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.orders(
    order_number,
    customer_id,
    customer_name,
    customer_phone,
    customer_email,
    country,
    governorate,
    city,
    address
  )
  values (
    order_number,
    customer_id,
    customer_name,
    normalized_phone,
    customer_email,
    trim(customer->>'country'),
    trim(customer->>'governorate'),
    trim(customer->>'city'),
    trim(customer->>'address')
  )
  returning id into checkout_order_id;

  for item in select * from jsonb_array_elements(items) loop

    if jsonb_typeof(item) <> 'object' then
      raise exception 'Invalid cart item';
    end if;

    quantity := coalesce((item->>'quantity')::integer, 0);

    if item->>'id' is null
       or trim(item->>'id') = '' then
      raise exception 'Product id is required';
    end if;

    if quantity < 1 or quantity > 99 then
      raise exception 'Invalid quantity';
    end if;

    select *
    into product_row
    from public.products
    where id = (item->>'id')::uuid
      and is_published = true
    for update;

    if not found then
      raise exception 'Product is unavailable';
    end if;

    if product_row.stock < quantity then
      raise exception
        'Only % items are available for %',
        product_row.stock,
        product_row.name;
    end if;

    line_total := product_row.price * quantity;

    order_subtotal := order_subtotal + line_total;

    insert into public.order_items(
      order_id,
      product_id,
      product_name,
      product_image,
      unit_price,
      quantity,
      line_total
    )
    values (
      checkout_order_id,
      product_row.id,
      product_row.name,
      product_row.image_url,
      product_row.price,
      quantity,
      line_total
    );

    update public.products
    set
      stock = stock - quantity,
      updated_at = now()
    where id = product_row.id;

  end loop;

  update public.orders
  set
    subtotal = order_subtotal,
    total = order_subtotal,
    updated_at = now()
  where public.orders.id = checkout_order_id
  returning * into order_row;

  return jsonb_build_object(
    'order',
    to_jsonb(order_row),
    'items',
    coalesce(
      (
        select jsonb_agg(to_jsonb(oi))
        from public.order_items oi
        where oi.order_id = checkout_order_id
      ),
      '[]'::jsonb
    )
  );
end;
$$;


ALTER FUNCTION "public"."create_checkout_order"("customer" "jsonb", "items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_or_create_customer"("customer_name" "text", "customer_email" "text", "customer_phone" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  customer_id uuid;
  normalized_email text := nullif(lower(trim(customer_email)), '');
  normalized_phone text := nullif(regexp_replace(coalesce(customer_phone, ''), '[^0-9]', '', 'g'), '');
begin
  if nullif(trim(customer_name), '') is null or (normalized_email is null and normalized_phone is null) then
    raise exception 'A customer name and email or phone are required';
  end if;

  if normalized_email is not null then
    perform pg_advisory_xact_lock(hashtextextended('customer-email:' || normalized_email, 0));
    select c.id into customer_id from public.customers c
    where lower(trim(c.email)) = normalized_email
    order by c.created_at asc limit 1 for update;
  else
    perform pg_advisory_xact_lock(hashtextextended('customer-phone:' || normalized_phone, 0));
    select c.id into customer_id from public.customers c
    where regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g') = normalized_phone
    order by c.created_at asc limit 1 for update;
  end if;

  if customer_id is null then
    insert into public.customers(name, email, phone)
    values (trim(customer_name), normalized_email, normalized_phone)
    returning id into customer_id;
  else
    update public.customers
    set name = coalesce(name, trim(customer_name)),
        email = coalesce(email, normalized_email),
        phone = coalesce(nullif(regexp_replace(phone, '[^0-9]', '', 'g'), ''), normalized_phone)
    where id = customer_id;
  end if;
  return customer_id;
end;
$$;


ALTER FUNCTION "public"."find_or_create_customer"("customer_name" "text", "customer_email" "text", "customer_phone" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_user_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "permission_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_user_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "admin_users_role_check" CHECK (("role" = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'content_manager'::"text", 'order_manager'::"text", 'product_manager'::"text", 'editor'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "email" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "image_url" "text" NOT NULL,
    "description" "text" NOT NULL,
    "event_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone,
    "location" "text",
    "button_text" "text",
    "button_url" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "events_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gift_list_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gift_list_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."gift_list_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gift_lists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gift_lists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gift_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "value" "text" NOT NULL
);


ALTER TABLE "public"."gift_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gift_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."gift_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gift_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "option_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "weight" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."gift_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "file_path" "text" NOT NULL,
    "alt_text" "text",
    "type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."occasions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "subtitle" "text",
    "image_url" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_published" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."occasions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "product_name" "text" NOT NULL,
    "product_image" "text",
    "unit_price" numeric(10,2) NOT NULL,
    "quantity" integer NOT NULL,
    "line_total" numeric(10,2) NOT NULL,
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text" NOT NULL,
    "customer_id" "uuid",
    "customer_name" "text" NOT NULL,
    "customer_phone" "text" NOT NULL,
    "customer_email" "text",
    "country" "text" NOT NULL,
    "governorate" "text" NOT NULL,
    "city" "text" NOT NULL,
    "address" "text" NOT NULL,
    "subtotal" numeric(10,2) DEFAULT 0 NOT NULL,
    "discount" numeric(10,2) DEFAULT 0 NOT NULL,
    "shipping" numeric(10,2) DEFAULT 0 NOT NULL,
    "total" numeric(10,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "orders_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'failed'::"text", 'refunded'::"text"]))),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'contacted'::"text", 'confirmed'::"text", 'preparing'::"text", 'completed'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."page_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "page_id" "uuid" NOT NULL,
    "section_type" "text" NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_visible" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."page_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "seo_title" "text",
    "seo_description" "text",
    "is_published" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "key" "text" NOT NULL,
    "description" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "alt_text" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_shipping_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "state" "text" NOT NULL,
    "suburb" "text" DEFAULT ''::"text" NOT NULL,
    "metro" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_shipping_locations_state_check" CHECK (("state" = ANY (ARRAY['NSW'::"text", 'VIC'::"text", 'QLD'::"text", 'WA'::"text", 'SA'::"text", 'TAS'::"text", 'ACT'::"text", 'NT'::"text"])))
);


ALTER TABLE "public"."product_shipping_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "meaning" "text",
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "category" "text",
    "stock" integer DEFAULT 0 NOT NULL,
    "image_url" "text",
    "is_featured" boolean DEFAULT false NOT NULL,
    "is_published" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "occasion" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "gift_for" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "length" numeric,
    "width" numeric,
    "height" numeric,
    "weight" numeric
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) DEFAULT 0 NOT NULL,
    CONSTRAINT "request_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."request_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "gift_list_id" "uuid",
    "occasion" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "admin_notes" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."site_settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_user_permissions"
    ADD CONSTRAINT "admin_user_permissions_admin_user_id_permission_key_key" UNIQUE ("admin_user_id", "permission_key");



ALTER TABLE ONLY "public"."admin_user_permissions"
    ADD CONSTRAINT "admin_user_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."gift_list_items"
    ADD CONSTRAINT "gift_list_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gift_lists"
    ADD CONSTRAINT "gift_lists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gift_options"
    ADD CONSTRAINT "gift_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gift_questions"
    ADD CONSTRAINT "gift_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gift_rules"
    ADD CONSTRAINT "gift_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."occasions"
    ADD CONSTRAINT "occasions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."occasions"
    ADD CONSTRAINT "occasions_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."page_sections"
    ADD CONSTRAINT "page_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pages"
    ADD CONSTRAINT "pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pages"
    ADD CONSTRAINT "pages_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_shipping_locations"
    ADD CONSTRAINT "product_shipping_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_shipping_locations"
    ADD CONSTRAINT "product_shipping_locations_product_state_unique" UNIQUE ("product_id", "state");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."request_items"
    ADD CONSTRAINT "request_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key");



CREATE INDEX "idx_customers_normalized_email" ON "public"."customers" USING "btree" ("lower"(TRIM(BOTH FROM "email"))) WHERE (("email" IS NOT NULL) AND (TRIM(BOTH FROM "email") <> ''::"text"));



CREATE INDEX "idx_customers_normalized_phone" ON "public"."customers" USING "btree" ("regexp_replace"("phone", '[^0-9]'::"text", ''::"text", 'g'::"text")) WHERE (("phone" IS NOT NULL) AND ("regexp_replace"("phone", '[^0-9]'::"text", ''::"text", 'g'::"text") <> ''::"text"));



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_product_id" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_orders_customer_id" ON "public"."orders" USING "btree" ("customer_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "product_images_product_id_idx" ON "public"."product_images" USING "btree" ("product_id");



CREATE INDEX "product_images_sort_order_idx" ON "public"."product_images" USING "btree" ("product_id", "sort_order");



CREATE INDEX "product_shipping_locations_product_id_idx" ON "public"."product_shipping_locations" USING "btree" ("product_id");



ALTER TABLE ONLY "public"."admin_user_permissions"
    ADD CONSTRAINT "admin_user_permissions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_user_permissions"
    ADD CONSTRAINT "admin_user_permissions_permission_key_fkey" FOREIGN KEY ("permission_key") REFERENCES "public"."permissions"("key") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gift_list_items"
    ADD CONSTRAINT "gift_list_items_gift_list_id_fkey" FOREIGN KEY ("gift_list_id") REFERENCES "public"."gift_lists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gift_list_items"
    ADD CONSTRAINT "gift_list_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gift_lists"
    ADD CONSTRAINT "gift_lists_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gift_options"
    ADD CONSTRAINT "gift_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."gift_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gift_rules"
    ADD CONSTRAINT "gift_rules_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "public"."gift_options"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gift_rules"
    ADD CONSTRAINT "gift_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."page_sections"
    ADD CONSTRAINT "page_sections_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_shipping_locations"
    ADD CONSTRAINT "product_shipping_locations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_items"
    ADD CONSTRAINT "request_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."request_items"
    ADD CONSTRAINT "request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_gift_list_id_fkey" FOREIGN KEY ("gift_list_id") REFERENCES "public"."gift_lists"("id") ON DELETE SET NULL;



CREATE POLICY "Public can view published events" ON "public"."events" FOR SELECT TO "authenticated", "anon" USING (("status" = 'published'::"text"));



CREATE POLICY "Super admins can manage events" ON "public"."events" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE (("admin_users"."id" = "auth"."uid"()) AND ("admin_users"."role" = 'super_admin'::"text") AND ("admin_users"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE (("admin_users"."id" = "auth"."uid"()) AND ("admin_users"."role" = 'super_admin'::"text") AND ("admin_users"."is_active" = true)))));



ALTER TABLE "public"."admin_user_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admins can read own admin profile" ON "public"."admin_users" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "admins can read permissions" ON "public"."permissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true)))));



CREATE POLICY "admins can read settings" ON "public"."site_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true)))));



CREATE POLICY "admins can write settings" ON "public"."site_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true)))));



CREATE POLICY "admins manage occasions" ON "public"."occasions" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true)))));



CREATE POLICY "admins manage order items" ON "public"."order_items" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true)))));



CREATE POLICY "admins manage orders" ON "public"."orders" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true)))));



CREATE POLICY "admins manage product shipping locations" ON "public"."product_shipping_locations" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true)))));



CREATE POLICY "admins manage products" ON "public"."products" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true)))));



CREATE POLICY "admins manage request items" ON "public"."request_items" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true)))));



CREATE POLICY "admins manage requests" ON "public"."requests" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true)))));



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gift_list_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gift_lists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gift_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gift_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gift_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."occasions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."page_sections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_shipping_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public can read active gift questions" ON "public"."gift_questions" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "public can read checkout settings" ON "public"."site_settings" FOR SELECT USING (("key" = ANY (ARRAY['whatsapp_checkout_enabled'::"text", 'whatsapp_number'::"text", 'store_name'::"text"])));



CREATE POLICY "public can read gift options" ON "public"."gift_options" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."gift_questions" "gq"
  WHERE (("gq"."id" = "gift_options"."question_id") AND ("gq"."is_active" = true)))));



CREATE POLICY "public can read published occasions" ON "public"."occasions" FOR SELECT USING (("is_published" = true));



CREATE POLICY "public can read published product galleries" ON "public"."product_images" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."id" = "product_images"."product_id") AND ("p"."is_published" = true)))));



CREATE POLICY "public can read published products" ON "public"."products" FOR SELECT USING (("is_published" = true));



ALTER TABLE "public"."request_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "super admins manage permission grants" ON "public"."admin_user_permissions" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true) AND ("a"."role" = 'super_admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE (("a"."id" = "auth"."uid"()) AND ("a"."is_active" = true) AND ("a"."role" = 'super_admin'::"text")))));



CREATE POLICY "users can read own permission grants" ON "public"."admin_user_permissions" FOR SELECT USING (("admin_user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."create_checkout_order"("customer" "jsonb", "items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_checkout_order"("customer" "jsonb", "items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_checkout_order"("customer" "jsonb", "items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_checkout_order"("customer" "jsonb", "items" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."find_or_create_customer"("customer_name" "text", "customer_email" "text", "customer_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."find_or_create_customer"("customer_name" "text", "customer_email" "text", "customer_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."find_or_create_customer"("customer_name" "text", "customer_email" "text", "customer_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_or_create_customer"("customer_name" "text", "customer_email" "text", "customer_phone" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."admin_user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."admin_user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_user_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."gift_list_items" TO "anon";
GRANT ALL ON TABLE "public"."gift_list_items" TO "authenticated";
GRANT ALL ON TABLE "public"."gift_list_items" TO "service_role";



GRANT ALL ON TABLE "public"."gift_lists" TO "anon";
GRANT ALL ON TABLE "public"."gift_lists" TO "authenticated";
GRANT ALL ON TABLE "public"."gift_lists" TO "service_role";



GRANT ALL ON TABLE "public"."gift_options" TO "anon";
GRANT ALL ON TABLE "public"."gift_options" TO "authenticated";
GRANT ALL ON TABLE "public"."gift_options" TO "service_role";



GRANT ALL ON TABLE "public"."gift_questions" TO "anon";
GRANT ALL ON TABLE "public"."gift_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."gift_questions" TO "service_role";



GRANT ALL ON TABLE "public"."gift_rules" TO "anon";
GRANT ALL ON TABLE "public"."gift_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."gift_rules" TO "service_role";



GRANT ALL ON TABLE "public"."media" TO "anon";
GRANT ALL ON TABLE "public"."media" TO "authenticated";
GRANT ALL ON TABLE "public"."media" TO "service_role";



GRANT ALL ON TABLE "public"."occasions" TO "anon";
GRANT ALL ON TABLE "public"."occasions" TO "authenticated";
GRANT ALL ON TABLE "public"."occasions" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."page_sections" TO "anon";
GRANT ALL ON TABLE "public"."page_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."page_sections" TO "service_role";



GRANT ALL ON TABLE "public"."pages" TO "anon";
GRANT ALL ON TABLE "public"."pages" TO "authenticated";
GRANT ALL ON TABLE "public"."pages" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."product_images" TO "anon";
GRANT ALL ON TABLE "public"."product_images" TO "authenticated";
GRANT ALL ON TABLE "public"."product_images" TO "service_role";



GRANT ALL ON TABLE "public"."product_shipping_locations" TO "anon";
GRANT ALL ON TABLE "public"."product_shipping_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."product_shipping_locations" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."request_items" TO "authenticated";
GRANT ALL ON TABLE "public"."request_items" TO "service_role";



GRANT ALL ON TABLE "public"."requests" TO "authenticated";
GRANT ALL ON TABLE "public"."requests" TO "service_role";



GRANT ALL ON TABLE "public"."site_settings" TO "anon";
GRANT ALL ON TABLE "public"."site_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."site_settings" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































