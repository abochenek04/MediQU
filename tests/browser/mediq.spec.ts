import { test,expect,type Page } from '@playwright/test';
import { readFileSync,readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
const password='Browser-test-password-2026';
async function dismissTour(page:Page){const button=page.getByRole('button',{name:'Skip tour',exact:true}).first();if(await button.isVisible())await button.click();}
async function visit(page:Page,path='/find'){await page.goto(path);await expect(page.getByRole('main')).toBeVisible();await dismissTour(page);}
function otp(email:string){return readdirSync('.data/e2e/mail').map(n=>JSON.parse(readFileSync(`.data/e2e/mail/${n}`,'utf8'))).filter(m=>m.to===email).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0]?.otp;}
async function signup(page:Page,email:string){
 await visit(page,'/signup');await page.getByLabel('First name',{exact:true}).fill('Browser');await page.getByLabel('Last name',{exact:true}).fill('Tester');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Create a free account',exact:true}).click();
 await expect(page).toHaveURL(/\/verify/);await expect.poll(()=>otp(email)).toBeTruthy();await page.getByLabel('Verification code',{exact:true}).fill(otp(email));await page.getByRole('button',{name:'Verify your email',exact:true}).click();await expect(page.getByText('Email verified. You can now sign in.',{exact:true})).toBeVisible();await login(page,email);
}
async function login(page:Page,email:string){await visit(page,'/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/\/find/);await expect(page.getByRole('button',{name:'Sign out',exact:true})).toBeVisible();await dismissTour(page);}
function clearTestLimits(){const db=new DatabaseSync('.data/e2e/mediq.sqlite');db.exec('DELETE FROM rate_limits');db.close();}
test.beforeEach(()=>clearTestLimits());

test('guest navigation, search, strict filters, map, profile, chart, reporting and temporary saves',async({page,context})=>{
 await visit(page,'/');await page.getByRole('button',{name:'Explore as a guest'}).click();await dismissTour(page);
 const search=page.getByRole('textbox',{name:'Search for care',exact:true});await search.fill('Brightwel urgent car');await expect(page.locator('.clinic-card')).toHaveCount(1);
 await page.getByRole('button',{name:'Map',exact:true}).click();await expect(page.locator('.map-side-list')).toContainText('Brightwell');
 await page.getByRole('button',{name:'List',exact:true}).click();await page.getByRole('link',{name:'View clinic',exact:true}).click();await expect(page.getByRole('heading',{name:'Brightwell Urgent Care',exact:true})).toBeVisible();
 await expect(page.locator('.history-chart')).toBeVisible();await page.locator('.chart-controls').getByRole('button').last().click();await expect(page.locator('.provider-card').first()).toBeVisible();
 await page.getByRole('button',{name:'Save clinic',exact:true}).click();await page.getByRole('button',{name:'Plan this visit',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Save visit & calculate plan'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.locator('.desktop-nav').getByRole('link',{name:'Appointments',exact:true}).click();await expect(page.locator('.appointment-list')).toContainText('Brightwell');
 await page.reload();await dismissTour(page);await expect(page.locator('.appointment-list')).toHaveCount(0);await expect(page.locator('.saved-clinic-grid')).toHaveCount(0);
 const tab=await context.newPage();await visit(tab,'/saved');await expect(tab.locator('.appointment-list')).toHaveCount(0);await tab.close();
 await visit(page,'/find?q=Brightwell');await page.getByRole('button',{name:'Report a wait',exact:true}).click();await page.getByLabel('Minutes waiting so far').fill('27');await page.getByRole('button',{name:'Submit report',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Report accepted');await page.getByRole('button',{name:'Back to Find Care'}).click();await visit(page,'/clinic/brightwell-urgent-care');await expect(page.locator('.report-feed')).toContainText('27');
});

test('real signup, private settings, second device persistence and multi-tab logout',async({page,browser,context})=>{
 const email=`browser-${Date.now()}@example.test`;await signup(page,email);
 const saveSettings=async()=>{const response=page.waitForResponse(r=>r.url().endsWith('/api/profile')&&r.request().method()==='PUT');await page.getByRole('button',{name:'Save settings',exact:true}).click();expect((await response).ok()).toBeTruthy();await expect(page.getByRole('button',{name:'Save settings',exact:true})).toBeEnabled();await expect(page.getByText('Settings saved.',{exact:true}).last()).toBeVisible();};
 await visit(page,'/clinic/brightwell-urgent-care');await page.getByRole('button',{name:'Save clinic',exact:true}).click();
 await page.getByRole('button',{name:'Plan this visit',exact:true}).click();await page.getByRole('button',{name:'Save visit & calculate plan'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await visit(page,'/settings');await expect(page.getByLabel('Weight (lb)',{exact:true})).toHaveValue('');await expect(page.getByLabel('Gender',{exact:true})).toHaveCount(0);await page.getByLabel('Weight (lb)',{exact:true}).selectOption('155');await page.getByLabel('Height (feet and inches)',{exact:true}).selectOption({label:'5 ft 10 in'});await saveSettings();await page.reload();await expect(page.getByLabel('Weight (lb)',{exact:true})).toHaveValue('155');await expect(page.getByLabel('Height (feet and inches)',{exact:true})).toHaveValue('70');
 const db=new DatabaseSync('.data/e2e/mediq.sqlite');
 const stored=db.prepare('SELECT weight_lb, height_inches FROM profiles WHERE user_id=(SELECT id FROM user WHERE email=?)').get(email)!;
 expect(stored.weight_lb).toBe(155);expect(stored.height_inches).toBe(70);
 await page.getByRole('button',{name:'Clear optional fields',exact:true}).click();await expect(page.getByLabel('Weight (lb)',{exact:true})).toHaveValue('');await expect(page.getByLabel('Height (feet and inches)',{exact:true})).toHaveValue('');
 await saveSettings();await page.reload();await expect(page.getByLabel('Weight (lb)',{exact:true})).toHaveValue('');await expect(page.getByLabel('Height (feet and inches)',{exact:true})).toHaveValue('');
 await page.getByLabel('Weight (lb)',{exact:true}).selectOption('155');await saveSettings();db.close();
 const second=await browser.newContext();const device=await second.newPage();await login(device,email);await visit(device,'/saved');await expect(device.locator('.saved-clinic-grid')).toContainText('Brightwell');await expect(device.locator('.appointment-list')).toContainText('Brightwell');
 const sibling=await context.newPage();await visit(sibling,'/settings');await expect(sibling.getByLabel('Weight (lb)',{exact:true})).toHaveValue('155');await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(sibling.getByText('Sign in to manage your account.',{exact:true})).toBeVisible();await expect(sibling.getByLabel('Weight (lb)',{exact:true})).toHaveCount(0);
 await login(page,email);await visit(page,'/settings');await page.getByRole('button',{name:'Delete account',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('dialog').getByLabel('Current password',{exact:true}).fill(password);await page.getByLabel('Type DELETE').fill('DELETE');await page.getByRole('button',{name:'Permanently delete account',exact:true}).click();await expect(page).toHaveURL(/\/find/);await device.reload();await expect(device.getByRole('link',{name:'Sign in / Sign up'})).toBeVisible();await second.close();
});

test('seven languages keep clinic filters independent and Arabic RTL',async({page})=>{
 await visit(page);const language=page.locator('.language-control select');
 const expected:{[key:string]:string}={en:'Know before you go.',es:'Infórmate antes de ir.',zh:'出发前，心中有数。',ar:'اعرف قبل أن تذهب.',pl:'Wiedz, zanim wyjdziesz.',gu:'જતાં પહેલાં જાણો.',hi:'जाने से पहले जानें।'};
 for(const code of ['en','es','zh','ar','pl','gu','hi']){await language.selectOption(code);await expect(page.locator('html')).toHaveAttribute('lang',code);await expect(page.locator('html')).toHaveAttribute('dir',code==='ar'?'rtl':'ltr');await expect(page.locator('.find-hero h1')).toHaveText(expected[code]);await expect(page.locator('.clinic-card')).toHaveCount(6);}
 await language.selectOption('pl');await page.locator('.quick-filters button').nth(3).click();await expect(page.locator('.clinic-card')).toHaveCount(1);await expect(page.locator('.filter-panel select').nth(2)).toHaveValue('Pediatrics');
 await language.selectOption('en');await page.getByRole('button',{name:'Clear all',exact:true}).click();
 for(const spoken of ['Polish','Gujarati','Hindi']){await page.locator('.filter-panel select').nth(3).selectOption(spoken);await expect(page.locator('.clinic-card').first()).toBeVisible();await expect(page.locator('.clinic-card')).not.toHaveCount(6);}
 await page.reload();await dismissTour(page);await expect(language).toHaveValue('en');
 await page.evaluate(()=>{localStorage.setItem('mediq-saved-clinics','["brightwell-urgent-care"]');localStorage.setItem('unrelated-key','keep');});await visit(page,'/saved');await expect(page.locator('.saved-clinic-grid')).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('unrelated-key'))).toBe('keep');
});

test('search intent, explicit sorts, stale responses and genuine error retry',async({page})=>{
 await visit(page);const search=page.getByRole('textbox',{name:'Search for care',exact:true});
 await search.fill('head pain');await expect(page.locator('.clinic-card')).toHaveCount(2);
 await page.getByLabel('Sort results').selectOption('shortest');const durations=await page.locator('.clinic-card .estimate-number').allTextContents();expect(durations).toHaveLength(2);expect(durations.map(s=>parseInt(s))).toEqual(durations.map(s=>parseInt(s)).sort((a,b)=>a-b));
 await search.fill('unsupported xzqv');await expect(page.getByText('No clinics match everything yet',{exact:true})).toBeVisible();
 let delayed=false;await page.route('**/api/clinics?**',async route=>{if(decodeURIComponent(route.request().url()).includes('Brightwell')){delayed=true;await new Promise(r=>setTimeout(r,500));}await route.continue();});
 await search.fill('Brightwell');await expect.poll(()=>delayed).toBe(true);await search.fill('Juniper');await expect(page.locator('.clinic-card')).toHaveCount(1);await expect(page.locator('.clinic-card')).toContainText('Juniper');await page.waitForTimeout(650);await expect(page.locator('.clinic-card')).toContainText('Juniper');
 await page.unroute('**/api/clinics?**');await page.route('**/api/clinics?**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"code":"SERVICE_UNAVAILABLE"}'}));await search.fill('fever');await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible();await page.unroute('**/api/clinics?**');await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.locator('.clinic-card')).toHaveCount(2);
});

test('admin denied to normal accounts; trusted bootstrap enables directory, metrics and persistent checklist',async({page})=>{
 const email=`admin-${Date.now()}@example.test`;await signup(page,email);await visit(page,'/admin');await expect(page.getByRole('heading',{name:'Access restricted'})).toBeVisible();expect((await page.request.get('/api/admin/accounts')).status()).toBe(403);
 const db=new DatabaseSync('.data/e2e/mediq.sqlite');const user=db.prepare('SELECT id FROM user WHERE email=?').get(email)!;db.prepare('INSERT INTO administrators VALUES (?,?)').run(user.id,Date.now());db.close();
 await page.reload();await expect(page.locator('.admin-tabs')).toBeVisible();await page.getByRole('button',{name:'Accounts',exact:true}).click();await page.getByLabel('Search accounts').fill(email);await expect(page.locator('tbody')).toContainText(email);await expect(page.locator('tbody')).not.toContainText(password);
 await page.getByRole('button',{name:'Launch checklist',exact:true}).click();const task=page.locator('form').filter({has:page.getByRole('heading',{name:'Verify the email sender',exact:true})});await task.getByLabel('Status').selectOption('doing');await task.getByLabel('Notes').fill('Browser verified persistent change');await task.getByRole('button',{name:'Save changes'}).click();await page.reload();await page.getByRole('button',{name:'Launch checklist',exact:true}).click();
 await expect(page.locator('textarea').filter({hasText:'Browser verified persistent change'})).toHaveCount(1);
});

test('direct routes, responsive layout, translated forms, keyboard and dialog focus',async({page})=>{
 for(const path of ['/find','/saved','/report','/know','/contact','/login','/signup','/verify','/reset-password','/settings','/clinic/brightwell-urgent-care','/clinic/missing','/not-found']){await visit(page,path);await expect(page.locator('main')).toBeVisible();await expect(page.locator('h1')).toBeVisible();}
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});await visit(page,'/find');await expect(page.locator('.clinic-card').first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await visit(page,'/signup');await page.locator('.language-control select').selectOption('gu');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await expect(page.locator('h1')).toHaveText('મફત ખાતું બનાવો');await page.screenshot({path:`test-results/signup-${width}.png`,fullPage:true});}
 await page.setViewportSize({width:390,height:844});await visit(page,'/clinic/brightwell-urgent-care');const opener=page.getByRole('button',{name:'Plan this visit',exact:true});await opener.click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.activeElement?.closest('dialog')!==null)).toBe(true);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(opener).toBeFocused();
});

test('delayed account refresh cannot undo a save or restore private data after logout; account switching stays isolated',async({page})=>{
 const email=`race-${Date.now()}@example.test`;await signup(page,email);
 await visit(page,'/clinic/brightwell-urgent-care');
 let release:(()=>void)|undefined;let captured=false;
 await page.route('**/api/me',async route=>{if(captured){await route.continue();return;}captured=true;const response=await route.fetch();await new Promise<void>(resolve=>{release=resolve;});await route.fulfill({response});});
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(()=>!!release).toBe(true);
 await page.getByRole('button',{name:'Save clinic',exact:true}).click();await expect(page.getByRole('button',{name:'Saved',exact:true})).toBeVisible();release!();await page.waitForTimeout(150);await expect(page.getByRole('button',{name:'Saved',exact:true})).toBeVisible();
 await page.unroute('**/api/me');captured=false;release=undefined;
 await page.route('**/api/me',async route=>{if(captured){await route.continue();return;}captured=true;const response=await route.fetch();await new Promise<void>(resolve=>{release=resolve;});await route.fulfill({response});});
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(()=>!!release).toBe(true);await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('link',{name:'Sign in / Sign up'})).toBeVisible();release!();await page.waitForTimeout(150);await expect(page.getByRole('button',{name:'Save clinic',exact:true})).toBeVisible();await page.unroute('**/api/me');
 clearTestLimits();await signup(page,`other-${Date.now()}@example.test`);await visit(page,'/saved');await expect(page.locator('.saved-clinic-grid')).toHaveCount(0);await expect(page.locator('.appointment-list')).toHaveCount(0);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await login(page,email);await visit(page,'/saved');await expect(page.locator('.saved-clinic-grid')).toContainText('Brightwell');
});

test('device location stays hidden until opt-in and city lookup, refreshes and clears without a default',async({page,context})=>{
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation({latitude:35.994,longitude:-78.899});
 await page.addInitScript(()=>{
  const original=navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  (window as unknown as {locationOptions:PositionOptions[]}).locationOptions=[];
  navigator.geolocation.getCurrentPosition=(success,error,options)=>{
   (window as unknown as {locationOptions:PositionOptions[]}).locationOptions.push(options||{});
   return original(success,error,options);
  };
 });
 const directoryRequests:string[]=[];const externalRequests:string[]=[];let releaseLookup:(()=>void)|undefined;
 page.on('request',request=>{if(!new URL(request.url()).hostname.match(/^(localhost|127\.0\.0\.1)$/))externalRequests.push(request.url());});
 await page.route('**/data/cities.json',async route=>{
  directoryRequests.push(route.request().url());
  if(directoryRequests.length===1)await new Promise<void>(resolve=>{releaseLookup=resolve;});
  return route.continue();
 });
 await visit(page);
 await expect(page.locator('.find-hero .demo-badge')).toHaveCount(0);await expect(page.locator('.search-location span')).toHaveCount(0);await expect(page.locator('.find-hero')).not.toContainText('Durham');await expect(page.getByRole('option',{name:'Nearest first',exact:true})).toHaveJSProperty('disabled',true);await expect(page.getByLabel('Within',{exact:true})).toBeDisabled();
 expect(directoryRequests).toHaveLength(0);
 expect(await page.evaluate(()=>(window as unknown as {locationOptions:PositionOptions[]}).locationOptions)).toHaveLength(0);
 await page.getByRole('button',{name:'Find my location',exact:true}).click();
 await expect.poll(()=>!!releaseLookup).toBe(true);await expect(page.locator('.find-hero .demo-badge')).toHaveCount(0);await expect(page.locator('.find-hero')).not.toContainText('35.99');await expect(page.locator('.find-hero')).not.toContainText('-78.90');releaseLookup!();
 await expect(page.locator('.search-location')).toContainText('Near Durham, NC');
 await expect(page.locator('.find-hero .demo-badge')).toHaveText('Durham, NC');
 await expect(page.locator('.clinic-card')).toHaveCount(6);
 await context.setGeolocation({latitude:41.8781,longitude:-87.6298});
 await page.getByRole('button',{name:'Find my location',exact:true}).click();
 await expect(page.locator('.search-location')).toContainText('Near Chicago, IL');
 await expect(page.locator('#clinic-results .eyebrow')).toContainText('Care near Chicago, IL');
 await expect(page.locator('.clinic-card')).toHaveCount(0);
 expect(directoryRequests).toEqual(['http://localhost:4173/data/cities.json']);expect(externalRequests).toEqual([]);
 const options=await page.evaluate(()=>(window as unknown as {locationOptions:PositionOptions[]}).locationOptions);
 expect(options).toHaveLength(2);expect(options.every(o=>o.maximumAge===0&&o.enableHighAccuracy===false)).toBe(true);
 await page.getByRole('button',{name:'Clear location',exact:true}).click();
 await expect(page.locator('.find-hero .demo-badge')).toHaveCount(0);await expect(page.locator('.search-location span')).toHaveCount(0);await expect(page.locator('.find-hero')).not.toContainText('Durham');await expect(page.getByLabel('Within',{exact:true})).toBeDisabled();
 await expect(page.locator('.clinic-card')).toHaveCount(6);
});

test('denied permission and lookup failures never show a guessed city or coordinates',async({page,context})=>{
 await context.grantPermissions([]);
 let lookups=0;
 await page.route('**/data/cities.json',route=>{lookups++;return route.fulfill({status:503,json:{error:'Unavailable'}});});
 await visit(page);
 await page.getByRole('button',{name:'Find my location',exact:true}).click();
 await expect(page.locator('.location-status[role="status"]')).toContainText('Location permission was denied');
 expect(lookups).toBe(0);
 await expect(page.locator('.clinic-card')).toHaveCount(6);
 await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:41.8781,longitude:-87.6298});
 await page.getByRole('button',{name:'Find my location',exact:true}).click();
 await expect(page.locator('.location-status[role="status"]')).toContainText('City name is unavailable');
 await expect(page.locator('.find-hero .demo-badge')).toHaveCount(0);await expect(page.locator('.search-location span')).toHaveCount(0);await expect(page.locator('main')).not.toContainText('41.88');await expect(page.locator('main')).not.toContainText('-87.63');
 await expect(page.locator('.clinic-card')).toHaveCount(0);
 expect(lookups).toBe(1);
 await page.evaluate(()=>{navigator.geolocation.getCurrentPosition=(_success,error)=>error?.({code:3,message:'Timeout'} as GeolocationPositionError);});
 await page.getByRole('button',{name:'Find my location',exact:true}).click();await expect(page.locator('.location-status[role="status"]')).toContainText('Location request timed out');await expect(page.locator('.find-hero')).not.toContainText('Durham');await expect(page.locator('.search-location span')).toHaveCount(0);await expect(page.locator('.clinic-card')).toHaveCount(6);
});

test('tour appears once per browser, stays dismissed on reload and can be replayed manually',async({page,context})=>{
 await page.goto('/find');
 const tour=page.getByRole('complementary',{name:'Product tour',exact:true});
 await expect(tour).toBeVisible();
 // Reload without finishing: merely showing the introduction counts as the first visit.
 await page.reload();await expect(page.locator('.clinic-card')).toHaveCount(6);await expect(tour).toHaveCount(0);
 const tab=await context.newPage();await tab.goto('/find');await expect(tab.locator('.clinic-card')).toHaveCount(6);await expect(tab.locator('.product-tour')).toHaveCount(0);await tab.close();
 await page.goto('/know');await page.getByRole('button',{name:'Product tour',exact:true}).click();
 await expect(page).toHaveURL(/\/find/);await expect(tour).toBeVisible();
 await tour.getByRole('button',{name:'Skip tour',exact:true}).first().click();
 await page.reload();await expect(page.locator('.clinic-card')).toHaveCount(6);await expect(tour).toHaveCount(0);
 await page.getByRole('button',{name:'Product tour',exact:true}).click();await expect(tour).toBeVisible();
 for(let step=0;step<5;step++)await tour.getByRole('button',{name:'Next',exact:true}).click();
 await tour.getByRole('button',{name:'Done',exact:true}).click();
 await page.reload();await expect(page.locator('.clinic-card')).toHaveCount(6);await expect(tour).toHaveCount(0);
 // Signing in and out must not reset a device-level introduction preference.
 await signup(page,`tour-${Date.now()}@example.test`);await expect(tour).toHaveCount(0);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.reload();
 await expect(page.locator('.clinic-card')).toHaveCount(6);await expect(tour).toHaveCount(0);
});

test('3.1.1 renders empty directory, saved care and report choices without prototype records',async({page})=>{
 await page.route('**/api/clinics?**',route=>route.fulfill({json:[]}));
 await page.route('**/api/clinics/brightwell-urgent-care',route=>route.fulfill({status:404,json:{code:'NOT_FOUND'}}));
 await page.goto('/');await expect(page.locator('.preview-card')).toContainText('Clinics will appear here');
 await expect(page.locator('.preview-card')).not.toContainText('54');await expect(page.locator('.preview-card')).not.toContainText('91%');
 await visit(page,'/find');await expect(page.getByText('No clinics are available yet',{exact:true})).toBeVisible();
 await expect(page.locator('.clinic-card')).toHaveCount(0);await expect(page.locator('.upcoming-visit-card')).toHaveCount(0);
 await visit(page,'/saved');await expect(page.locator('.saved-empty')).toBeVisible();await expect(page.locator('.appointment-list')).toHaveCount(0);
 await visit(page,'/report?clinic=brightwell-urgent-care');await expect(page.getByText('No clinics are available for reporting yet.')).toBeVisible();
 await expect(page.getByRole('button',{name:'Submit report',exact:true})).toBeDisabled();
 await visit(page,'/know');await expect(page.locator('.about-estimate')).not.toContainText('54');
 await visit(page,'/clinic/brightwell-urgent-care');await expect(page.getByRole('heading',{name:'We couldn’t find that clinic',exact:true})).toBeVisible();
});

test('3.1.1 real clinics can render before timing evidence exists and old unapproved responses stay hidden',async({page})=>{
 const clinic=(await (await page.request.get('/api/clinics/brightwell-urgent-care')).json());
 clinic.name='Approved directory clinic';clinic.estimates=[];clinic.historicalWaits=[];clinic.reviews=[];clinic.providers=[];delete clinic.rating;
 clinic.reliability={score:0,level:'low',factors:[],summary:'Not enough recent reports for an estimate.'};
 await page.route('**/api/clinics?**',route=>route.fulfill({json:[clinic]}));
 await page.route('**/api/clinics/brightwell-urgent-care',route=>route.fulfill({json:clinic}));
 await visit(page,'/find');await expect(page.locator('.clinic-card')).toHaveCount(1);await expect(page.locator('.estimate-number')).toHaveText('—');
 await page.getByRole('link',{name:'View clinic',exact:true}).click();await expect(page.locator('.live-number-panel strong')).toHaveText('—');
 await expect(page.getByText('History is not available yet.')).toBeVisible();
 await page.getByRole('button',{name:'Plan this visit',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Estimate unavailable');
 await page.keyboard.press('Escape');
 delete clinic.directorySource;
 await visit(page,'/find');await expect(page.locator('.clinic-card')).toHaveCount(0);
 await visit(page,'/clinic/brightwell-urgent-care');await expect(page.getByRole('heading',{name:'We couldn’t find that clinic',exact:true})).toBeVisible();
});
