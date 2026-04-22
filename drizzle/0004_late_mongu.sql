CREATE TYPE "public"."promo_scope" AS ENUM('ALL', 'SPECIFIC_ITEMS', 'SPECIFIC_CUSTOMERS');--> statement-breakpoint
CREATE TYPE "public"."promo_type" AS ENUM('PERCENTAGE', 'NOMINAL');--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'UPDATE_ORDER_STATUS' BEFORE 'CREATE_ITEM';--> statement-breakpoint
CREATE TABLE "promo_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"promo_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid,
	"discount_amount" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" varchar(50),
	"type" "promo_type" NOT NULL,
	"value" numeric(15, 2) NOT NULL,
	"min_order" numeric(15, 2),
	"max_discount" numeric(15, 2),
	"scope" "promo_scope" DEFAULT 'ALL' NOT NULL,
	"item_ids" jsonb,
	"customer_ids" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'RECEIVED'::"public"."order_status";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."order_status" USING "status"::"public"."order_status";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "loyalty_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promo_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_amount" numeric(15, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "final_amount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_promo_id_promos_id_fk" FOREIGN KEY ("promo_id") REFERENCES "public"."promos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promos" ADD CONSTRAINT "promos_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_promo_id_promos_id_fk" FOREIGN KEY ("promo_id") REFERENCES "public"."promos"("id") ON DELETE no action ON UPDATE no action;