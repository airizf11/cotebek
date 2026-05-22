ALTER TYPE "public"."order_status" ADD VALUE 'PENDING' BEFORE 'RECEIVED';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'CANCELLED';--> statement-breakpoint
CREATE TABLE "doc_counters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"prefix" varchar(20) NOT NULL,
	"date" varchar(10) NOT NULL,
	"seq" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "doc_counters" ADD CONSTRAINT "doc_counters_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_doc_counter" ON "doc_counters" USING btree ("app_id","prefix","date");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_unique" UNIQUE("user_id");