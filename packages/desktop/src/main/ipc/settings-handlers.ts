import { ipcMain } from 'electron';
import { readConfig, updateConfig } from '../workspace/config.js';
import type { AppConfig } from '../workspace/config.js';
import { getGatewayClient } from '../ws/index.js';

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', (): AppConfig | null => {
    return readConfig();
  });

  ipcMain.handle(
    'settings:update',
    (_event, partial: Partial<AppConfig>): { ok: boolean; config: AppConfig } => {
      const config = updateConfig(partial);

      if (partial.gatewayUrl) {
        const gateway = getGatewayClient();
        if (gateway) {
          gateway.updateUrl(partial.gatewayUrl);
        }
      }

      return { ok: true, config };
    },
  );
}
