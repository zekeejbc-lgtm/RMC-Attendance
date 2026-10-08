import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
process.loadEnvFile('.env.local'); process.loadEnvFile('.env.server.local');
const options={auth:{persistSession:false,autoRefreshToken:false}},url=process.env.SUPABASE_URL;
const client=()=>createClient(url,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,options);
const admin=client(),service=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,options),prefix=`fast-scanner-${Date.now()}`;
const users=[],nodes=[],events=[],photos=[],checks=[]; const password=crypto.randomBytes(24).toString('base64url');
const pass=label=>{checks.push(label);console.log(`PASS ${label}`);};
const check=result=>{if(result.error)throw new Error(result.error.message);return result.data;};
const deny=async(label,request)=>{assert.ok((await request).error,`${label} must fail`);pass(label);};
const command=async(action,args)=>check(await admin.rpc('rmc_command',{action,args}));
async function person(label,node,role='student') {
 const profile={name:`${prefix} ${label}`,username:`${prefix}-${label}`,email:`${prefix}-${label}@example.test`,student_id:`${prefix}-${label}`,role,school_data:{type:'College',level:'1',section:label,academic_assignment:{campusId:nodes[0],terminalGroupId:node,nodePathIds:[nodes[0],node]}},...(role==='mayor'?{official_data:{body:'SSG',assignment_node_id:node}}:{})};
 const ids=check(await admin.functions.invoke('rmc-accounts',{body:{action:'create',data:{members:[{profile,password}]}}})).ids;users.push(...ids);
 const who=client();check(await who.auth.signInWithPassword({email:profile.email,password}));return{uid:ids[0],profile,who};
}
try {
 const credentials=JSON.parse(fs.readFileSync('.demo-accounts.local','utf8')).find(row=>row.role==='admin');
 const login=check(await admin.functions.invoke('rmc-login',{body:{identifier:credentials.username,password:credentials.password}}));check(await admin.auth.setSession(login));
 for(const [label,parent,type] of [['campus',null,'campus'],['section','campus','section'],['other','campus','section']]){const id=`${prefix}-${label}`;await command('addSchoolNode',[parent?`${prefix}-${parent}`:null,{id,name:`Scanner test ${label}`,type}]);nodes.push(id);}
 const student=await person('student',nodes[1]),mayor=await person('mayor',nodes[1],'mayor'),outsider=await person('outsider',nodes[2]);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS9sAAAAASUVORK5CYII=','base64');
 const path=`${student.uid}/photo/${prefix}.png`;check(await service.storage.from('rmc-documents').upload(path,png,{contentType:'image/png'}));photos.push(path);
 const saved=check(await service.from('rmc_profiles').select('profile').eq('id',student.uid).single());
 check(await service.from('rmc_profiles').update({profile:{...saved.profile,photo_url:`storage://rmc-documents/${path}`}}).eq('id',student.uid));
 const now=Date.now(),eid=await command('createEvent',[{title:prefix,kind:'attendance',status:'active',startTime:now-60000,endTime:now+3600000,scopeNodeId:nodes[0],participantsType:'all',audienceTarget:{mode:'all'},target:{all:true},geofenceEnabled:false,location:{lat:7,lng:125,radius_meters:100},penaltyValue:0,penaltyUnit:'hours'}]);events.push(eid);
 const grant=check(await mayor.who.rpc('rmc_prepare_offline_attendance',{target_event_id:eid}));
 assert.equal(grant.students.find(row=>row.uid===student.uid).photo_url,`storage://rmc-documents/${path}`);pass('authorized roster includes photo references and excludes private contact fields');
 const lookup=(who,extra={})=>who.rpc('rmc_lookup_scanner_student',{offline_session_id:grant.id,lookup_student_id:student.profile.student_id,...extra});
 await deny('anonymous lookup denied',lookup(client()));await deny('student cannot use another scanner grant',lookup(student.who));
 await deny('out-of-scope student ID denied',lookup(mayor.who,{lookup_student_id:outsider.profile.student_id}));
 check(await service.from('rmc_profiles').update({node_id:null}).eq('id',outsider.uid));
 const adminGrant=check(await admin.rpc('rmc_prepare_offline_attendance',{target_event_id:eid}));
 await deny('unassigned student cannot bypass event scope even for an admin',admin.rpc('rmc_lookup_scanner_student',{offline_session_id:adminGrant.id,lookup_student_id:outsider.profile.student_id}));
 const looked=check(await lookup(mayor.who,{lookup_student_id:` ${student.profile.student_id.toUpperCase()} `}));
 assert.equal(looked.student.uid,student.uid);assert.ok(!looked.student.email&&!looked.student.guardian&&!looked.student.documents);pass('exact ID fallback is normalized and returns only minimal scoped identity');
 const late=await person('late',nodes[1]);
 const added=check(await lookup(mayor.who,{lookup_student_id:late.profile.student_id}));assert.equal(added.student.uid,late.uid);pass('new eligible student is authorized and added to the existing server grant');
 const qr=check(await late.who.rpc('rmc_issue_qr'));
 const qrLooked=check(await lookup(mayor.who,{lookup_student_id:null,qr_token:qr.token}));assert.equal(qrLooked.qrHash.studentUid,late.uid);assert.ok(!JSON.stringify(qrLooked).includes(qr.token));pass('one QR fallback call returns identity and authorized hash without exposing raw passes');
 const payload={id:crypto.randomUUID(),sessionId:grant.id,studentUid:late.uid,direction:'in',capturedAt:Date.now(),qrToken:qr.token,manualReason:'',position:null};
 check(await mayor.who.rpc('rmc_sync_offline_attendance',{submission:payload}));pass('new student and QR can sync under the updated grant');
 const sourceHash=crypto.createHash('sha256').update(`storage://rmc-documents/${path}`).digest('hex');
 const photo=(who,extra={})=>who.functions.invoke('rmc-scanner-photo',{body:{sessionId:grant.id,studentUid:student.uid,sourceHash,...extra}});
 const image=await photo(mayor.who);check(image);assert.ok(image.data instanceof Blob);assert.equal(image.data.size,png.length);assert.equal(image.response.headers.get('cache-control'),'no-store');pass('authenticated photo endpoint returns binary bytes without public caching');
 await deny('anonymous photo request denied',photo(client()));await deny('another user cannot read scanner photos',photo(outsider.who));
 await deny('photo source changes reject stale requests',photo(mayor.who,{sourceHash:'0'.repeat(64)}));
 await deny('arbitrary outside student photo denied',photo(mayor.who,{studentUid:outsider.uid}));
 await deny('anonymous direct photo-source RPC denied',client().rpc('rmc_scanner_photo_source',{offline_session_id:grant.id,student_uid:student.uid}));
 const privateSource='https://127.0.0.1/private-resource';
 check(await service.from('rmc_profiles').update({profile:{...saved.profile,photo_url:privateSource}}).eq('id',student.uid));
 await deny('photo proxy refuses non-approved hosts without fetching private resources',photo(mayor.who,{sourceHash:crypto.createHash('sha256').update(privateSource).digest('hex')}));
 const currentProfile=check(await service.from('rmc_profiles').select('profile').eq('id',student.uid).single());
 check(await service.from('rmc_profiles').update({status:'inactive',profile:{...currentProfile.profile,account_status:'inactive'}}).eq('id',student.uid));
 await deny('inactive cached identity is denied by current backend checks',lookup(mayor.who));await deny('inactive student photo denied',photo(mayor.who));
 console.log(`Verified ${checks.length} fast scanner backend checks.`);
} finally {
 for(const path of photos)await service.storage.from('rmc-documents').remove([path]);
 for(const id of events){for(const table of ['rmc_excuses','rmc_sanctions','rmc_attendance','rmc_merit_credits'])await service.from(table).delete().eq('event_id',id);await service.from('rmc_events').delete().eq('id',id);await service.from('rmc_audit').delete().eq('target',id);}
 for(const id of users){await service.from('rmc_sanctions').delete().eq('student_id',id);await service.from('rmc_audit').delete().eq('actor_id',id);await service.from('rmc_audit').delete().eq('target',id);await service.auth.admin.deleteUser(id);}
 for(const id of nodes.reverse()){await service.from('rmc_nodes').delete().eq('id',id);await service.from('rmc_audit').delete().eq('target',id);}
 fs.writeFileSync('.fast-scanner-verification.local',JSON.stringify({timestamp:new Date().toISOString(),checks,cleanedUp:true},null,2));console.log('Removed isolated scanner fixtures and photo.');
}
