import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("dsTuner", {
  getVersion: (): Promise<string> => ipcRenderer.invoke("app:version"),
  findInstallations: (): Promise<string[]> => ipcRenderer.invoke("game:find-installations"),
  chooseInstallation: (): Promise<string | null | { error: string }> => ipcRenderer.invoke("game:choose-installation"),
  listCars: (installationPath: string) => ipcRenderer.invoke("game:list-cars", installationPath),
  readTextFile: (installationPath: string, vehicleId: string, relativePath: string) =>
    ipcRenderer.invoke("game:read-text-file", installationPath, vehicleId, relativePath),
  openFolder: (folderPath: string): Promise<string> => ipcRenderer.invoke("system:open-folder", folderPath)
});
