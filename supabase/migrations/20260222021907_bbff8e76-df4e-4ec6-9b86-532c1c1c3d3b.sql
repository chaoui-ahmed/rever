
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles
  SET credits = COALESCE(credits, 0) + p_amount
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_credits_by_email(p_email text, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles
  SET credits = COALESCE(credits, 0) + p_amount
  WHERE email = p_email;
END;
$$;
