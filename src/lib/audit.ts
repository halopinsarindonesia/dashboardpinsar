import { supabase } from '@/integrations/supabase/client';

export async function logAudit(params: {
  action: 'create' | 'edit' | 'delete';
  module: string;
  userId?: string | null;
  userName?: string | null;
  oldValue?: any;
  newValue?: any;
}) {
  await supabase.from('audit_logs').insert({
    action: params.action,
    module: params.module,
    user_id: params.userId ?? null,
    user_name: params.userName ?? null,
    old_value: params.oldValue ?? null,
    new_value: params.newValue ?? null,
  });
}
