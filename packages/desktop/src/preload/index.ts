import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import type { ClawWorkAPI } from './clawwork';

function buildApi(): ClawWorkAPI {
  return {
    sendMessage: (sessionKey: string, content: string) =>
      ipcRenderer.invoke('ws:send-message', { sessionKey, content }),
    chatHistory: (sessionKey: string, limit?: number) =>
      ipcRenderer.invoke('ws:chat-history', { sessionKey, limit }),
    listSessions: () =>
      ipcRenderer.invoke('ws:list-sessions'),
    gatewayStatus: () =>
      ipcRenderer.invoke('ws:gateway-status'),

    onAgentMessage: (callback) => {
      ipcRenderer.on('agent-message', (_event, msg) => callback(msg));
    },
    onGatewayEvent: (callback) => {
      ipcRenderer.on('gateway-event', (_event, data) => callback(data));
    },
    onGatewayStatus: (callback) => {
      ipcRenderer.on('gateway-status', (_event, status) => callback(status));
    },
    onPluginStatus: (callback) => {
      ipcRenderer.on('plugin-status', (_event, status) => callback(status));
    },

    removeAllListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(channel);
    },
  };
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('clawwork', buildApi());
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore fallback for non-isolated context
  window.electron = electronAPI;
  // @ts-ignore
  window.clawwork = buildApi();
}
