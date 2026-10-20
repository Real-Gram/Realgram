const assert=require('assert'),mongoose=require('/var/www/backend/backend/node_modules/mongoose');
const scheduler=require('/var/www/realgram/scripts/scheduled-blog.cjs');
const schema=require('/var/www/backend/backend/model/blogPost').schema.clone();
const collection='codex_scheduler_validation_'+Date.now();
const TestModel=mongoose.model('SchedulerValidation',schema,collection);
(async()=>{
 await mongoose.connect('mongodb://localhost:27017/khabat');
 try{
  const plan=scheduler.loadPlan();
  await scheduler.prepare(plan,TestModel);
  assert.equal(await TestModel.countDocuments({status:'draft'}),8);
  for(const instant of ['2026-10-20T15:45:00Z','2026-11-03T06:59:59Z']){
   assert.deepEqual(await scheduler.publishDue(plan,{Model:TestModel,now:new Date(instant)}),[]);
   assert.equal(await TestModel.countDocuments({status:'published'}),0);
  }
  assert.equal((await scheduler.publishDue(plan,{Model:TestModel,now:new Date('2026-11-03T07:00:00Z')})).length,2);
  const original=(await TestModel.findOne({slug:plan.posts[0].slug}).lean()).published_at.toISOString();
  assert.deepEqual(await scheduler.publishDue(plan,{Model:TestModel,now:new Date('2026-11-03T07:15:00Z')}),[]);
  assert.equal((await TestModel.findOne({slug:plan.posts[0].slug}).lean()).published_at.toISOString(),original);
  assert.equal(await TestModel.countDocuments({status:'draft'}),6);
  const edited=plan.posts[2];
  await TestModel.updateOne({slug:edited.slug},{$set:{title:'Editor changed this draft'}});
  await assert.rejects(scheduler.publishDue(plan,{Model:TestModel,now:new Date('2026-11-10T07:00:00Z')}),/Draft changed/);
  assert.equal(await TestModel.countDocuments({status:'published'}),2);
  assert.equal((await TestModel.findOne({slug:edited.slug}).lean()).title,'Editor changed this draft');
  await TestModel.updateOne({slug:edited.slug},{$set:{title:edited.title}});
  assert.equal((await scheduler.publishDue(plan,{Model:TestModel,now:new Date('2026-11-10T07:00:00Z')})).length,2);
  assert.equal((await scheduler.publishDue(plan,{Model:TestModel,now:new Date('2026-11-17T07:00:00Z')})).length,2);
  assert.equal((await scheduler.publishDue(plan,{Model:TestModel,now:new Date('2026-11-24T07:00:00Z')})).length,2);
  assert.equal(await TestModel.countDocuments({status:'published'}),8);
  assert.deepEqual(await scheduler.publishDue(plan,{Model:TestModel,now:new Date('2026-12-01T07:00:00Z')}),[]);
  console.log('PASS: no early publication; both languages at due time; retries preserve timestamps; editor changes preserved; all four dates publish once.');
 }finally{
  await mongoose.connection.db.collection(collection).drop().catch(e=>{if(e.codeName!=='NamespaceNotFound')throw e});
  await mongoose.disconnect();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
