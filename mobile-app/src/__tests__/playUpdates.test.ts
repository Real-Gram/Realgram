jest.mock('../config/distribution', () => ({ APP_DISTRIBUTION: 'play' }));
import { checkForUpdate, downloadUpdate, openUpdateInBrowser } from '../services/updateService';

describe('Google Play distribution', () => {
  it('never polls the website APK manifest', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    expect(await checkForUpdate()).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
  it('does not launch the native APK installer or a browser APK download', async () => {
    await expect(downloadUpdate('https://realgram.no/download/example.apk')).rejects.toMatchObject({ code: 'PLAY_MANAGED_UPDATES' });
    await expect(openUpdateInBrowser('https://realgram.no/download/example.apk')).rejects.toMatchObject({ code: 'PLAY_MANAGED_UPDATES' });
  });
});
