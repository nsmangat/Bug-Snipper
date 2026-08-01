import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  throw new Error(
    'Error: SUPABASE_URL and SUPABASE_SECRET_KEY in the .env must be set)',
  );
}

const supabase = createClient(supabaseUrl, secretKey);

// Example org names
const SEED_ORG_NAMES = ['Acme Inc', 'State University'];

async function main() {
  const { data: existingOrgs, error: existingOrgsErr } = await supabase
    .from('organizations')
    .select('id')
    .in('name', SEED_ORG_NAMES);
  if (existingOrgsErr) throw existingOrgsErr;

  // Including this for idempotent design i.e. can re-seed which will delete existing then re-add, no dupes
  if (existingOrgs.length > 0) {
    const { error: deleteErr } = await supabase
      .from('organizations')
      .delete()
      .in(
        'id',
        existingOrgs.map((org) => org.id),
      );
    if (deleteErr) throw deleteErr;
  }

  // Test 1: just hostname, no path_prefix
  // Common case for an organization that owns its whole domain
  const { data: acme, error: acmeErr } = await supabase
    .from('organizations')
    .insert({ name: 'Acme Inc' })
    .select()
    .single(); // get the object instead of js array
  if (acmeErr) throw acmeErr;

  const { data: acmeWorkspace, error: acmeWorkspaceErr } = await supabase
    .from('workspaces')
    .insert({ organization_id: acme.id, name: 'Main Site' })
    .select()
    .single();
  if (acmeWorkspaceErr) throw acmeWorkspaceErr;

  const { error: acmeDomainErr } = await supabase
    .from('allowlisted_domains')
    .insert({
      workspace_id: acmeWorkspace.id,
      hostname: 'localhost',
      path_prefix: null,
    });
  if (acmeDomainErr) throw acmeDomainErr;

  // Test 2: two workspaces sharing one host, distinguished only by path prefix
  // i.e. LMS scenario where the domain matcher or longest-prefix-wins
  const { data: university, error: uniErr } = await supabase
    .from('organizations')
    .insert({ name: 'State University' })
    .select()
    .single();
  if (uniErr) throw uniErr;

  const { data: cs101, error: cs101Err } = await supabase
    .from('workspaces')
    .insert({ organization_id: university.id, name: 'CS 101' })
    .select()
    .single();
  if (cs101Err) throw cs101Err;

  const { data: cs102, error: cs102Err } = await supabase
    .from('workspaces')
    .insert({ organization_id: university.id, name: 'CS 102' })
    .select()
    .single();
  if (cs102Err) throw cs102Err;

  const { error: courseDomainsErr } = await supabase
    .from('allowlisted_domains')
    .insert([
      {
        workspace_id: cs101.id,
        hostname: 'canvas.example.edu',
        path_prefix: '/courses/101',
      },
      {
        workspace_id: cs102.id,
        hostname: 'canvas.example.edu',
        path_prefix: '/courses/102',
      },
    ]);
  if (courseDomainsErr) throw courseDomainsErr;

  console.log('Seed complete:');
  console.log('Acme Inc / Main Site -> localhost (just hostname)');
  console.log('State University / CS 101 - canvas.example.edu/courses/101');
  console.log('State University / CS 102 - canvas.example.edu/courses/102');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
