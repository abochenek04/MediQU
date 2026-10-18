import type { Clinic, SearchFilters } from '../types';
export const normalizeSearch = (text:string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu,' ').trim();
const concepts = [
 {terms:['head pain','headache','dolor de cabeza','头痛','صداع','bol glowy','ból głowy','માથાનો દુખાવો','सिर दर्द'],capabilities:['headache']},
 {terms:['fever','temperature','fiebre','发烧','حمى','goraczka','તાવ','बुखार'],capabilities:['fever']},
 {terms:['cough','tos','咳嗽','سعال','kaszel','ઉધરસ','खांसी'],capabilities:['cough']},
 {terms:['sore throat','throat pain','dolor de garganta','喉咙痛','التهاب الحلق','bol gardla','ગળામાં દુખાવો','गले में दर्द'],capabilities:['sore throat']},
 {terms:['sprain','twisted ankle','esguince','扭伤','التواء','skrecenie','મચકોડ','मोच'],capabilities:['sprain','minor injury','minor injuries']},
 {terms:['child care','children','pediatric','pediatrics','pediatria','儿科','اطفال','pediatria','બાળરોગ','बाल रोग'],capabilities:['pediatrics']},
 {terms:['check up','checkup','routine exam','chequeo','体检','فحص دوري','badanie kontrolne','તપાસ','नियमित जांच'],capabilities:['annual checkup','preventive care','wellness','annual exam','checkup']},
];
export const distanceMiles=(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number})=> {const rad=Math.PI/180; const h=Math.sin((b.latitude-a.latitude)*rad/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin((b.longitude-a.longitude)*rad/2)**2;return 3958.8*2*Math.asin(Math.sqrt(Math.min(1,h)));};
export function editDistance(a:string,b:string) { let previous=Array.from({length:b.length+1},(_,i)=>i); for(let i=1;i<=a.length;i++){const current=[i];for(let j=1;j<=b.length;j++) current[j]=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));previous=current;} return previous[b.length]; }
export function relevance(clinic:Clinic,query:string):number {
 const q=normalizeSearch(query); if(!q)return 0;
 const names=[clinic.name,...clinic.providers.map(p=>p.name)].map(normalizeSearch);
 if(names.includes(q))return 120;
 if(names.some(n=>n.includes(q)))return 105;
 const capabilities=[...clinic.symptoms,...clinic.specialties,clinic.type].map(normalizeSearch);
 const address=normalizeSearch(`${clinic.neighborhood} ${clinic.address}`);
 if(address.includes(q))return 95;
 if(capabilities.some(c=>c===q||c.includes(q)))return 90;
 for(const concept of concepts) if(concept.terms.map(normalizeSearch).includes(q)&&concept.capabilities.some(c=>capabilities.some(v=>v.includes(c))))return 88;
 const tokens=q.split(' '); if(tokens.length>12)return 0;
 // Fuzzy matching is restricted to names, with every query token accounted for.
 // Tiny tokens must match exactly; one/two edits are allowed only on longer words.
 const score=Math.max(...names.map(name=>{
  const words=name.split(' ');let penalty=0;
  const used=new Set<number>();
  for(const token of tokens) {
   let best=Infinity,index=-1;
   words.forEach((word,i)=>{if(used.has(i))return; const d=editDistance(token,word);if(d<best){best=d;index=i;}});
   const limit=token.length<=2?0:token.length>=8?2:1;
   if(best>limit)return 0;
   used.add(index);penalty+=best;
  }
  return penalty===0?80:tokens.some(t=>t.length>=4)?Math.max(50,72-penalty*5):0;
 }));
 return score>=50?score:0;
}
export function searchDirectory(clinics:Clinic[],filters:SearchFilters):Clinic[] {
 const query=filters.query.trim();
 const matches=clinics.map(c=>filters.origin?{...c,distanceMiles:distanceMiles(filters.origin,c.coordinates)}:c)
 .filter(c=>(!filters.insurance||c.insurance.includes(filters.insurance))&&(!filters.language||c.languages.includes(filters.language))&&(!filters.minimumRating||(c.rating?.rating??0)>=filters.minimumRating)&&(!filters.specialty||c.specialties.includes(filters.specialty))&&(filters.visitMode==='all'||c.visitModes.includes(filters.visitMode))&&(filters.timing!=='open-now'||c.status==='open')&&(!['morning','afternoon'].includes(filters.timing)||c.historicalWaits.some(r=>r[filters.timing as 'morning'|'afternoon']>0))&&(!filters.origin||c.distanceMiles<=filters.maxDistance))
 .map(c=>({clinic:c,score:query?relevance(c,query):0})).filter(r=>!query||r.score>=50);
 return matches.sort((a,b)=>{
  if(query&&a.score!==b.score)return b.score-a.score;
  if(!query&&(filters.timing==='morning'||filters.timing==='afternoon')) {const period=filters.timing; const mean=(c:Clinic)=>{const records=c.historicalWaits.filter(r=>r[period]>0);return records.reduce((s,r)=>s+r[period],0)/records.length;};return mean(a.clinic)-mean(b.clinic);}
  if(a.clinic.status!==b.clinic.status)return a.clinic.status==='open'?-1:1;
  return filters.origin ? a.clinic.distanceMiles-b.clinic.distanceMiles : 0;
 }).map(r=>r.clinic);
}
