<?php
declare(strict_types=1);
require_once __DIR__.'/Room.php';
$directory=sys_get_temp_dir().'/realgram-room-test-'.bin2hex(random_bytes(6));mkdir($directory,0700);
$path=$directory.'/room.sqlite';$checks=0;
function check(bool $ok,string $message):void {global $checks;$checks++;if(!$ok)throw new RuntimeException($message);}
function fails(int $status,callable $fn):void {try{$fn();throw new RuntimeException('Expected error '.$status);}catch(RoomError $e){check($e->status===$status,'Incorrect error status');}}
try {
    $a=new RealgramCommunityRoom($path,'192.0.2.1');$b=new RealgramCommunityRoom($path,'192.0.2.2');
    $alice=$a->handle('POST','join',['name'=>'Alice'],'');$bob=$b->handle('POST','join',['name'=>'Bob'],'');
    check($alice['token']!==$bob['token'],'Guest tokens must differ');
    check($alice['participant_id']!==$bob['participant_id'],'Public identities must differ');
    check($a->handle('GET','messages',[],$alice['token'])['messages']===[],'New room must be honest and empty');
    fails(401,fn()=>$a->handle('GET','messages',[],str_repeat('0',64)));
    fails(405,fn()=>$a->handle('GET','join',['name'=>'Alice'],''));
    fails(400,fn()=>$a->handle('POST','send',['body'=>str_repeat('💜',501),'client_id'=>'invalidbody000'],$alice['token']));
    $text='<img src=x onerror=alert(1)> Hello 💜';
    $sent=$a->handle('POST','send',['body'=>$text,'client_id'=>'dedup_message_001','participant_id'=>$bob['participant_id'],'name'=>'Bob'],$alice['token']);
    $id=$sent['messages'][0]['id'];
    check($sent['messages'][0]['body']===$text,'Transport must preserve Unicode/plain text');
    check($sent['messages'][0]['name']==='Alice','Clients cannot forge sender names');
    check($sent['messages'][0]['participant_id']===$alice['participant_id'],'Clients cannot forge sender ownership');
    check($sent['messages'][0]['mine']===true,'Sender owns its message');
    $seen=$b->handle('GET','messages',[],$bob['token']);
    check(count($seen['messages'])===1,'Second independent guest must receive shared message');
    check($seen['messages'][0]['mine']===false,'Recipient must not own another guest message');
    check($seen['active_recently']===2,'Activity must reflect actual recent sessions');
    $retry=$a->handle('POST','send',['body'=>$text,'client_id'=>'dedup_message_001'],$alice['token']);
    check(count($retry['messages'])===1,'Retry must not create duplicates');
    fails(429,fn()=>$a->handle('POST','send',['body'=>'Too fast','client_id'=>'fast_message_002'],$alice['token']));
    fails(403,fn()=>$b->handle('POST','delete',['message_id'=>$id],$bob['token']));
    check($b->handle('POST','report',['message_id'=>$id],$bob['token'])['reported']===true,'Reporting must work');
    $b->handle('POST','report',['message_id'=>$id],$bob['token']);
    $pdo=new PDO('sqlite:'.$path);
    check((int)$pdo->query('SELECT COUNT(*) FROM reports')->fetchColumn()===1,'Reports must be idempotent per guest');
    $a->handle('POST','delete',['message_id'=>$id],$alice['token']);
    check($b->handle('GET','messages',[],$bob['token'])['messages']===[],'Own deletion must propagate to another guest');
    for($i=0;$i<5;$i++)$a->handle('POST','join',['name'=>'Other guest'],'');
    fails(429,fn()=>$a->handle('POST','join',['name'=>'Too many'],''));
    check(strpos(file_get_contents($path),'192.0.2.1')===false,'Do not store raw IP addresses');
    check(strpos(file_get_contents($path),$alice['token'])===false,'Do not store raw bearer tokens');
    $pdo->exec('UPDATE guests SET expires=0');
    fails(401,fn()=>$b->handle('GET','messages',[],$bob['token']));
    $a->prune();
    echo "Live Lounge: $checks checks passed\n";
} finally {
    unset($a,$b,$pdo);
    foreach(glob($directory.'/*')?:[] as $file)unlink($file);
    rmdir($directory);
}
