import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#070a10",
    title: "DS Car Tuner — Extreme Edition",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (isDev) {
    void mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

async function findInstallations(): Promise<string[]> {
  const candidates = [
    process.env.ASSETTO_CORSA_PATH,
    "C:\\Program Files (x86)\\Steam\\steamapps\\common\\assettocorsa",
    "C:\\Program Files\\Steam\\steamapps\\common\\assettocorsa",
    path.join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Steam", "steamapps", "common", "assettocorsa"),
    path.join(process.env.ProgramFiles ?? "C:\\Program Files", "Steam", "steamapps", "common", "assettocorsa"),
    path.join(process.env.USERPROFILE ?? "", "SteamLibrary", "steamapps", "common", "assettocorsa")
  ].filter((value): value is string => Boolean(value));

  const found = new Set<string>();
  for (const candidate of candidates) {
    const normalized = path.resolve(candidate);
    if (existsSync(path.join(normalized, "content", "cars"))) found.add(normalized);
  }
  return [...found];
}

async function scanVehicle(folderPath: string): Promise<VehicleSummary> {
  const folderName = path.basename(folderPath);
  const dataPath = path.join(folderPath, "data");
  const dataAcdPath = path.join(folderPath, "data.acd");
  const warnings: string[] = [];
  const files: VehicleFile[] = [];

  if (existsSync(dataPath)) {
    async function walk(dir: string): Promise<void> {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        warnings.push("Não foi possível ler parte da pasta data.");
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          try {
            const info = await stat(fullPath);
            const extension = path.extname(entry.name).toLowerCase();
            const kind = extension === ".ini" ? "ini" : extension === ".lut" ? "lut" : "other";
            files.push({
              name: entry.name,
              relativePath: path.relative(folderPath, fullPath),
              kind,
              readableText: kind === "ini" || kind === "lut",
              size: info.size
            });
          } catch {
            warnings.push(`Não foi possível inspecionar ${entry.name}.`);
          }
        }
      }
    }
    await walk(dataPath);
  }

  if (!existsSync(dataPath) && existsSync(dataAcdPath)) {
    warnings.push("Este carro usa data.acd. A extração/recompilação ainda não está habilitada; nenhum dado foi alterado.");
  }
  if (!existsSync(dataPath) && !existsSync(dataAcdPath)) {
    warnings.push("Não foi encontrada pasta data nem data.acd. O carro pode usar uma estrutura diferente.");
  }

  const imageCandidates = [
    path.join(folderPath, "ui", "preview.png"),
    path.join(folderPath, "ui", "preview.jpg"),
    path.join(folderPath, "ui", "preview.jpeg"),
    path.join(folderPath, "ui", "badge.png")
  ];
  // Content Manager car previews commonly live in ui/; some mods only provide skin previews.
  try {
    const skinsPath = path.join(folderPath, "skins");
    if (existsSync(skinsPath)) {
      const skins = await readdir(skinsPath, { withFileTypes: true });
      for (const skin of skins.filter((entry) => entry.isDirectory()).slice(0, 20)) {
        imageCandidates.push(
          path.join(skinsPath, skin.name, "preview.jpg"),
          path.join(skinsPath, skin.name, "preview.png")
        );
      }
    }
  } catch { /* Skin previews are optional. */ }

  let imageDataUrl: string | null = null;
  for (const imagePath of imageCandidates) {
    try {
      if (!existsSync(imagePath)) continue;
      const imageStat = await stat(imagePath);
      if (imageStat.size > 8 * 1024 * 1024) continue;
      const image = await readFile(imagePath);
      const extension = path.extname(imagePath).toLowerCase();
      const mime = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
      imageDataUrl = "data:" + mime + ";base64," + image.toString("base64");
      break;
    } catch { /* Ignore an unreadable optional preview and continue scanning. */ }
  }

  const displayName = folderName.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return {
    id: folderName,
    folderName,
    displayName,
    folderPath,
    dataPath: existsSync(dataPath) ? dataPath : null,
    dataAcdPath: existsSync(dataAcdPath) ? dataAcdPath : null,
    files: files.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
    warnings,
    imageDataUrl
  };
}

ipcMain.handle("app:version", () => app.getVersion());
ipcMain.handle("game:find-installations", async () => findInstallations());

ipcMain.handle("game:choose-installation", async () => {
  const result = await dialog.showOpenDialog({
    title: "Selecione a pasta do Assetto Corsa",
    properties: ["openDirectory"],
    buttonLabel: "Selecionar pasta"
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const chosen = result.filePaths[0];
  if (existsSync(path.join(chosen, "content", "cars"))) return chosen;

  const nested = path.join(chosen, "assettocorsa");
  if (existsSync(path.join(nested, "content", "cars"))) return nested;
  return { error: "invalid-folder" };
});

ipcMain.handle("game:list-cars", async (_event, installationPath: string) => {
  if (typeof installationPath !== "string" || !path.isAbsolute(installationPath)) {
    throw new Error("Caminho de instalação inválido.");
  }

  const carsPath = path.join(installationPath, "content", "cars");
  if (!existsSync(carsPath)) throw new Error("A pasta content/cars não foi encontrada.");

  const entries = await readdir(carsPath, { withFileTypes: true });
  const folders = entries.filter((entry) => entry.isDirectory());
  const vehicles = await Promise.all(
    folders.map((folder) => scanVehicle(path.join(carsPath, folder.name)))
  );
  return vehicles.sort((a, b) => a.displayName.localeCompare(b.displayName));
});

ipcMain.handle("game:read-text-file", async (_event, installationPath: string, vehicleId: string, relativePath: string) => {
  if (
    typeof installationPath !== "string" ||
    typeof vehicleId !== "string" ||
    typeof relativePath !== "string" ||
    vehicleId.includes("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error("Solicitação de arquivo inválida.");
  }

  const root = path.resolve(installationPath, "content", "cars", vehicleId);
  const target = path.resolve(root, relativePath);
  if (!target.startsWith(root + path.sep)) throw new Error("O caminho solicitado não é permitido.");
  const extension = path.extname(target).toLowerCase();
  if (![".ini", ".lut", ".txt"].includes(extension)) throw new Error("Este tipo de arquivo não pode ser lido por este editor.");

  const dataDirectory = path.resolve(root, "data");
  if (!target.startsWith(dataDirectory + path.sep)) throw new Error("Apenas arquivos dentro da pasta data podem ser abertos.");
  const info = await stat(target);
  if (info.size > 2_000_000) throw new Error("Arquivo muito grande para a visualização segura.");
  const content = await readFile(target, "utf8");
  return { relativePath, content };
});

ipcMain.handle("game:save-text-file", async (_event, installationPath: string, vehicleId: string, relativePath: string, content: string) => {
  if (
    typeof installationPath !== "string" ||
    typeof vehicleId !== "string" ||
    typeof relativePath !== "string" ||
    typeof content !== "string" ||
    vehicleId.includes("..") ||
    path.isAbsolute(relativePath)
  ) throw new Error("Solicitação de gravação inválida.");

  if (content.length > 2_000_000) throw new Error("O conteúdo é grande demais para salvar com segurança.");
  const root = path.resolve(installationPath, "content", "cars", vehicleId);
  const target = path.resolve(root, relativePath);
  const dataDirectory = path.resolve(root, "data");
  if (!target.startsWith(dataDirectory + path.sep)) throw new Error("Só é permitido editar arquivos dentro da pasta data.");
  const extension = path.extname(target).toLowerCase();
  if (![".ini", ".lut", ".txt"].includes(extension)) throw new Error("Este formato não pode ser editado.");
  const info = await stat(target);
  if (info.size > 2_000_000) throw new Error("Arquivo original muito grande para editar com segurança.");

  const backupRoot = path.join(root, ".ds-car-tuner-backups");
  const backupFolder = path.join(backupRoot, new Date().toISOString().replace(/[:.]/g, "-"));
  const backupPath = path.join(backupFolder, relativePath.replace(/^data[\\/]/i, ""));
  await mkdir(path.dirname(backupPath), { recursive: true });
  await copyFile(target, backupPath);
  await writeFile(target, content, "utf8");
  return { backupPath, savedPath: target };
});

ipcMain.handle("system:open-folder", async (_event, folderPath: string) => {
  if (typeof folderPath !== "string" || !path.isAbsolute(folderPath) || !existsSync(folderPath)) {
    throw new Error("Pasta inválida.");
  }
  return shell.openPath(folderPath);
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
