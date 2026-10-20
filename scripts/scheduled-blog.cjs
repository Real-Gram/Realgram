#!/usr/bin/env node
'use strict';
// Reviewed November queue. CLI only; drafts remain private until their due time.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const mongoose=require('/var/www/backend/backend/node_modules/mongoose');
const BlogPost=require('/var/www/backend/backend/model/blogPost');
const ROOT=path.resolve(__dirname,'..');
const PLAN_PATH=path.join(ROOT,'.editorial/november-2026.json');
const STATE_PATH='/var/lib/realgram-blog/status.json';
const fields=['title','slug','excerpt','body_html','locale','translation_of'];
function contentOf(p){return Object.fromEntries(fields.map(k=>[k,p[k]??(k==='translation_of'?null:'')]));}
function fingerprint(p){return crypto.createHash('sha256').update(JSON.stringify(contentOf(p))).digest('hex');}
function loadPlan(filename=PLAN_PATH){
 const plan=JSON.parse(fs.readFileSync(filename,'utf8'));
 if(plan.batch_id!=='realgram-november-2026'||plan.timezone!=='Europe/Berlin'||!Array.isArray(plan.posts)||plan.posts.length!==8)throw Error('Unexpected editorial batch');
 const slugs=new Set(),pairs=new Map();
 for(const p of plan.posts){
  if(!/^[a-z0-9-]+$/.test(p.slug)||slugs.has(p.slug))throw Error('Invalid/duplicate slug');
  if(!['en','fa'].includes(p.locale)||!p.title||!p.excerpt||p.body_html.length<1200)throw Error('Incomplete post');
  const due=new Date(p.publish_at);
  if(!Number.isFinite(due.getTime())||!p.publish_at.startsWith('2026-11-'))throw Error('Invalid publication date');
  slugs.add(p.slug);
  if(!pairs.has(p.pair_id))pairs.set(p.pair_id,[]);
  pairs.get(p.pair_id).push(p);
 }
 for(const group of pairs.values()){
  const en=group.find(p=>p.locale==='en'),fa=group.find(p=>p.locale==='fa');
  if(group.length!==2||!en||!fa||en.publish_at!==fa.publish_at||fa.translation_of!==en.slug)throw Error('Incomplete language pair');
 }
 return {...plan,pairs:[...pairs.values()]};
}
function duePairs(plan,now){return plan.pairs.filter(group=>new Date(group[0].publish_at).getTime()<=now.getTime());}
async function validateStored(plan,Model=BlogPost,checkContent=true){
 const docs=await Model.find({slug:{$in:plan.posts.map(p=>p.slug)}}).lean();
 const bySlug=new Map(docs.map(p=>[p.slug,p]));
 for(const p of plan.posts){
  const d=bySlug.get(p.slug);
  if(!d)throw Error('Missing prepared draft: '+p.slug);
  if(checkContent&&d.status==='draft'&&fingerprint(d)!==fingerprint(p))throw Error('Draft changed; preserving editor content: '+p.slug);
  if(!['draft','published'].includes(d.status))throw Error('Unexpected stored status: '+p.slug);
 }
 return bySlug;
}
async function prepare(plan,Model=BlogPost){
 // Never overwrite an existing post, including an editor's changes.
 for(const p of plan.posts){
  const d=await Model.findOne({slug:p.slug}).lean();
  if(d){if(fingerprint(d)!==fingerprint(p))throw Error('Slug already used by different content: '+p.slug);continue;}
  await Model.create({...contentOf(p),cover_image:'',status:'draft',published_at:null});
 }
 return validateStored(plan,Model);
}
async function publishDue(plan,{Model=BlogPost,now=new Date()}={}){
 const bySlug=await validateStored(plan,Model,false);
 const published=[];
 for(const pair of duePairs(plan,now)){
  const toPublish=pair.filter(p=>bySlug.get(p.slug).status==='draft');
  if(!toPublish.length)continue;
  for(const p of toPublish)if(fingerprint(bySlug.get(p.slug))!==fingerprint(p))throw Error('Draft changed; preserving editor content: '+p.slug);
  // Content predicates also protect edits racing the initial validation.
  const clauses=toPublish.map(p=>({...contentOf(p),_id:bySlug.get(p.slug)._id,status:'draft'}));
  const r=await Model.updateMany({$or:clauses},{$set:{status:'published',published_at:now,updated_at:now}});
  if(r.modifiedCount!==toPublish.length)throw Error('Concurrent edit detected; rerun after inspection');
  const complete=await Model.countDocuments({slug:{$in:pair.map(p=>p.slug)},status:'published'});
  if(complete!==2)throw Error('Language pair incomplete; next run will retry');
  published.push(...toPublish.map(p=>p.slug));
 }
 return published;
}
function writeState(s){
 const tmp=STATE_PATH+'.tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(s,null,2),{mode:0o640});fs.renameSync(tmp,STATE_PATH);
}
async function main(){
 const mode=process.argv[2]||'status';
 const at=process.argv.find(x=>x.startsWith('--at='));
 if(at&&mode!=='dry-run')throw Error('--at is only available for non-writing dry-run');
 if(!['prepare','publish','status','dry-run'].includes(mode))throw Error('Use prepare, publish, status or dry-run');
 const plan=loadPlan(),now=at?new Date(at.slice(5)):new Date();
 if(!Number.isFinite(now.getTime()))throw Error('Invalid dry-run date');
 await mongoose.connect('mongodb://localhost:27017/khabat',{serverSelectionTimeoutMS:10000});
 try{
  if(mode==='prepare')await prepare(plan);
  let published=[],publicationError=null;
  if(mode==='publish'){try{published=await publishDue(plan,{now});}catch(e){publicationError=e;}}
  const docs=await validateStored(plan,BlogPost,false);
  const rows=plan.posts.map(p=>({slug:p.slug,locale:p.locale,title:p.title,publish_at:p.publish_at,publish_local:p.publish_local,status:docs.get(p.slug).status,published_at:docs.get(p.slug).published_at}));
  const summary={batch_id:plan.batch_id,checked_at:now.toISOString(),mode,just_published:published,
    pending:rows.filter(p=>p.status==='draft').length,
    due:duePairs(plan,now).flat().filter(p=>docs.get(p.slug).status==='draft').map(p=>p.slug),posts:rows};
  await mongoose.disconnect();
  if(mode==='publish'){
   // Regenerate every run so a previous generation failure is retried too.
   cp.execFileSync(process.execPath,[path.join(ROOT,'scripts/generate-blog.js')],{stdio:'inherit',timeout:180000});
   summary.last_generation=new Date().toISOString();
   if(publicationError){summary.error=publicationError.message;process.exitCode=1;}
   else summary.last_success=summary.last_generation;
   writeState(summary);
  }
  console.log(JSON.stringify(mode==='publish'?{batch_id:summary.batch_id,checked_at:summary.checked_at,just_published:published,pending:summary.pending,next_due:rows.find(p=>p.status==='draft')?.publish_at||null,error:summary.error||null}:summary,null,2));
 }finally{if(mongoose.connection.readyState)await mongoose.disconnect();}
}
module.exports={loadPlan,duePairs,prepare,publishDue,fingerprint};
if(require.main===module)main().catch(async e=>{
 console.error(new Date().toISOString()+' scheduled-blog ERROR: '+e.message);
 try{writeState({checked_at:new Date().toISOString(),error:e.message});}catch{}
 await mongoose.disconnect();process.exitCode=1;
});
