ALTER TYPE "public"."audit_action" ADD VALUE 'CREATE_TEAM_MEMBER' BEFORE 'CREATE_TRANSACTION';--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" varchar(20),
	"user_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "transactions_items" RENAME TO "transaction_items";--> statement-breakpoint
ALTER TABLE "transaction_items" DROP CONSTRAINT "transactions_items_transaction_id_transactions_id_fk";
--> statement-breakpoint
ALTER TABLE "transaction_items" DROP CONSTRAINT "transactions_items_raw_material_id_raw_materials_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "team_member_id" uuid;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_team_member_id_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_raw_material_id_raw_materials_id_fk" FOREIGN KEY ("raw_material_id") REFERENCES "public"."raw_materials"("id") ON DELETE no action ON UPDATE no action;