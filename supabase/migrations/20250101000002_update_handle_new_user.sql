-- Update handle_new_user function to include username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, full_name, username, avatar_url, bio)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username' OR new.email->>'email' OR 'user_' || substring(new.id::text, 1, 8),
    new.raw_user_meta_data->>'avatar_url',
    null
  );
  return new;
end;
$function$;
