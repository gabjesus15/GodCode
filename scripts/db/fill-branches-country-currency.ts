// scripts/db/fill-branches-country-currency.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // 1. Get all companies with country/currency
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('id,country,currency');
  if (companyError) throw companyError;

  // 2. Get all branches
  const { data: branches, error: branchError } = await supabase
    .from('branches')
    .select('id,company_id,country,currency');
  if (branchError) throw branchError;

  // 3. Fill missing country/currency from company
  const updates = [];
  for (const branch of branches) {
    const company = companies.find((c) => c.id === branch.company_id);
    if (!company) continue;
    if (!branch.country || !branch.currency) {
      updates.push({
        id: branch.id,
        country: branch.country || company.country || null,
        currency: branch.currency || company.currency || null,
      });
    }
  }

  // 4. Batch update
  for (const update of updates) {
    await supabase.from('branches').update({
      country: update.country,
      currency: update.currency,
    }).eq('id', update.id);
    console.log('Updated branch', update.id, update.country, update.currency);
  }
  console.log('Done. Updated', updates.length, 'branches.');
}

main().catch(console.error);