CREATE TYPE "public"."payment_status" AS ENUM('PAID', 'UNPAID');--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'MARK_ORDER_PAID' BEFORE 'CREATE_ITEM';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_status" "payment_status" DEFAULT 'PAID' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp with time zone;