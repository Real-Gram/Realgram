export function allowGoldNavigation(url: string): boolean {
  return url === 'about:blank' || url === 'https://realgram.no/' || url === 'https://realgram.no';
}
