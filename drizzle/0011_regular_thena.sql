ALTER TABLE "customers" DROP CONSTRAINT "customers_user_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "customers_user_app_unique" ON "customers" USING btree ("app_id","user_id");