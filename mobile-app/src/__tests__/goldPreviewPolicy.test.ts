import { allowGoldNavigation } from '../preview/goldPreviewPolicy';
test('the bundled design shell cannot navigate to remote or local files',()=>{
  expect(allowGoldNavigation('about:blank')).toBe(true);
  expect(allowGoldNavigation('https://realgram.no/')).toBe(true);
  for(const url of ['file:///etc/passwd','https://example.com','https://realgram.no.evil.test/','https://realgram.no/community/room.php','javascript:alert(1)']) expect(allowGoldNavigation(url)).toBe(false);
});
