import type { BrowserWindow } from 'electron';
import { GatewayClient } from './gateway-client.js';
import { readConfig } from '../workspace/config.js';
import { GATEWAY_WS_PORT } from '@clawwork/shared';
import type { GatewayClientConfig } from '@clawwork/shared';

const DEFAULT_TOKEN = '38d7f008d24a0b508a0ef7149a18bba3ab6ee0bfe5b6f4b9';

let gatewayClient: GatewayClient | null = null;

function buildGatewayConfig(): GatewayClientConfig {
  const cfg = readConfig();
  const url = cfg?.gatewayUrl ?? `ws://127.0.0.1:${GATEWAY_WS_PORT}`;
  const token = cfg?.bootstrapToken ?? DEFAULT_TOKEN;
  return { url, auth: { token } };
}

export function initWebSockets(mainWindow: BrowserWindow): void {
  gatewayClient = new GatewayClient(buildGatewayConfig());
  gatewayClient.setMainWindow(mainWindow);
  gatewayClient.connect();
}

export function getGatewayClient(): GatewayClient | null {
  return gatewayClient;
}

export function destroyWebSockets(): void {
  gatewayClient?.destroy();
  gatewayClient = null;
}
