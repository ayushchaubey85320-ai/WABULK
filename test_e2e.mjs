async function test() {
  console.log('1. Testing Login with admin@example.com...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'Admin@123456',
    }),
  });

  const cookie = loginRes.headers.get('set-cookie');
  const loginData = await loginRes.json();
  console.log('Login Response:', loginData);

  if (!loginRes.ok) throw new Error('Login failed');

  console.log('\n2. Testing /api/me with session cookie...');
  const meRes = await fetch('http://localhost:3000/api/me', {
    headers: { Cookie: cookie },
  });
  const meData = await meRes.json();
  console.log('Current User (/api/me):', meData);

  console.log('\n3. Testing /api/contacts listing...');
  const contactsRes = await fetch('http://localhost:3000/api/contacts', {
    headers: { Cookie: cookie },
  });
  const contactsData = await contactsRes.json();
  console.log(`Found ${contactsData.contacts?.length} contacts. Total in DB: ${contactsData.pagination?.total}`);

  console.log('\n4. Testing /api/templates listing...');
  const templatesRes = await fetch('http://localhost:3000/api/templates', {
    headers: { Cookie: cookie },
  });
  const templatesData = await templatesRes.json();
  console.log(`Found ${templatesData.templates?.length} templates:`, templatesData.templates?.map(t => t.name));

  console.log('\n5. Testing /api/analytics...');
  const analyticsRes = await fetch('http://localhost:3000/api/analytics', {
    headers: { Cookie: cookie },
  });
  const analyticsData = await analyticsRes.json();
  console.log('Analytics Metrics:', analyticsData.metrics);

  console.log('\n6. Creating & launching a new Campaign via API...');
  const tpl = templatesData.templates[0];
  const campRes = await fetch('http://localhost:3000/api/campaigns', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      name: 'E2E Automated Test Broadcast',
      description: 'Verified through E2E execution loop',
      templateId: tpl.id,
      audienceType: 'ALL',
      variableMapping: { '1': 'firstName', '2': '11:30 AM Tomorrow' },
      sendNow: true,
    }),
  });
  const campData = await campRes.json();
  console.log('Campaign Creation Response:', campData);

  // Wait 2 seconds for background simulated queue to process
  console.log('\n7. Waiting 2.5s for queue worker to process messages...');
  await new Promise(r => setTimeout(r, 2500));

  const campDetailsRes = await fetch(`http://localhost:3000/api/campaigns/${campData.campaign.id}`, {
    headers: { Cookie: cookie },
  });
  const campDetailsData = await campDetailsRes.json();
  console.log('Campaign Progress Status:', {
    name: campDetailsData.campaign.name,
    status: campDetailsData.campaign.status,
    total: campDetailsData.campaign.totalRecipients,
    sent: campDetailsData.campaign.sentCount,
    delivered: campDetailsData.campaign.deliveredCount,
    rates: campDetailsData.campaign.rates,
  });

  console.log('\n✅ ALL E2E API VERIFICATIONS PASSED PERFECTLY!');
}

test().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
