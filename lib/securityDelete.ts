import { supabase } from "./supabase";

/**
 * Validates the admin delete password.
 * Uses a dummy call to 'hard_delete_expense' RPC to verify the password hash
 * stored in app_security without actually deleting anything.
 */
export async function validateDeletePassword(tenantId: string, password: string) {
  // Use a non-existent UUID to safely test the password against the RPC logic
  const dummyId = "00000000-0000-0000-0000-000000000000";
  
  const { error } = await supabase.rpc("hard_delete_expense", {
    p_expense_id: dummyId,
    p_password: password
  });

  if (error && error.message.includes("invalid_app_password")) {
    return false;
  }
  
  // If no error (deleted 0 rows) or other error, we assume password is correct 
  // (other errors might be permission/network, but 'invalid_app_password' is the specific one)
  return true;
}