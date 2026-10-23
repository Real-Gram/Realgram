<?php
declare(strict_types=1);
require_once __DIR__.'/Room.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
// An intentionally public room. No cookies, private accounts or credentials.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Max-Age: 600');
if ($_SERVER['REQUEST_METHOD']==='OPTIONS') {http_response_code(204);exit;}
try {
    $raw=file_get_contents('php://input',false,null,0,8193);
    if ($raw===false||strlen($raw)>8192) throw new RoomError(413,'Request too large');
    $body=$raw===''?[]:json_decode($raw,true,32,JSON_THROW_ON_ERROR);
    if (!is_array($body)||array_is_list($body)&&$body!==[]) throw new RoomError(400,'Use a JSON object');
    $auth=$_SERVER['HTTP_AUTHORIZATION']??'';
    $token=str_starts_with($auth,'Bearer ')?substr($auth,7):'';
    $room=new RealgramCommunityRoom(getenv('REALGRAM_ROOM_DB')?:'/var/lib/realgram-community/room.sqlite',$_SERVER['REMOTE_ADDR']??'unknown');
    $out=$room->handle($_SERVER['REQUEST_METHOD'],$_GET['action']??'messages',$body,$token);
    if (random_int(1,200)===1) $room->prune();
    echo json_encode($out,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
} catch (RoomError $e) {http_response_code($e->status);if($e->status===429)header('Retry-After: 3');echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);}
catch (JsonException $e) {http_response_code(400);echo '{"ok":false,"error":"Invalid JSON"}';}
catch (Throwable $e) {error_log('Realgram community: '.$e->getMessage());http_response_code(503);echo '{"ok":false,"error":"The lounge is temporarily unavailable. Please retry."}';}
