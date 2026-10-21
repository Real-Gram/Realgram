<?php
declare(strict_types=1);
require_once __DIR__ . '/../lib/ad_monetization.php';
$db = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
am_init_tables($db);
$db->exec("CREATE TABLE app_events (event TEXT, created_at TEXT)");
$db->exec("INSERT INTO app_events VALUES
 ('AD_INTERSTITIAL_SHOWN','2026-10-21 20:21:28'),
 ('AD_BANNER_SHOWN','2026-10-21 21:00:00'),
 ('AD_BANNER_LOADED','2026-10-21 21:01:00'),
 ('AD_BANNER_IMPRESSION','2026-10-21 21:02:00'),
 ('AD_BANNER_SHOWN','2026-10-22 00:00:00')");
function verify($ok, $name) { if (!$ok) throw new RuntimeException($name); echo "PASS $name\n"; }
verify(am_local_shown($db, '2026-10-21', '2026-10-21') === 2, 'only actual shown callbacks, bounded by date');
am_daily_metric_upsert($db, ['date'=>'2026-10-21','provider'=>'admob','ad_unit_id'=>'provider-unit','source_type'=>'PROVIDER_API','impressions'=>69,'requests'=>1648,'revenue'=>0.05,'currency'=>'USD']);
am_daily_metric_upsert($db, ['date'=>'2026-10-21','provider'=>'admob','ad_unit_id'=>'local-unit','source_type'=>'LOCAL_SDK_EVENT','impressions'=>15,'requests'=>20,'rewards_granted'=>1,'revenue'=>0.01,'currency'=>'USD']);
$r=am_provider_summary($db,'admob','2026-10-21','2026-10-21');
verify($r['shown'] === 2, 'shown reads current telemetry without backfill');
verify($r['impressions'] === 69 && $r['requests'] === 1648, 'local and provider traffic are not counted twice');
verify($r['rewards_granted'] === 1, 'local reward bookkeeping is independent of provider traffic');
verify($r['primary']['source_type'] === 'PROVIDER_API' && count($r['breakdown']) === 2, 'source provenance retained');
verify(abs($r['primary']['revenue']-0.05)<0.000001, 'provider revenue unchanged');
$empty=new PDO('sqlite::memory:');
verify(am_local_shown($empty,'2026-10-21','2026-10-21')===0, 'works before telemetry table exists');
