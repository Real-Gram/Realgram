const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../web-preview/realgram');
const target=path.resolve(__dirname,'../src/preview/generated/goldHtml.ts');
function buildGoldPreview(){
  const assets=new Map();
  for(const name of ['people-and-stickers.png','design-concept.png']) assets.set('./assets/'+name,'data:image/png;base64,'+fs.readFileSync(path.join(root,'assets',name)).toString('base64'));
  let css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  let script=fs.readFileSync(path.join(root,'app.js'),'utf8');
  for(const [name,data] of assets){css=css.split(name).join(data);script=script.split(name).join(data);}
  script=script.replace(/<\/script/gi,'<\\/script');
  const hash=crypto.createHash('sha256').update(script).digest('base64');
  const version=fs.readFileSync(path.resolve(__dirname,'../src/utils/version.ts'),'utf8').match(/APP_VERSION\s*=\s*'([^']+)'/)[1];
  let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace('DESIGN PLAYGROUND','GOLD PREVIEW · '+version).replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/,'');
  const csp=`default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data:; connect-src https://realgram.no/community/room.php; base-uri 'none'; form-action 'none'; frame-src 'none'`;
  html=html.replace('<head>','<head>\n<meta http-equiv="Content-Security-Policy" content="'+csp+'">');
  html=html.replace('<link rel="stylesheet" href="./style.css">',()=>'<style>'+css+'</style>');
  html=html.replace('<script src="./app.js" defer></script>',()=>'<script>'+script+'</script>');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,'// Generated from web-preview/realgram; do not edit.\nexport const GOLD_PREVIEW_HTML = '+JSON.stringify(html)+';\n');
  return html;
}
if(require.main===module){const html=buildGoldPreview();console.log('Gold design document bundled:',Buffer.byteLength(html),'bytes');}
module.exports={buildGoldPreview};
