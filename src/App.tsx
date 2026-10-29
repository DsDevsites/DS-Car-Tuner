import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowRight, CarFront, Check, ClipboardList, Cog,
  Database, ExternalLink, FileCode2, FolderOpen, Gauge, HardDrive, Info,
  LoaderCircle, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Sparkles, X
} from "lucide-react";

type Tab = "garage" | "engine" | "gearbox" | "physics" | "profiles";
type Notice = { kind: "success" | "error" | "info"; message: string };

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function App() {
  const [tab, setTab] = useState<Tab>("garage");
  const [version, setVersion] = useState("0.1.0");
  const [installationPath, setInstallationPath] = useState("");
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [fileSearch, setFileSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInstallations, setLoadingInstallations] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [selectedFile, setSelectedFile] = useState<VehicleFile | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [editingFile, setEditingFile] = useState(false);
  const [savingFile, setSavingFile] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedId) ?? null;
  const filteredVehicles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return vehicles;
    return vehicles.filter((vehicle) =>
      vehicle.displayName.toLowerCase().includes(term) ||
      vehicle.folderName.toLowerCase().includes(term)
    );
  }, [vehicles, search]);

  useEffect(() => {
    let active = true;
    Promise.all([window.dsTuner.getVersion(), window.dsTuner.findInstallations()])
      .then(([appVersion, found]) => {
        if (!active) return;
        setVersion(appVersion);
        if (found.length === 1) {
          setInstallationPath(found[0]);
          void loadCars(found[0]);
        }
      })
      .catch((error: unknown) => {
        if (active) setNotice({ kind: "error", message: error instanceof Error ? error.message : "Não foi possível iniciar o aplicativo." });
      })
      .finally(() => {
        if (active) setLoadingInstallations(false);
      });
    return () => { active = false; };
    // Initial environment detection runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCars(path: string) {
    setLoading(true);
    setNotice(null);
    try {
      const list = await window.dsTuner.listCars(path);
      setVehicles(list);
      setSelectedId((current) => list.some((v) => v.id === current) ? current : list[0]?.id ?? "");
      setNotice({ kind: "success", message: `${list.length} veículo(s) encontrado(s). Nenhum arquivo foi alterado.` });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Falha ao listar os veículos." });
    } finally {
      setLoading(false);
    }
  }

  async function chooseInstallation() {
    const result = await window.dsTuner.chooseInstallation();
    if (!result) return;
    if (typeof result !== "string") {
      setNotice({ kind: "error", message: "Selecione a pasta principal do Assetto Corsa, que contém a pasta content/cars." });
      return;
    }
    setInstallationPath(result);
    await loadCars(result);
  }

  async function openFile(file: VehicleFile) {
    if (!installationPath || !selectedVehicle || !file.readableText) return;
    setSelectedFile(file);
    setEditingFile(false);
    setFileLoading(true);
    setShowFileModal(true);
    setFileContent("");
    try {
      const result = await window.dsTuner.readTextFile(installationPath, selectedVehicle.id, file.relativePath);
      setFileContent(result.content);
    } catch (error) {
      setFileContent(error instanceof Error ? error.message : "Não foi possível ler este arquivo.");
    } finally {
      setFileLoading(false);
    }
  }

  async function saveCurrentFile() {
    if (!installationPath || !selectedVehicle || !selectedFile || fileLoading || savingFile) return;
    setSavingFile(true);
    try {
      const result = await window.dsTuner.saveTextFile(
        installationPath, selectedVehicle.id, selectedFile.relativePath, fileContent
      );
      setEditingFile(false);
      await loadCars(installationPath);
      setNotice({
        kind: "success",
        message: `Salvo e verificado. Backup original: ${result.backupPath}`
      });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Não foi possível salvar o arquivo." });
    } finally {
      setSavingFile(false);
    }
  }

  const tabs = [
    { id: "garage" as const, label: "Minha garagem", icon: CarFront },
    { id: "engine" as const, label: "Motor & potência", icon: Activity },
    { id: "gearbox" as const, label: "Câmbio", icon: Cog },
    { id: "physics" as const, label: "Física & direção", icon: SlidersHorizontal },
    { id: "profiles" as const, label: "Perfis", icon: ClipboardList }
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Gauge size={23} strokeWidth={2.4} /></div>
          <div className="brand-copy"><strong>DS<span>CAR</span></strong><small>TUNER / EXTREME</small></div>
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>
              <Icon size={18} /><span>{label}</span>{id === "garage" && vehicles.length > 0 && <em>{vehicles.length}</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-status">
          <div className="status-icon"><ShieldCheck size={17} /></div>
          <div><strong>Modo seguro</strong><span>Edição com backup</span></div>
          <span className="status-dot" />
        </div>
        <div className="sidebar-bottom"><span>DS DEVSITES</span><span>v{version}</span></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>DS CAR TUNER</span><span className="crumb-slash">/</span><strong>{tabs.find((item) => item.id === tab)?.label}</strong></div>
          <div className="top-actions">
            <div className="online-pill"><span /> APLICATIVO LOCAL</div>
            <button className="icon-button" aria-label="Atualizar lista" title="Atualizar lista" disabled={!installationPath || loading} onClick={() => void loadCars(installationPath)}><RefreshCw size={17} className={loading ? "spin" : ""} /></button>
          </div>
        </header>

        <div className="content">
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-line" /> EXTREME VEHICLE CONFIGURATION</div>
              <h1>Seu carro.<br /><span>Suas regras.</span></h1>
              <p>Explore os arquivos físicos dos veículos, inspecione parâmetros e prepare configurações para o Assetto Corsa.</p>
              <div className="hero-buttons">
                <button className="primary-button" onClick={() => setTab("garage")}><CarFront size={17} /> Abrir garagem <ArrowRight size={16} /></button>
                <button className="secondary-button" onClick={() => void chooseInstallation()}><FolderOpen size={17} /> Localizar jogo</button>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-grid" />
              <div className="art-glow" /><CarFront className="art-car" size={160} strokeWidth={0.85} />
              <div className="art-tag tag-top"><span className="tag-dot" /> PHYSICS TOOLKIT <b>01</b></div>
              <div className="art-tag tag-bottom"><Gauge size={14} /><span>PERFORMANCE LAB</span><b>AC / PC</b></div>
              <div className="art-number">DS<span>01</span></div>
            </div>
          </section>

          {notice && <div className={`notice notice-${notice.kind}`}><span>{notice.kind === "success" ? <Check size={16} /> : notice.kind === "error" ? <AlertTriangle size={16} /> : <Info size={16} />}</span>{notice.message}<button aria-label="Fechar aviso" onClick={() => setNotice(null)}><X size={15} /></button></div>}

          <section className="stats-grid">
            <div className="stat-card"><div className="stat-top"><span className="stat-icon cyan"><CarFront size={18} /></span><span className="stat-trend">GARAGEM</span></div><div className="stat-number">{loading ? "—" : vehicles.length.toString().padStart(2, "0")}</div><div className="stat-label">Veículos identificados</div><div className="stat-foot">{installationPath ? "Instalação conectada" : "Aguardando localização do jogo"}</div></div>
            <div className="stat-card"><div className="stat-top"><span className="stat-icon purple"><Database size={18} /></span><span className="stat-trend">ARQUIVOS</span></div><div className="stat-number">{vehicles.reduce((total, vehicle) => total + vehicle.files.length, 0).toString().padStart(2, "0")}</div><div className="stat-label">Arquivos de dados</div><div className="stat-foot">INI, LUT e outros formatos</div></div>
            <div className="stat-card"><div className="stat-top"><span className="stat-icon amber"><ShieldCheck size={18} /></span><span className="stat-trend">PROTEÇÃO</span></div><div className="stat-number">100<span className="stat-unit">%</span></div><div className="stat-label">Backup antes de salvar</div><div className="stat-foot">Arquivos editáveis na área de trabalho</div></div>
          </section>

          <div className="section-heading">
            <div><div className="section-kicker">GARAGE CONTROL</div><h2>{tab === "garage" ? "Sua garagem" : tabs.find((item) => item.id === tab)?.label}</h2></div>
            <div className="section-tools"><span className="subtle-label">ASSETTO CORSA</span><button className="secondary-button small" onClick={() => void chooseInstallation()}><FolderOpen size={15} /> {installationPath ? "Trocar pasta" : "Selecionar jogo"}</button></div>
          </div>

          {tab === "garage" ? (
            workspaceOpen && selectedVehicle ? (
                          <section className="vehicle-workspace panel">
                            <div className="workspace-heading">
                              <div><div className="section-kicker">VEHICLE WORKSPACE / EDITOR</div><h3>{selectedVehicle.displayName}</h3><p>Selecione um arquivo à esquerda para abrir e editar no espaço de trabalho.</p></div>
                              <div className="workspace-heading-actions">
                                <button className="secondary-button small" onClick={() => { setWorkspaceOpen(false); setSelectedFile(null); setFileContent(""); setEditingFile(false); }}><ArrowRight size={14} className="back-arrow" /> Voltar à garagem</button>
                                <button className="secondary-button small" onClick={() => void window.dsTuner.openFolder(selectedVehicle.folderPath)}><FolderOpen size={14} /> Pasta do veículo</button>
                              </div>
                            </div>
                            <div className="workspace-grid">
                              <aside className="workspace-file-panel">
                                <div className="workspace-panel-title"><FileCode2 size={15} /><strong>Arquivos do veículo</strong><span>{selectedVehicle.files.length}</span></div>
                                <div className="file-search-box workspace-search"><Search size={14} /><input value={fileSearch} onChange={(event) => setFileSearch(event.target.value)} placeholder="Pesquisar .ini, .lut..." aria-label="Pesquisar arquivos para editar" /><button onClick={() => setFileSearch("")} title="Limpar pesquisa"><X size={13} /></button></div>
                                <div className="workspace-file-list">
                                  {selectedVehicle.files.filter((file) => { const term = fileSearch.trim().toLowerCase(); return (!term || file.name.toLowerCase().includes(term) || file.relativePath.toLowerCase().includes(term)) && file.readableText; }).map((file) => (
                                    <button key={file.relativePath} className={selectedFile?.relativePath === file.relativePath ? "workspace-file-row active" : "workspace-file-row"} onClick={() => void openFile(file)}>
                                      <span className={"file-type type-" + file.kind}>{file.kind.toUpperCase()}</span>
                                      <span className="workspace-file-name"><strong>{file.name}</strong><small>{file.relativePath}</small></span>
                                      {selectedFile?.relativePath === file.relativePath && <Check size={14} />}
                                    </button>
                                  ))}
                                </div>
                              </aside>
                              <section className="workspace-editor-panel">
                                {selectedFile ? <>
                                  <div className="workspace-editor-heading"><div><div className="section-kicker">ARQUIVO SELECIONADO</div><h4>{selectedFile.name}</h4><p>{selectedFile.relativePath}</p></div><span className="workspace-file-kind">{selectedFile.kind.toUpperCase()}</span></div>
                                  <div className="workspace-editor-notice"><ShieldCheck size={15} /> O arquivo original será copiado para backup antes de salvar.</div>
                                  <textarea className="workspace-code-editor" spellCheck={false} value={fileContent} onChange={(event) => { setFileContent(event.target.value); setEditingFile(true); }} disabled={fileLoading || savingFile} placeholder={fileLoading ? "Carregando arquivo..." : "Selecione um arquivo para começar..."} aria-label="Editor de arquivo do veículo" />
                                  <div className="workspace-editor-footer"><span>{fileLoading ? "Carregando..." : fileContent.split("\n").length + " linhas • " + fileContent.length + " caracteres"}</span><button className="primary-button small" disabled={!selectedFile || fileLoading || savingFile || !editingFile} onClick={() => void saveCurrentFile()}>{savingFile ? <LoaderCircle size={14} className="spin" /> : <ShieldCheck size={14} />}{savingFile ? "Salvando..." : "Salvar alterações com backup"}</button></div>
                                </> : <div className="workspace-empty"><FileCode2 size={34} /><h4>Escolha um arquivo para editar</h4><p>Pesquise por drivetrain.ini, engine.ini, power.lut ou outro arquivo de texto disponível.</p></div>}
                              </section>
                            </div>
                          </section>
                        ) : (
                        <div className="garage-layout">
              <section className="panel vehicle-panel">
                <div className="panel-heading">
                  <div><h3>Veículos instalados</h3><p>Selecione um carro para inspecionar seus dados.</p></div>
                  <span className="count-badge">{filteredVehicles.length} CARROS</span>
                </div>
                <div className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou pasta..." /><span>⌘ K</span></div>
                {!installationPath && !loadingInstallations && <div className="empty-state"><div className="empty-icon"><HardDrive size={24} /></div><h4>Conecte sua instalação</h4><p>Vamos procurar o Assetto Corsa nas pastas comuns do Steam ou você pode selecionar a pasta manualmente.</p><button className="primary-button" onClick={() => void chooseInstallation()}><FolderOpen size={16} /> Selecionar pasta do jogo</button></div>}
                {loadingInstallations && <div className="loading-state"><LoaderCircle size={21} className="spin" /><span>Procurando instalação do Assetto Corsa...</span></div>}
                {loading && <div className="loading-state"><LoaderCircle size={21} className="spin" /><span>Identificando veículos e arquivos...</span></div>}
                {!loading && installationPath && filteredVehicles.length === 0 && <div className="empty-small">{vehicles.length === 0 ? "Nenhum carro encontrado nesta instalação." : "Nenhum carro corresponde à busca."}</div>}
                {!loading && filteredVehicles.length > 0 && <div className="vehicle-list">{filteredVehicles.map((vehicle, index) => (
                  <button key={vehicle.id} className={`vehicle-row ${vehicle.id === selectedId ? "selected" : ""}`} onClick={() => setSelectedId(vehicle.id)}>
                    <span className="vehicle-thumb"><CarFront size={24} strokeWidth={1.5} /><i>{String(index + 1).padStart(2, "0")}</i></span>
                    <span className="vehicle-info"><strong>{vehicle.displayName}</strong><small>{vehicle.folderName}</small></span>
                    <span className={`vehicle-state ${vehicle.dataPath ? "state-ready" : "state-limited"}`}><span />{vehicle.dataPath ? "DATA" : vehicle.dataAcdPath ? "ACD" : "—"}</span>
                    <ArrowRight size={15} className="row-arrow" />
                  </button>
                ))}</div>}
                {installationPath && <div className="path-footer"><HardDrive size={14} /><span title={installationPath}>{installationPath}</span><button title="Abrir pasta do jogo" onClick={() => void window.dsTuner.openFolder(installationPath)}><ExternalLink size={14} /></button></div>}
              </section>

              <section className="panel inspector-panel">
                {selectedVehicle ? <>
                  <div className="inspector-cover">
                    <div className="cover-lines" /><div className="cover-glow" />{selectedVehicle.imageDataUrl ? <img className="cover-vehicle-image" src={selectedVehicle.imageDataUrl} alt={selectedVehicle.displayName} /> : <CarFront className="cover-car" size={116} strokeWidth={0.9} />}
                    <span className="cover-label">VEHICLE INSPECTOR <b> / 01</b></span>
                    <span className="cover-id">{selectedVehicle.folderName.toUpperCase()}</span>
                  </div>
                  <div className="inspector-title"><div><div className="section-kicker">SELECTED VEHICLE</div><h3>{selectedVehicle.displayName}</h3><p>Visão geral dos dados disponíveis</p></div><button className="icon-button" title="Abrir pasta do veículo" onClick={() => void window.dsTuner.openFolder(selectedVehicle.folderPath)}><ExternalLink size={16} /></button></div>
                  <div className="inspector-open-editor"><button className="primary-button small" onClick={() => { setWorkspaceOpen(true); setSelectedFile(null); setFileContent(""); setEditingFile(false); setFileSearch(""); }}><FileCode2 size={15} /> Abrir área de edição <ArrowRight size={14} /></button></div>
                  <div className="vehicle-metrics">
                    <div><span>ARQUIVOS</span><strong>{selectedVehicle.files.length.toString().padStart(2, "0")}</strong></div>
                    <div><span>DATA FOLDER</span><strong className={selectedVehicle.dataPath ? "good-text" : "muted-text"}>{selectedVehicle.dataPath ? "Disponível" : "Ausente"}</strong></div>
                    <div><span>DATA.ACD</span><strong className={selectedVehicle.dataAcdPath ? "warn-text" : "muted-text"}>{selectedVehicle.dataAcdPath ? "Detectado" : "Ausente"}</strong></div>
                  </div>
                  {selectedVehicle.warnings.map((warning) => <div className="vehicle-warning" key={warning}><AlertTriangle size={15} /><span>{warning}</span></div>)}
                  <div className="file-heading"><div><FileCode2 size={16} /><strong>Arquivos do veículo</strong></div><span>{selectedVehicle.files.length} ITENS</span></div>
                  <div className="file-search-box"><Search size={14} /><input value={fileSearch} onChange={(event) => setFileSearch(event.target.value)} placeholder="Pesquisar arquivo (ex.: drivetrain.ini, engine.ini, power.lut)..." aria-label="Pesquisar arquivos do veículo" /><button onClick={() => setFileSearch("")} title="Limpar pesquisa"><X size={13} /></button></div>
                  <div className="file-list">
                    {selectedVehicle.files.filter((file) => { const term = fileSearch.trim().toLowerCase(); return !term || file.name.toLowerCase().includes(term) || file.relativePath.toLowerCase().includes(term); }).map((file) => <div className="file-row" key={file.relativePath}>
                      <span className={`file-type type-${file.kind}`}>{file.kind === "ini" ? "INI" : file.kind === "lut" ? "LUT" : "FILE"}</span>
                      <div className="file-info"><strong>{file.name}</strong><small>{file.relativePath}</small></div>
                      <span className="file-size">{formatBytes(file.size)}</span>
                      {file.readableText ? <button className="view-file-button" onClick={() => void openFile(file)}>Ver</button> : <span className="unavailable-chip">—</span>}
                    </div>)}
                    {selectedVehicle.files.filter((file) => { const term = fileSearch.trim().toLowerCase(); return !term || file.name.toLowerCase().includes(term) || file.relativePath.toLowerCase().includes(term); }).length === 0 && <div className="empty-small">Nenhum arquivo corresponde à pesquisa.</div>}
                    {selectedVehicle.files.length === 0 && <div className="empty-small">Nenhum arquivo de dados aberto foi encontrado para este carro.</div>}
                  </div>
                  <div className="inspector-note"><ShieldCheck size={16} /><span><strong>Modo seguro</strong> — abra a área de edição para alterar arquivos de texto; o original é copiado para backup antes de salvar.</span></div>
                </> : <div className="empty-state inspector-empty"><div className="empty-icon"><CarFront size={26} /></div><h4>Nenhum veículo selecionado</h4><p>Escolha um veículo na lista para ver os arquivos que podem ser analisados.</p></div>}
              </section>
            </div>
            )
          ) : tab === "engine" ? (
            <PowerPresetPanel vehicle={selectedVehicle} installationPath={installationPath} onNotice={setNotice} onRefresh={() => installationPath ? loadCars(installationPath) : Promise.resolve()} />
          ) : (
            <FeaturePlaceholder tab={tab} vehicle={selectedVehicle} onBack={() => setTab("garage")} />
          )}

          <footer className="footer"><span>DS CAR TUNER <i>•</i> EXTREME EDITION</span><span><span className="footer-dot" /> ALL SYSTEMS LOCAL <i>•</i> BUILD {version}</span></footer>
        </div>
      </main>

      {showFileModal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowFileModal(false); }}>
        <section className="file-modal" role="dialog" aria-modal="true" aria-labelledby="file-modal-title">
          <div className="modal-header"><div className="modal-file-icon"><FileCode2 size={19} /></div><div><h3 id="file-modal-title">{selectedFile?.name ?? "Arquivo"}</h3><p>{selectedFile?.relativePath ?? ""}</p></div><button className="icon-button" onClick={() => setShowFileModal(false)} aria-label="Fechar"><X size={18} /></button></div>
          <div className="modal-warning"><ShieldCheck size={15} /> {editingFile ? "Modo de edição. Ao salvar, o original será copiado para um backup antes da gravação." : "Visualização do arquivo. Use Editar para alterar este INI/LUT; o salvamento cria backup automático."}</div>
          {editingFile ? <textarea className="code-view code-editor" spellCheck={false} value={fileContent} onChange={(event) => setFileContent(event.target.value)} disabled={fileLoading || savingFile} aria-label="Conteúdo editável do arquivo" /> : <pre className="code-view">{fileLoading ? "Carregando arquivo..." : fileContent}</pre>}
          <div className="modal-footer"><span>{fileContent.split("\n").length} linhas aproximadas</span><div className="modal-actions">{selectedFile && ["ini", "lut"].includes(selectedFile.kind) && <button className="secondary-button small" disabled={fileLoading || savingFile} onClick={() => setEditingFile((value) => !value)}>{editingFile ? "Voltar à leitura" : "Editar arquivo"}</button>}{editingFile && <button className="primary-button small" disabled={fileLoading || savingFile} onClick={() => void saveCurrentFile()}>{savingFile ? "Salvando..." : "Salvar com backup"}</button>}<button className="secondary-button small" onClick={() => setShowFileModal(false)}>Fechar</button></div></div>
        </section>
      </div>}
    </div>
  );
}


function PowerPresetPanel({ vehicle, installationPath, onNotice, onRefresh }: {
  vehicle: VehicleSummary | null;
  installationPath: string;
  onNotice: (notice: Notice | null) => void;
  onRefresh: () => Promise<void>;
}) {
  const [targetHp, setTargetHp] = useState(800);
  const [customHp, setCustomHp] = useState("800");
  const [disableAcd, setDisableAcd] = useState(false);
  const [applying, setApplying] = useState(false);
  const [curveLoading, setCurveLoading] = useState(false);
  const [originalPeak, setOriginalPeak] = useState<number | null>(null);
  const [curveError, setCurveError] = useState("");
  const powerFile = vehicle?.files.find((file) => file.relativePath.toLowerCase() === "data/power.lut");
  const engineFile = vehicle?.files.find((file) => file.relativePath.toLowerCase() === "data/engine.ini");
  const selectedTarget = targetHp === -1 ? Number(customHp) : targetHp;
  const canApply = Boolean(vehicle && installationPath && powerFile?.readableText && engineFile?.readableText &&
    Number.isFinite(selectedTarget) && selectedTarget >= 100 && selectedTarget <= 3000 && !curveLoading && !applying);

  useEffect(() => {
    let active = true;
    setOriginalPeak(null);
    setCurveError("");
    if (!vehicle || !installationPath || !powerFile?.readableText) {
      setCurveError("Este veículo não possui data/power.lut legível.");
      return () => { active = false; };
    }
    setCurveLoading(true);
    window.dsTuner.readTextFile(installationPath, vehicle.id, powerFile.relativePath)
      .then(({ content }) => {
        const points: Array<{ rpm: number; torque: number }> = [];
        for (const line of content.split(/\r?\n/)) {
          const match = line.trim().match(/^([+-]?(?:\d+\.?\d*|\.\d+))\s*\|\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*$/);
          if (match) points.push({ rpm: Number(match[1]), torque: Number(match[2]) });
        }
        if (points.length < 3) throw new Error("Formato não reconhecido. Esperado: RPM|torque.");
        const peak = Math.max(...points.map((point) => point.rpm * point.torque / 7023.5));
        if (!Number.isFinite(peak) || peak < 1) throw new Error("A curva não tem potência calculável.");
        if (active) setOriginalPeak(peak);
      })
      .catch((error: unknown) => { if (active) setCurveError(error instanceof Error ? error.message : "Falha ao ler a curva."); })
      .finally(() => { if (active) setCurveLoading(false); });
    return () => { active = false; };
  }, [vehicle?.id, installationPath, powerFile?.relativePath]);

  async function applyPreset() {
    if (!vehicle || !canApply) return;
    if (vehicle.dataAcdPath && !disableAcd) {
      onNotice({ kind: "info", message: "Este carro possui data.acd. Se esse arquivo estiver ativo, o jogo pode ignorar a pasta data. Marque a opção para desativá-lo apenas se quiser usar a pasta data descompactada." });
      return;
    }
    const confirmed = window.confirm(
      "Aplicar preparação de " + selectedTarget + " HP estimados em " + vehicle.displayName +
      "?\n\nSerá criado backup de power.lut. O câmbio e o limitador não serão alterados. Feche o jogo antes de continuar."
    );
    if (!confirmed) return;
    setApplying(true);
    onNotice(null);
    try {
      const result = await window.dsTuner.applyPowerPreset(installationPath, vehicle.id, selectedTarget, disableAcd);
      await onRefresh();
      onNotice({ kind: "success", message: "Preparação aplicada. Potência estimada: " +
        result.originalPeakHp.toFixed(0) + " → " + result.targetPeakHp.toFixed(0) +
        " HP/CV. Backup: " + result.backupPath +
        (result.acdDisabled ? " | data.acd renomeado para data.acd.bak." : "") });
      setOriginalPeak(result.targetPeakHp);
    } catch (error) {
      onNotice({ kind: "error", message: error instanceof Error ? error.message : "Não foi possível aplicar a preparação." });
    } finally {
      setApplying(false);
    }
  }

  return <section className="power-lab">
    <div className="power-lab-intro panel">
      <div className="power-lab-orb"><Activity size={34} /></div>
      <div><div className="section-kicker">ENGINE / POWER PRESETS</div><h3>Preparação de motor</h3>
        <p>Escolha uma meta de potência. A curva original será escalada proporcionalmente, validada e salva com backup.</p></div>
      <div className="power-lab-badge"><ShieldCheck size={14} /> BACKUP + VALIDAÇÃO</div>
    </div>
    {!vehicle ? <div className="panel power-empty"><CarFront size={28} /><h4>Selecione um veículo na garagem</h4><p>Escolha um carro antes de preparar o motor.</p></div> : <>
      <div className="power-selected panel">
        <div><div className="section-kicker">VEÍCULO SELECIONADO</div><h4>{vehicle.displayName}</h4><p>{vehicle.folderName}</p></div>
        <div className="power-file-status">
          <span className={powerFile?.readableText ? "power-status-good" : "power-status-bad"}><i /> power.lut {powerFile?.readableText ? "encontrado" : "ausente"}</span>
          <span className={engineFile?.readableText ? "power-status-good" : "power-status-bad"}><i /> engine.ini {engineFile?.readableText ? "encontrado" : "ausente"}</span>
          <span className={vehicle.dataAcdPath ? "power-status-warn" : "power-status-good"}><i /> data.acd {vehicle.dataAcdPath ? "presente" : "ausente"}</span>
        </div>
      </div>
      <div className="power-preset-grid">
        {[500, 800, 1000].map((hp) => <button key={hp} className={"power-preset-card " + (targetHp === hp ? "active" : "")} onClick={() => { setTargetHp(hp); setCustomHp(String(hp)); }}>
          <span className="power-preset-tag">{hp === 500 ? "STAGE 1" : hp === 800 ? "STAGE 2" : "STAGE 3"}</span>
          <strong>{hp.toLocaleString("pt-BR")}<small> HP</small></strong>
          <span className="power-preset-description">{hp === 500 ? "Meta inicial" : hp === 800 ? "Preparação extrema" : "Meta experimental"}</span>
        </button>)}
        <div className={"power-preset-card custom " + (targetHp === -1 ? "active" : "")}>
          <span className="power-preset-tag">PERSONALIZADO</span><label htmlFor="custom-hp">Potência alvo (100–3000)</label>
          <input id="custom-hp" type="number" min="100" max="3000" step="25" value={customHp} onFocus={() => setTargetHp(-1)} onChange={(event) => { setTargetHp(-1); setCustomHp(event.target.value); }} />
          <span className="power-preset-description">Defina sua própria meta</span>
        </div>
      </div>
      <div className="power-config-grid">
        <section className="panel power-config-card">
          <div className="panel-heading"><div><h3>Verificação da curva</h3><p>Estimativa calculada por RPM × torque.</p></div><Gauge size={20} color="#56e5fc" /></div>
          <div className="power-metrics">
            <div><span>POTÊNCIA ORIGINAL</span><strong>{curveLoading ? "Lendo..." : originalPeak === null ? "—" : Math.round(originalPeak) + " HP"}</strong></div>
            <div><span>META SELECIONADA</span><strong>{Number.isFinite(selectedTarget) ? Math.round(selectedTarget) + " HP" : "Inválida"}</strong></div>
            <div><span>CURVA</span><strong>{originalPeak === null ? "Aguardando" : "Escala proporcional"}</strong></div>
          </div>
          {curveError && <div className="power-inline-warning"><AlertTriangle size={15} />{curveError}</div>}
          {originalPeak !== null && <div className="power-inline-note"><Info size={15} /> Escalar torque não simula turbo nem reforça embreagem, pneus ou transmissão. A meta é uma estimativa matemática, não garantia de dirigibilidade.</div>}
        </section>
        <section className="panel power-config-card">
          <div className="panel-heading"><div><h3>Segurança de aplicação</h3><p>Controle data.acd de forma explícita.</p></div><ShieldCheck size={20} color="#6ee7b7" /></div>
          <label className={"power-check " + (!vehicle.dataAcdPath ? "disabled" : "")}>
            <input type="checkbox" checked={disableAcd} disabled={!vehicle.dataAcdPath} onChange={(event) => setDisableAcd(event.target.checked)} />
            <span><strong>Renomear data.acd para data.acd.bak</strong><small>Use somente para forçar o jogo a usar a pasta data descompactada. Se data.acd.bak já existir, a ação será bloqueada.</small></span>
          </label>
          <div className="power-inline-note"><Info size={15} /> Só alteramos power.lut. O câmbio, limitador e suspensão permanecem como estão. Carros que só têm data.acd ainda precisam de extração, não suportada aqui.</div>
        </section>
      </div>
      <div className="power-apply-bar panel">
        <div><span className="section-kicker">READY TO APPLY</span><strong>{Number.isFinite(selectedTarget) ? selectedTarget.toLocaleString("pt-BR") + " HP" : "Meta inválida"} <small>para {vehicle.displayName}</small></strong><p>Feche o Assetto Corsa antes de aplicar.</p></div>
        <button className="primary-button" disabled={!canApply} onClick={() => void applyPreset()}>{applying ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}{applying ? "Aplicando..." : "Aplicar preparação"}<ArrowRight size={15} /></button>
      </div>
    </>}
  </section>;
}

function FeaturePlaceholder({ tab, vehicle, onBack }: { tab: Tab; vehicle: VehicleSummary | null; onBack: () => void }) {
  const details = {
    engine: { icon: Activity, title: "Editor de motor", text: "Leia os parâmetros de potência, torque, RPM e turbo dos arquivos de dados de um veículo antes de preparar qualquer ajuste.", items: ["Curvas de potência (.lut)", "Parâmetros de motor (engine.ini)", "Limitadores e resposta do motor"] },
    gearbox: { icon: Cog, title: "Editor de câmbio", text: "Analise relações de marcha e parâmetros de transmissão. Os cálculos serão baseados nos dados reais encontrados para o carro.", items: ["Relações por marcha", "Diferencial e transmissão", "Estimativa de velocidade por marcha"] },
    physics: { icon: SlidersHorizontal, title: "Física & direção", text: "Inspecione os parâmetros disponíveis de suspensão, direção, pneus e aderência, respeitando os formatos de cada mod.", items: ["Suspensão e alinhamento", "Direção e esterçamento", "Pneus, freios e aderência"] },
    profiles: { icon: ClipboardList, title: "Perfis de preparação", text: "Prepare perfis separados para projetos de arrancada, drift, circuito e velocidade final sem perder de vista a configuração original.", items: ["Original / backup", "Arrancada e velocidade final", "Drift e circuito"] },
    garage: { icon: CarFront, title: "Sua garagem", text: "", items: [] }
  }[tab];
  const Icon = details.icon;
  return <section className="feature-placeholder panel">
    <div className="feature-visual"><div className="feature-rings" /><Icon size={54} strokeWidth={1.1} /><span>MODULE / {tab.toUpperCase()}</span></div>
    <div className="feature-content"><div className="section-kicker">MÓDULO EM DESENVOLVIMENTO</div><h3>{details.title}</h3><p>{details.text}</p>
      <div className="feature-items">{details.items.map((item) => <div key={item}><span><Check size={14} /></span>{item}</div>)}</div>
      <div className="feature-notice"><Sparkles size={16} /><span>{vehicle ? `Veículo selecionado: ${vehicle.displayName}. ` : "Selecione primeiro um veículo na garagem. "}O módulo será ativado nas próximas etapas; nenhum ajuste é aplicado nesta tela.</span></div>
      <button className="primary-button" onClick={onBack}><CarFront size={16} /> Voltar para a garagem <ArrowRight size={15} /></button>
    </div>
  </section>;
}

export default App;
