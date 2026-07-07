ALTER TABLE "promos" ADD COLUMN "max_usage_per_customer" integer;--> statement-breakpoint
CREATE INDEX "promo_usages_promo_customer_idx" ON "promo_usages" USING btree ("promo_id","customer_id");