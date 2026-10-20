// Publish reviewed content once; existing articles retain their original dates.
const fs=require('fs');
const mongoose=require('/var/www/backend/backend/node_modules/mongoose');
const BlogPost=require('/var/www/backend/backend/model/blogPost');
(async()=>{
 await mongoose.connect('mongodb://localhost:27017/khabat');
 const posts=JSON.parse(fs.readFileSync('/var/www/realgram/docs/seo-blog-update-20261020.json','utf8'));
 for(const p of posts) {
   const now=new Date();
   const result=await BlogPost.updateOne({slug:p.slug},{$setOnInsert:{...p,status:'published',published_at:now,created_at:now,updated_at:now}},{upsert:true});
   console.log(p.locale,p.slug,result.upsertedCount?'published':'already present');
 }
 await mongoose.disconnect();
})().catch(async e=>{console.error(e.message);await mongoose.disconnect();process.exitCode=1});
