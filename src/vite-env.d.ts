/// <reference types="vite/client" />

type VehicleFile = {
  name: string;
  relativePath: string;
  kind: "ini" | "lut" | "acd" | "other";
  readableText: boolean;
  size: number;
};

type VehicleSummary = {
  id: string;
  folderName: string;
  displayName: string;
  folderPath: string;
  dataPath: string | null;
  dataAcdPath: string | null;
  files: VehicleFile[];
  warnings: string[];
  imageDataUrl: string | null;
};

interface Window {
  dsTuner: {
    getVersion(): Promise<string>;
    findInstallations(): Promise<string[]>;
    chooseInstallation(): Promise<string | null | { error: string }>;
    listCars(path: string): Promise<VehicleSummary[]>;
    readTextFile(path: string, vehicleId: string, relativePath: string): Promise<{ relativePath: string; content: string }>;
    saveTextFile(path: string, vehicleId: string, relativePath: string, content: string): Promise<{ backupPath: string; savedPath: string }>;
    openFolder(path: string): Promise<string>;
  };
}
