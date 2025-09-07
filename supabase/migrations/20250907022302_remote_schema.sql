drop trigger if exists "update_stories_updated_at" on "public"."stories";

drop policy "Users can delete their own stories" on "public"."stories";

drop policy "Users can insert their own stories" on "public"."stories";

drop policy "Users can view stories from users they follow or have chatted w" on "public"."stories";

revoke delete on table "public"."stories" from "anon";

revoke insert on table "public"."stories" from "anon";

revoke references on table "public"."stories" from "anon";

revoke select on table "public"."stories" from "anon";

revoke trigger on table "public"."stories" from "anon";

revoke truncate on table "public"."stories" from "anon";

revoke update on table "public"."stories" from "anon";

revoke delete on table "public"."stories" from "authenticated";

revoke insert on table "public"."stories" from "authenticated";

revoke references on table "public"."stories" from "authenticated";

revoke select on table "public"."stories" from "authenticated";

revoke trigger on table "public"."stories" from "authenticated";

revoke truncate on table "public"."stories" from "authenticated";

revoke update on table "public"."stories" from "authenticated";

revoke delete on table "public"."stories" from "service_role";

revoke insert on table "public"."stories" from "service_role";

revoke references on table "public"."stories" from "service_role";

revoke select on table "public"."stories" from "service_role";

revoke trigger on table "public"."stories" from "service_role";

revoke truncate on table "public"."stories" from "service_role";

revoke update on table "public"."stories" from "service_role";

alter table "public"."stories" drop constraint "stories_user_id_fkey";

drop function if exists "public"."delete_expired_stories"();

drop function if exists "public"."update_updated_at_column"();

alter table "public"."stories" drop constraint "stories_pkey";

drop index if exists "public"."idx_stories_created_at";

drop index if exists "public"."idx_stories_expires_at";

drop index if exists "public"."idx_stories_user_id";

drop index if exists "public"."stories_pkey";

drop table "public"."stories";


