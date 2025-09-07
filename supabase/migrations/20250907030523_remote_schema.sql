create type "auth"."oauth_registration_type" as enum ('dynamic', 'manual');


  create table "auth"."oauth_clients" (
    "id" uuid not null,
    "client_id" text not null,
    "client_secret_hash" text not null,
    "registration_type" auth.oauth_registration_type not null,
    "redirect_uris" text not null,
    "grant_types" text not null,
    "client_name" text,
    "client_uri" text,
    "logo_uri" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "deleted_at" timestamp with time zone
      );


CREATE INDEX oauth_clients_client_id_idx ON auth.oauth_clients USING btree (client_id);

CREATE UNIQUE INDEX oauth_clients_client_id_key ON auth.oauth_clients USING btree (client_id);

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);

CREATE UNIQUE INDEX oauth_clients_pkey ON auth.oauth_clients USING btree (id);

alter table "auth"."oauth_clients" add constraint "oauth_clients_pkey" PRIMARY KEY using index "oauth_clients_pkey";

alter table "auth"."oauth_clients" add constraint "oauth_clients_client_id_key" UNIQUE using index "oauth_clients_client_id_key";

alter table "auth"."oauth_clients" add constraint "oauth_clients_client_name_length" CHECK ((char_length(client_name) <= 1024)) not valid;

alter table "auth"."oauth_clients" validate constraint "oauth_clients_client_name_length";

alter table "auth"."oauth_clients" add constraint "oauth_clients_client_uri_length" CHECK ((char_length(client_uri) <= 2048)) not valid;

alter table "auth"."oauth_clients" validate constraint "oauth_clients_client_uri_length";

alter table "auth"."oauth_clients" add constraint "oauth_clients_logo_uri_length" CHECK ((char_length(logo_uri) <= 2048)) not valid;

alter table "auth"."oauth_clients" validate constraint "oauth_clients_logo_uri_length";

grant delete on table "auth"."oauth_clients" to "postgres";

grant insert on table "auth"."oauth_clients" to "postgres";

grant references on table "auth"."oauth_clients" to "postgres";

grant select on table "auth"."oauth_clients" to "postgres";

grant trigger on table "auth"."oauth_clients" to "postgres";

grant truncate on table "auth"."oauth_clients" to "postgres";

grant update on table "auth"."oauth_clients" to "postgres";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

drop policy "Story images are publicly accessible" on "storage"."objects";

drop policy "Users can delete their own story images" on "storage"."objects";

drop policy "Users can upload their own story images" on "storage"."objects";

revoke select on table "storage"."iceberg_namespaces" from "anon";

revoke select on table "storage"."iceberg_namespaces" from "authenticated";

revoke delete on table "storage"."iceberg_namespaces" from "service_role";

revoke insert on table "storage"."iceberg_namespaces" from "service_role";

revoke references on table "storage"."iceberg_namespaces" from "service_role";

revoke select on table "storage"."iceberg_namespaces" from "service_role";

revoke trigger on table "storage"."iceberg_namespaces" from "service_role";

revoke truncate on table "storage"."iceberg_namespaces" from "service_role";

revoke update on table "storage"."iceberg_namespaces" from "service_role";

revoke select on table "storage"."iceberg_tables" from "anon";

revoke select on table "storage"."iceberg_tables" from "authenticated";

revoke delete on table "storage"."iceberg_tables" from "service_role";

revoke insert on table "storage"."iceberg_tables" from "service_role";

revoke references on table "storage"."iceberg_tables" from "service_role";

revoke select on table "storage"."iceberg_tables" from "service_role";

revoke trigger on table "storage"."iceberg_tables" from "service_role";

revoke truncate on table "storage"."iceberg_tables" from "service_role";

revoke update on table "storage"."iceberg_tables" from "service_role";

alter table "storage"."iceberg_namespaces" drop constraint "iceberg_namespaces_bucket_id_fkey";

alter table "storage"."iceberg_tables" drop constraint "iceberg_tables_bucket_id_fkey";

alter table "storage"."iceberg_tables" drop constraint "iceberg_tables_namespace_id_fkey";

alter table "storage"."iceberg_namespaces" drop constraint "iceberg_namespaces_pkey";

alter table "storage"."iceberg_tables" drop constraint "iceberg_tables_pkey";

drop index if exists "storage"."iceberg_namespaces_pkey";

drop index if exists "storage"."iceberg_tables_pkey";

drop index if exists "storage"."idx_iceberg_namespaces_bucket_id";

drop index if exists "storage"."idx_iceberg_tables_namespace_id";

drop table "storage"."iceberg_namespaces";

drop table "storage"."iceberg_tables";


  create policy "Anyone can upload an avatar."
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'avatars'::text));



  create policy "Avatar images are publicly accessible."
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



