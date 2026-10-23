<?php
declare(strict_types=1);

final class RoomError extends RuntimeException {
    public function __construct(public int $status, string $message) { parent::__construct($message); }
}

/** Public guest room, deliberately independent of private messaging/accounts. */
final class RealgramCommunityRoom {
    private PDO $db;
    private string $ip;
    public function __construct(string $path, string $remoteAddress) {
        if (!is_dir(dirname($path))) throw new RuntimeException('Room storage has not been provisioned');
        $this->db = new PDO('sqlite:'.$path, null, null, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
        $this->db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
        $this->db->exec('CREATE TABLE IF NOT EXISTS settings (name TEXT PRIMARY KEY,value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS guests (token TEXT PRIMARY KEY,public_id TEXT UNIQUE NOT NULL,name TEXT NOT NULL,ip TEXT NOT NULL,created INTEGER NOT NULL,seen INTEGER NOT NULL,expires INTEGER NOT NULL);
            CREATE INDEX IF NOT EXISTS guests_ip_created ON guests(ip,created);
            CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT,guest TEXT NOT NULL,client_id TEXT NOT NULL,body TEXT NOT NULL,created INTEGER NOT NULL,deleted INTEGER NOT NULL DEFAULT 0,UNIQUE(guest,client_id));
            CREATE INDEX IF NOT EXISTS messages_guest_created ON messages(guest,created);
            CREATE TABLE IF NOT EXISTS reports (message INTEGER NOT NULL,guest TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(message,guest));');
        $this->query('INSERT OR IGNORE INTO settings(name,value) VALUES(?,?)',['ip_salt',bin2hex(random_bytes(32))]);
        $salt = (string)$this->query('SELECT value FROM settings WHERE name=?',['ip_salt'])->fetchColumn();
        $this->ip = hash_hmac('sha256',$remoteAddress,$salt);
    }
    private function query(string $sql,array $values=[]): PDOStatement {
        $q=$this->db->prepare($sql);$q->execute($values);return $q;
    }
    private function text(mixed $value,int $max,string $field): string {
        if (!is_string($value) || preg_match('//u',$value)!==1) throw new RoomError(400,"Invalid $field");
        $value=trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u','',$value) ?? '');
        $count=preg_match_all('/./us',$value);
        if ($value==='' || $count===false || $count>$max) throw new RoomError(400,"$field must contain 1–$max characters");
        return $value;
    }
    private function guest(string $token): array {
        if (!preg_match('/^[a-f0-9]{64}$/D',$token)) throw new RoomError(401,'Join the room again');
        $g=$this->query('SELECT * FROM guests WHERE token=? AND expires>?',[hash('sha256',$token),time()])->fetch(PDO::FETCH_ASSOC);
        if (!$g) throw new RoomError(401,'Your guest session expired. Join again.');
        $this->query('UPDATE guests SET seen=? WHERE token=?',[time(),$g['token']]);return $g;
    }
    private function snapshot(array $guest): array {
        $rows=$this->query('SELECT m.id,m.guest,m.body,m.created,g.name FROM messages m JOIN guests g ON g.public_id=m.guest WHERE m.deleted=0 ORDER BY m.id DESC LIMIT 60')->fetchAll(PDO::FETCH_ASSOC);
        $messages=array_map(static fn($m)=>[
            'id'=>(int)$m['id'],'participant_id'=>$m['guest'],'name'=>$m['name'],
            'body'=>$m['body'],'created_at'=>gmdate('c',(int)$m['created']),
            'mine'=>$m['guest']===$guest['public_id'],
        ],array_reverse($rows));
        return ['ok'=>true,'room'=>'Live Lounge','public'=>true,'participant_id'=>$guest['public_id'],
            'active_recently'=>(int)$this->query('SELECT COUNT(*) FROM guests WHERE seen>? AND expires>?',[time()-45,time()])->fetchColumn(),
            'messages'=>$messages,'server_time'=>gmdate('c')];
    }
    public function handle(string $method,string $action,array $body,string $token): array {
        if ($action==='join') {
            if ($method!=='POST') throw new RoomError(405,'Use POST');
            $name=$this->text($body['name']??'',32,'Name');
            $this->db->exec('BEGIN IMMEDIATE');
            try {
                $count=(int)$this->query('SELECT COUNT(*) FROM guests WHERE ip=? AND created>?',[$this->ip,time()-60])->fetchColumn();
                if ($count>=6) throw new RoomError(429,'Please wait a minute before joining again');
                $raw=bin2hex(random_bytes(32));$public=bin2hex(random_bytes(8));$now=time();
                $this->query('INSERT INTO guests VALUES(?,?,?,?,?,?,?)',[hash('sha256',$raw),$public,$name,$this->ip,$now,$now,$now+86400]);
                $this->db->exec('COMMIT');
            } catch (Throwable $e) { $this->db->exec('ROLLBACK');throw $e; }
            return ['ok'=>true,'token'=>$raw,'participant_id'=>$public,'name'=>$name,'expires_at'=>gmdate('c',$now+86400)];
        }
        $guest=$this->guest($token);
        if ($action==='messages') {
            if ($method!=='GET') throw new RoomError(405,'Use GET');
            return $this->snapshot($guest);
        }
        if ($method!=='POST') throw new RoomError(405,'Use POST');
        if ($action==='send') {
            $text=$this->text($body['body']??'',500,'Message');
            $client=$body['client_id']??'';
            if (!is_string($client)||!preg_match('/^[A-Za-z0-9_-]{12,80}$/D',$client)) throw new RoomError(400,'Invalid message identifier');
            $this->db->exec('BEGIN IMMEDIATE');
            try {
                $existing=$this->query('SELECT id FROM messages WHERE guest=? AND client_id=?',[$guest['public_id'],$client])->fetchColumn();
                if (!$existing) {
                    $now=time();
                    $recent=$this->query('SELECT COUNT(*),MAX(created) FROM messages WHERE guest=? AND created>?',[$guest['public_id'],$now-60])->fetch(PDO::FETCH_NUM);
                    $ipCount=(int)$this->query('SELECT COUNT(*) FROM messages m JOIN guests g ON g.public_id=m.guest WHERE g.ip=? AND m.created>?',[$guest['ip'],$now-60])->fetchColumn();
                    if ((int)$recent[0]>=20 || ($recent[1]!==null && $now-(int)$recent[1]<2) || $ipCount>=40) throw new RoomError(429,'A little slower, please. Try again shortly.');
                    $this->query('INSERT INTO messages(guest,client_id,body,created) VALUES(?,?,?,?)',[$guest['public_id'],$client,$text,$now]);
                }
                $this->db->exec('COMMIT');
            } catch(Throwable $e) {$this->db->exec('ROLLBACK');throw $e;}
            return $this->snapshot($guest);
        }
        if ($action==='delete') {
            $id=filter_var($body['message_id']??null,FILTER_VALIDATE_INT);
            $owner=$this->query('SELECT guest FROM messages WHERE id=?',[$id])->fetchColumn();
            if (!$id||$owner!==$guest['public_id']) throw new RoomError(403,'You can only remove your own message');
            $this->query('UPDATE messages SET deleted=1,body=? WHERE id=?',['',$id]);
            return $this->snapshot($guest);
        }
        if ($action==='report') {
            $id=filter_var($body['message_id']??null,FILTER_VALIDATE_INT);
            if (!$id||!$this->query('SELECT id FROM messages WHERE id=? AND deleted=0',[$id])->fetchColumn()) throw new RoomError(404,'Message not found');
            $count=(int)$this->query('SELECT COUNT(*) FROM reports WHERE guest=? AND created>?',[$guest['public_id'],time()-60])->fetchColumn();
            if ($count>=10) throw new RoomError(429,'Please wait before reporting more messages');
            $this->query('INSERT OR IGNORE INTO reports VALUES(?,?,?)',[$id,$guest['public_id'],time()]);
            return ['ok'=>true,'reported'=>true];
        }
        throw new RoomError(404,'Unknown room action');
    }
    public function prune(): void {
        $cutoff=time()-7*86400;
        $this->query('DELETE FROM reports WHERE created<?',[$cutoff]);
        $this->query('DELETE FROM messages WHERE created<? OR id<(SELECT COALESCE(MAX(id),0)-10000 FROM messages)',[$cutoff]);
        $this->query('DELETE FROM guests WHERE expires<?',[$cutoff]);
    }
}
