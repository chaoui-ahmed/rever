
-- Atomic credit deduction: only deducts if credits > 0, returns remaining credits
CREATE OR REPLACE FUNCTION public.deduct_credit(user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
DECLARE
  remaining integer;
BEGIN
  UPDATE profiles
  SET credits = credits - 1
  WHERE id = user_id AND credits > 0
  RETURNING credits INTO remaining;

  IF remaining IS NULL THEN
    RETURN -1;
  END IF;

  RETURN remaining;
END;
$$;

-- Refund a credit (used when AI call fails after deduction)
CREATE OR REPLACE FUNCTION public.refund_credit(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE profiles
  SET credits = credits + 1
  WHERE id = user_id;
END;
$$;
