CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, credits, plan_name)
  VALUES (NEW.id, NEW.email, 3, 'Free');
  RETURN NEW;
END;
$function$;