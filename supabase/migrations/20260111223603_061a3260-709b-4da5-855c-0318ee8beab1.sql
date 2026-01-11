-- Create atomic credit deduction function
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, new_balance NUMERIC, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_credits NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Lock the row and check/update atomically
  UPDATE profiles
  SET credits = credits - p_amount
  WHERE user_id = p_user_id AND credits >= p_amount
  RETURNING credits INTO v_new_balance;
  
  IF NOT FOUND THEN
    SELECT credits INTO v_current_credits FROM profiles WHERE user_id = p_user_id;
    RETURN QUERY SELECT FALSE, v_current_credits, 'Insufficient credits'::TEXT;
    RETURN;
  END IF;
  
  -- Log the transaction
  INSERT INTO credit_transactions (user_id, amount, balance_after, transaction_type, description, reference_id)
  VALUES (p_user_id, -p_amount, v_new_balance, p_type, p_description, p_reference_id);
  
  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$;

-- Create atomic credit addition function (for refunds/purchases)
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_stripe_payment_intent_id TEXT DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, new_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  -- Atomic update with row locking
  UPDATE profiles
  SET credits = credits + p_amount
  WHERE user_id = p_user_id
  RETURNING credits INTO v_new_balance;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Log the transaction
  INSERT INTO credit_transactions (user_id, amount, balance_after, transaction_type, description, reference_id, stripe_payment_intent_id)
  VALUES (p_user_id, p_amount, v_new_balance, p_type, p_description, p_reference_id, p_stripe_payment_intent_id);
  
  RETURN QUERY SELECT TRUE, v_new_balance;
END;
$$;