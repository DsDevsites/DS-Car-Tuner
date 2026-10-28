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
  const [loading, setLoading] = useState(false);
  const [loadingInstallations, setLoadingInstallations] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [selectedFile, setSelectedFile] = useState<VehicleFile | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);

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
          <div><strong>Modo seguro</strong><span>Leitura por padrão</span></div>
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
            <div className="stat-card"><div className="stat-top"><span className="stat-icon amber"><ShieldCheck size={18} /></span><span className="stat-trend">PROTEÇÃO</span></div><div className="stat-number">100<span className="stat-unit">%</span></div><div className="stat-label">Modo somente leitura</div><div className="stat-foot">Nenhuma modificação gravada</div></div>
          </section>

          <div className="section-heading">
            <div><div className="section-kicker">GARAGE CONTROL</div><h2>{tab === "garage" ? "Sua garagem" : tabs.find((item) => item.id === tab)?.label}</h2></div>
            <div className="section-tools"><span className="subtle-label">ASSETTO CORSA</span><button className="secondary-button small" onClick={() => void chooseInstallation()}><FolderOpen size={15} /> {installationPath ? "Trocar pasta" : "Selecionar jogo"}</button></div>
          </div>

          {tab === "garage" ? (
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
                    <div className="cover-lines" /><div className="cover-glow" /><CarFront className="cover-car" size={116} strokeWidth={0.9} />
                    <span className="cover-label">VEHICLE INSPECTOR <b> / 01</b></span>
                    <span className="cover-id">{selectedVehicle.folderName.toUpperCase()}</span>
                  </div>
                  <div className="inspector-title"><div><div className="section-kicker">SELECTED VEHICLE</div><h3>{selectedVehicle.displayName}</h3><p>Visão geral dos dados disponíveis</p></div><button className="icon-button" title="Abrir pasta do veículo" onClick={() => void window.dsTuner.openFolder(selectedVehicle.folderPath)}><ExternalLink size={16} /></button></div>
                  <div className="vehicle-metrics">
                    <div><span>ARQUIVOS</span><strong>{selectedVehicle.files.length.toString().padStart(2, "0")}</strong></div>
                    <div><span>DATA FOLDER</span><strong className={selectedVehicle.dataPath ? "good-text" : "muted-text"}>{selectedVehicle.dataPath ? "Disponível" : "Ausente"}</strong></div>
                    <div><span>DATA.ACD</span><strong className={selectedVehicle.dataAcdPath ? "warn-text" : "muted-text"}>{selectedVehicle.dataAcdPath ? "Detectado" : "Ausente"}</strong></div>
                  </div>
                  {selectedVehicle.warnings.map((warning) => <div className="vehicle-warning" key={warning}><AlertTriangle size={15} /><span>{warning}</span></div>)}
                  <div className="file-heading"><div><FileCode2 size={16} /><strong>Arquivos do veículo</strong></div><span>{selectedVehicle.files.length} ITENS</span></div>
                  <div className="file-list">
                    {selectedVehicle.files.slice(0, 8).map((file) => <div className="file-row" key={file.relativePath}>
                      <span className={`file-type type-${file.kind}`}>{file.kind === "ini" ? "INI" : file.kind === "lut" ? "LUT" : "FILE"}</span>
                      <div className="file-info"><strong>{file.name}</strong><small>{file.relativePath}</small></div>
                      <span className="file-size">{formatBytes(file.size)}</span>
                      {file.readableText ? <button className="view-file-button" onClick={() => void openFile(file)}>Ver</button> : <span className="unavailable-chip">—</span>}
                    </div>)}
                    {selectedVehicle.files.length > 8 && <div className="more-files">+ {selectedVehicle.files.length - 8} arquivos adicionais na pasta do veículo.</div>}
                    {selectedVehicle.files.length === 0 && <div className="empty-small">Nenhum arquivo de dados aberto foi encontrado para este carro.</div>}
                  </div>
                  <div className="inspector-note"><ShieldCheck size={16} /><span><strong>Inspeção segura</strong> — nesta versão, os arquivos são lidos sem modificar o conteúdo original.</span></div>
                </> : <div className="empty-state inspector-empty"><div className="empty-icon"><CarFront size={26} /></div><h4>Nenhum veículo selecionado</h4><p>Escolha um veículo na lista para ver os arquivos que podem ser analisados.</p></div>}
              </section>
            </div>
          ) : (
            <FeaturePlaceholder tab={tab} vehicle={selectedVehicle} onBack={() => setTab("garage")} />
          )}

          <footer className="footer"><span>DS CAR TUNER <i>•</i> EXTREME EDITION</span><span><span className="footer-dot" /> ALL SYSTEMS LOCAL <i>•</i> BUILD {version}</span></footer>
        </div>
      </main>

      {showFileModal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowFileModal(false); }}>
        <section className="file-modal" role="dialog" aria-modal="true" aria-labelledby="file-modal-title">
          <div className="modal-header"><div className="modal-file-icon"><FileCode2 size={19} /></div><div><h3 id="file-modal-title">{selectedFile?.name ?? "Arquivo"}</h3><p>{selectedFile?.relativePath ?? ""}</p></div><button className="icon-button" onClick={() => setShowFileModal(false)} aria-label="Fechar"><X size={18} /></button></div>
          <div className="modal-warning"><ShieldCheck size={15} /> Visualização somente leitura. Nenhuma alteração pode ser salva nesta versão.</div>
          <pre className="code-view">{fileLoading ? "Carregando arquivo..." : fileContent}</pre>
          <div className="modal-footer"><span>{fileContent.split("\n").length} linhas aproximadas</span><button className="secondary-button small" onClick={() => setShowFileModal(false)}>Fechar visualização</button></div>
        </section>
      </div>}
    </div>
  );
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
