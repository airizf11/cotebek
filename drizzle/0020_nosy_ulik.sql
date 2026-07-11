CREATE TYPE "public"."item_type" AS ENUM('SERVICE', 'GOOD');--> statement-breakpoint
CREATE TABLE "raw_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"name" text NOT NULL,
	"unit" varchar(20),
	"category" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"raw_material_id" uuid,
	"item_name" text NOT NULL,
	"qty" numeric(10, 2) NOT NULL,
	"unit" varchar(20),
	"price" numeric(15, 2) NOT NULL,
	"subtotal" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "type" "item_type" DEFAULT 'SERVICE' NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "unit" varchar(20);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_status" "payment_status" DEFAULT 'PAID' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "due_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "raw_materials" ADD CONSTRAINT "raw_materials_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions_items" ADD CONSTRAINT "transactions_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions_items" ADD CONSTRAINT "transactions_items_raw_material_id_raw_materials_id_fk" FOREIGN KEY ("raw_material_id") REFERENCES "public"."raw_materials"("id") ON DELETE no action ON UPDATE no action;