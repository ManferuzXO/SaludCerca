import { type FormEvent, useEffect, useRef, useState } from "react";
import { centers, type Center } from "./data";
import { HealthMap } from "./components/HealthMap";
import {
  getCenterAvailability,
  getCenters,
  updateCenterAvailability,
} from "./api/centers";
import { clearSession, getSession, login, register } from "./api/auth";
import {
  cancelAppointment,
  createAppointment,
  getAppointmentSlots,
  getMyAppointments,
  type Appointment,
  type AppointmentSlot,
} from "./api/appointments";
import { chatWithAssistant, synthesizeAssistantSpeech, transcribeAssistantAudio } from "./api/assistant";
import { createTriageReply, type TriageReply } from "./triage";

type Route =
  | "/"
  | "/centros"
  | "/ficha"
  | "/mis-fichas"
  | "/asistente"
  | "/como-funciona"
  | "/operador"
  | "/ingresar";
const routes: Route[] = [
  "/",
  "/centros",
  "/ficha",
  "/mis-fichas",
  "/asistente",
  "/como-funciona",
  "/operador",
  "/ingresar",
];

function useRoute() {
  const readRoute = (): Route =>
    routes.includes(location.pathname as Route)
      ? (location.pathname as Route)
      : "/";
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onPop = () => setRoute(readRoute());
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);
  const navigate = (to: Route) => {
    history.pushState({}, "", to);
    setRoute(to);
    scrollTo({ top: 0, behavior: "smooth" });
  };
  return { route, navigate };
}

const Icon = ({ children }: { children: string }) => (
  <span className="icon" aria-hidden="true">
    {children}
  </span>
);

function Preload() {
  return (
    <div className="preload">
      <div className="preload-logo">
        <span>✚</span> Salud<b>Cerca</b>
      </div>
      <div className="preload-line">
        <i />
      </div>
      <p>Acercando la salud a tu comunidad</p>
    </div>
  );
}

function Header({
  navigate,
  route,
}: {
  navigate: (to: Route) => void;
  route: Route;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const session = getSession();
  const go = (to: Route) => {
    navigate(to);
    setMenuOpen(false);
  };
  return (
    <header className="topbar">
      <button className="brand brand-button" onClick={() => go("/")}>
        <span className="brand-mark">✚</span>
        <span>
          Salud<span>Cerca</span>
        </span>
      </button>
      <nav className="desktop-nav">
        <button
          className={route === "/" ? "nav-active" : ""}
          onClick={() => go("/")}
        >
          Inicio
        </button>
        <button
          className={route === "/centros" ? "nav-active" : ""}
          onClick={() => go("/centros")}
        >
          Centros de salud
        </button>
        <button
          className={route === "/como-funciona" ? "nav-active" : ""}
          onClick={() => go("/como-funciona")}
        >
          ¿Cómo funciona?
        </button>
      </nav>
      <button
        className="profile"
        onClick={() => (session ? (clearSession(), go("/")) : go("/ingresar"))}
      >
        <Icon>◉</Icon> {session ? "Salir" : "Ingresar"}
      </button>
      <button
        className={`menu-toggle ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={menuOpen}
      >
        <i />
        <i />
        <i />
      </button>
      <button
        className={`menu-backdrop ${menuOpen ? "visible" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-label="Cerrar menú"
        tabIndex={menuOpen ? 0 : -1}
      />
      <aside
        className={`mobile-menu ${menuOpen ? "visible" : ""}`}
        aria-hidden={!menuOpen}
      >
        <div className="mobile-menu-head">
          <span>Menú</span>
          <button onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
            ×
          </button>
        </div>
        <button
          className={route === "/" ? "active" : ""}
          onClick={() => go("/")}
        >
          <span>⌂</span> Inicio
        </button>
        <button
          className={route === "/centros" ? "active" : ""}
          onClick={() => go("/centros")}
        >
          <span>⌖</span> Centros de salud
        </button>
        <button
          className={route === "/como-funciona" ? "active" : ""}
          onClick={() => go("/como-funciona")}
        >
          <span>◎</span> ¿Cómo funciona?
        </button>
        <hr />
        <button
          onClick={() =>
            session ? (clearSession(), go("/")) : go("/ingresar")
          }
        >
          <span>◉</span> {session ? "Cerrar sesión" : "Ingresar"}
        </button>
        <small>SaludCerca · Atención cerca de ti</small>
      </aside>
    </header>
  );
}

function Footer({ navigate }: { navigate: (to: Route) => void }) {
  return (
    <footer>
      <div className="brand">
        <span className="brand-mark">✚</span>
        <span>
          Salud<span>Cerca</span>
        </span>
      </div>
      <p>Conectamos a las personas con la atención que necesitan.</p>
      <div>
        <button onClick={() => navigate("/centros")}>Centros</button>
        <button onClick={() => navigate("/asistente")}>Asistente</button>
        <button onClick={() => navigate("/operador")}>Acceso operador</button>
      </div>
      <small>Proyecto académico · Datos de demostración</small>
    </footer>
  );
}

function CitizenActions({
  navigate,
  route,
}: {
  navigate: (to: Route) => void;
  route: Route;
}) {
  const session = getSession();
  if (!session || session.user.role !== "CITIZEN") return null;
  return (
    <div className="citizen-actions">
      <span>Hola, {session.user.fullName.split(" ")[0]}</span>
      <button
        className={route === "/mis-fichas" ? "active" : ""}
        onClick={() => navigate("/mis-fichas")}
      >
        Mis fichas
      </button>
    </div>
  );
}

function MyAppointmentsPage({ navigate }: { navigate: (to: Route) => void }) {
  const session = getSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(Boolean(session));
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const load = async () => {
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      setAppointments(await getMyAppointments(session.accessToken));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudieron cargar tus fichas.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const cancel = async (id: string) => {
    if (
      !session ||
      !confirm(
        "¿Quieres cancelar esta ficha? El cupo se liberará para otra persona.",
      )
    )
      return;
    setCancellingId(id);
    setError("");
    try {
      await cancelAppointment(id, session.accessToken);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo cancelar la ficha.",
      );
    } finally {
      setCancellingId(null);
    }
  };
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("es-BO", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(value));
  if (!session)
    return (
      <section className="my-appointments page">
        <div className="api-message error-message">
          <b>Inicia sesión para ver tus fichas.</b>
          <span>Tu historial de reservas estará asociado a tu cuenta.</span>
          <button className="primary" onClick={() => navigate("/ingresar")}>
            Iniciar sesión
          </button>
        </div>
      </section>
    );
  return (
    <section className="my-appointments page">
      <div className="page-intro">
        <span className="eyebrow">MI ATENCIÓN</span>
        <h1>Mis fichas</h1>
        <p>
          Consulta, presenta el código o cancela tu ficha antes de la atención.
        </p>
      </div>
      {loading ? (
        <div className="api-message">
          <span className="loading-ring" /> Cargando tus fichas…
        </div>
      ) : error ? (
        <div className="api-message error-message">
          <b>No pudimos cargar tus fichas.</b>
          <span>{error}</span>
          <button className="primary" onClick={() => void load()}>
            Reintentar
          </button>
        </div>
      ) : !appointments.length ? (
        <div className="empty-appointments">
          <span>▣</span>
          <h2>Aún no tienes fichas reservadas</h2>
          <p>
            El sistema reservará atención en el centro más cercano a tu
            ubicación.
          </p>
          <button className="primary" onClick={() => navigate("/centros")}>
            Buscar un centro
          </button>
        </div>
      ) : (
        <div className="appointment-list">
          {appointments.map((item) => {
            const active = item.status === "BOOKED";
            return (
              <article className="appointment-card" key={item.id}>
                <div className="appointment-card-top">
                  <span className="type">
                    FICHA {active ? "ACTIVA" : "HISTÓRICA"}
                  </span>
                  <span
                    className={
                      active
                        ? "appointment-status"
                        : "appointment-status cancelled"
                    }
                  >
                    ● {active ? "Reservada" : "Cancelada"}
                  </span>
                </div>
                <h2>{item.center}</h2>
                <p className="appointment-address">
                  <Icon>⌖</Icon>
                  {item.address}
                </p>
                <div className="appointment-info">
                  <p>
                    <b>Servicio</b>
                    {item.service}
                  </p>
                  <p>
                    <b>Fecha y hora</b>
                    {formatDate(item.startsAt)}
                  </p>
                </div>
                <div className="appointment-code">
                  <small>CÓDIGO DE ATENCIÓN</small>
                  <strong>{item.code}</strong>
                  <span>Preséntalo al llegar al establecimiento.</span>
                </div>
                {active && (
                  <button
                    className="cancel-appointment"
                    disabled={cancellingId === item.id}
                    onClick={() => void cancel(item.id)}
                  >
                    {cancellingId === item.id
                      ? "Cancelando…"
                      : "Cancelar ficha"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function App() {
  const { route, navigate } = useRoute();
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState(centers[0]);
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1450);
    return () => clearTimeout(timer);
  }, []);
  if (loading) return <Preload />;
  const page =
    route === "/" ? (
      <Home navigate={navigate} />
    ) : route === "/centros" ? (
      <Centers navigate={navigate} choose={setCenter} />
    ) : route === "/ficha" ? (
      <Appointment center={center} navigate={navigate} />
    ) : route === "/mis-fichas" ? (
      <MyAppointmentsPage navigate={navigate} />
    ) : route === "/asistente" ? (
      <Assistant navigate={navigate} />
    ) : route === "/operador" ? (
      <OperatorDashboard navigate={navigate} />
    ) : route === "/ingresar" ? (
      <LoginPage navigate={navigate} />
    ) : (
      <How navigate={navigate} />
    );
  return (
    <>
      <Header navigate={navigate} route={route} />
      <CitizenActions navigate={navigate} route={route} />
      <main>{page}</main>
      <Footer navigate={navigate} />
    </>
  );
}

function Home({ navigate }: { navigate: (to: Route) => void }) {
  return (
    <>
      <section className="hero home-hero">
        <div className="hero-copy">
          <span className="eyebrow">CUIDADO MÉDICO A UN PASO</span>
          <h1>
            Tu salud, <em>más cerca.</em>
          </h1>
          <p>
            Encuentra atención, disponibilidad y medicamentos en centros
            municipales de tu ciudad.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={() => navigate("/centros")}>
              Buscar un centro →
            </button>
            <button className="outline" onClick={() => navigate("/asistente")}>
              ✦ Hablar con el asistente
            </button>
          </div>
          <div className="emergency">
            <Icon>!</Icon>
            <div>
              <strong>¿Es una emergencia?</strong>
              <span>
                Acude al centro de urgencias más cercano o llama a emergencias.
              </span>
            </div>
          </div>
        </div>
        <div className="hero-shape" aria-hidden="true">
          <div className="pulse p1" />
          <div className="pulse p2" />
          <span>✚</span>
        </div>
      </section>
      <section className="quick-links">
        <button onClick={() => navigate("/centros")}>
          <span>⌖</span>
          <b>Encuentra atención</b>
          <small>Centros cerca de ti</small>
        </button>
        <button onClick={() => navigate("/ficha")}>
          <span>▣</span>
          <b>Solicita tu ficha</b>
          <small>Reserva tu atención</small>
        </button>
        <button onClick={() => navigate("/asistente")}>
          <span>✦</span>
          <b>Orientación inicial</b>
          <small>Habla con el asistente</small>
        </button>
      </section>
      <section className="home-info">
        <div>
          <span className="eyebrow">SALUDCerca</span>
          <h2>
            Atención más clara,
            <br />
            <em>decisiones más fáciles.</em>
          </h2>
        </div>
        <p>
          Consulta horarios, tiempo de espera y disponibilidad antes de salir de
          casa. SaludCerca te ayuda a encontrar el lugar adecuado para tu
          atención.
        </p>
      </section>
    </>
  );
}

function Centers({
  navigate,
  choose,
}: {
  navigate: (to: Route) => void;
  choose: (center: Center) => void;
}) {
  const [query, setQuery] = useState("");
  const [service, setService] = useState("Todos los servicios");
  const [selected, setSelected] = useState<Center | null>(null);
  const [filtered, setFiltered] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userPosition, setUserPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [recommended, setRecommended] = useState<Center | null>(null);
  const loadCenters = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getCenters({ query, service });
      setFiltered(result);
      setSelected(
        (current) =>
          result.find((center) => center.id === current?.id) ??
          result[0] ??
          null,
      );
    } catch {
      setFiltered([]);
      setSelected(null);
      setError(
        "No pudimos conectarnos a la API. Verifica que el backend esté iniciado en el puerto 3000.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCenters();
    }, 250);
    return () => clearTimeout(timer);
  }, [query, service]);
  const select = (c: Center) => {
    setSelected(c);
    choose(c);
  };
  const applyLocation = (location: { latitude: number; longitude: number }) => {
    setFiltered((current) => {
      const ordered = current
        .map((center) => {
          if (center.latitude === undefined || center.longitude === undefined) {
            return { center: { ...center, distance: "Ubicación pendiente" }, distance: Number.POSITIVE_INFINITY };
          }
          const latDistance = (center.latitude - location.latitude) * 111;
          const lngDistance = (center.longitude - location.longitude) * 111 * Math.cos((location.latitude * Math.PI) / 180);
          const distance = Math.sqrt(latDistance ** 2 + lngDistance ** 2);
          return { center: { ...center, distance: `${distance.toFixed(1).replace(".", ",")} km` }, distance };
        })
        .sort((a, b) => a.distance - b.distance);
      const sortedCenters = ordered.map(({ center }) => center);
      const nearest = sortedCenters.find((center) => center.latitude !== undefined && center.longitude !== undefined) ?? null;
      setRecommended(nearest);
      if (nearest) {
        setSelected(nearest);
        choose(nearest);
      }
      return sortedCenters;
    });
    setLocationMessage("Ubicación detectada. Te recomendamos el centro verificado más cercano.");
  };
  const locate = () => {
    if (!window.isSecureContext) {
      setLocationMessage("Para usar ubicación desde el celular abre SaludCerca mediante un enlace HTTPS (túnel o despliegue), no con la IP local.");
      return;
    }
    if (!navigator.geolocation) { setLocationMessage("Tu navegador no permite usar ubicación."); return; }
    setLocationMessage("Buscando tu ubicación…");
    navigator.geolocation.getCurrentPosition((position) => {
      const location = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setUserPosition(location);
      applyLocation(location);
      return;
      setFiltered((current) => {
        const ordered = current.map((center) => {
          if (center.latitude === undefined || center.longitude === undefined) return center;
          const latDistance = (center.latitude - location.latitude) * 111;
          const lngDistance = (center.longitude - location.longitude) * 111 * Math.cos(location.latitude * Math.PI / 180);
          const distance = Math.sqrt(latDistance ** 2 + lngDistance ** 2);
          return { ...center, distance: `${distance.toFixed(1).replace(".", ",")} km` };
        }).sort((a, b) => Number.parseFloat(a.distance.replace(",", ".")) - Number.parseFloat(b.distance.replace(",", ".")));
        if (ordered[0]) select(ordered[0]);
        return ordered;
      });
      setLocationMessage("Centros ordenados desde el más cercano.");
    }, () => setLocationMessage("No pudimos obtener tu ubicación. Revisa el permiso del navegador."), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };
  return (
    <section className="page centers-page">
      <div className="page-intro">
        <span className="eyebrow">CENTROS MUNICIPALES</span>
        <h1>Encuentra atención cerca de ti</h1>
        <p>
          Compara disponibilidad, tiempo de espera y servicios antes de elegir.
        </p>
      </div>
      <div className="search-card">
        <div className="field grow">
          <label>¿Qué necesitas?</label>
          <div className="input-wrap">
            <Icon>⌕</Icon>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Centro, especialidad o medicamento"
            />
          </div>
        </div>
        <div className="field">
          <label>Servicio</label>
          <select value={service} onChange={(e) => setService(e.target.value)}>
            <option>Todos los servicios</option>
            <option>Medicina general</option>
            <option>Odontología</option>
            <option>Pediatría</option>
            <option>Farmacia</option>
          </select>
        </div>
        <button className="locate" onClick={locate}>
          <Icon>⌖</Icon> Usar mi ubicación
        </button>
      </div>
      <div className="results-heading">
        <div>
          <h2>
            {loading
              ? "Buscando centros…"
              : `${filtered.length} centros disponibles`}
          </h2>
          <p>{error || locationMessage || "Datos obtenidos desde SaludCerca API"}</p>
        </div>
        <button className="filter" onClick={() => void loadCenters()}>
          ↻ Actualizar
        </button>
      </div>
      {recommended && userPosition && (
        <div className="recommendation-card">
          <span>★</span>
          <div>
            <small>RECOMENDADO POR CERCANÍA</small>
            <strong>{recommended.name}</strong>
            <p>{recommended.distance} · {recommended.macrodistrict}</p>
          </div>
          <button onClick={() => select(recommended)}>Ver centro</button>
        </div>
      )}
      {error ? (
        <div className="api-message error-message">
          <b>No se pudo cargar la información.</b>
          <span>
            Inicia el backend con <code>npm.cmd run start:dev</code> desde la
            carpeta <code>backend</code>.
          </span>
        </div>
      ) : (
        <div className="content-grid">
          <div className="center-list">
            {loading ? (
              <div className="api-message">
                <span className="loading-ring" /> Consultando disponibilidad…
              </div>
            ) : (
              filtered.map((c) => (
                <CenterCard
                  key={c.id}
                  center={c}
                  selected={selected?.id === c.id}
                  onSelect={() => select(c)}
                  onDetails={() => {
                    select(c);
                    navigate("/ficha");
                  }}
                />
              ))
            )}
          </div>
          <HealthMap centers={filtered} selected={selected} userPosition={userPosition} onSelect={select} />
        </div>
      )}
    </section>
  );
}

function CenterCard({
  center,
  selected,
  onSelect,
  onDetails,
}: {
  center: Center;
  selected: boolean;
  onSelect: () => void;
  onDetails: () => void;
}) {
  const stockClass =
    center.stock === "Disponible"
      ? "green"
      : center.stock === "Stock bajo"
        ? "amber"
        : "red";
  return (
    <article
      className={`center-card ${selected ? "selected" : ""}`}
      onClick={onSelect}
    >
      <div className="center-top">
        <div>
          <span className="type">{center.kind}</span>
          <h3>{center.name}</h3>
          <p>
            <Icon>⌖</Icon>
            {center.address} <b>· {center.distance}</b>
          </p>
        </div>
        <button className="more">•••</button>
      </div>
      <div className="badges">
        <span className={center.open ? "badge green" : "badge gray"}>
          {center.open ? "Abierto ahora" : "Cerrado"}
        </span>
        <span className="badge blue">Espera: {center.wait}</span>
        <span className={`badge ${stockClass}`}>{center.stock}</span>
      </div>
      <div className="card-bottom">
        <span>
          <Icon>◷</Icon>
          {center.capacity
            ? `${center.capacity} fichas disponibles`
            : "Sin fichas hoy"}
        </span>
        <button
          className="text-button"
          onClick={(e) => {
            e.stopPropagation();
            onDetails();
          }}
        >
          Solicitar ficha →
        </button>
      </div>
    </article>
  );
}

function Map({
  centers: mapCenters,
  selected,
  onSelect,
}: {
  centers: Center[];
  selected: Center | null;
  onSelect: (c: Center) => void;
}) {
  return (
    <div className="map">
      <div className="map-label">
        Tu ubicación
        <div className="user-dot" />
      </div>
      <div className="road r1" />
      <div className="road r2" />
      <div className="road r3" />
      {mapCenters.map((c) => (
        <button
          key={c.id}
          className={`pin ${selected?.id === c.id ? "active" : ""}`}
          style={{ left: `${c.x}%`, top: `${c.y}%` }}
          onClick={() => onSelect(c)}
          aria-label={c.name}
        >
          ✚
        </button>
      ))}
      <div className="map-legend">
        <span>
          <i className="legend-dot active-dot" />
          Seleccionado
        </span>
        <span>
          <i className="legend-dot" />
          Centro de salud
        </span>
      </div>
    </div>
  );
}

function Appointment({
  center,
  navigate,
}: {
  center: Center;
  navigate: (to: Route) => void;
}) {
  const session = getSession();
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(
    null,
  );
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (typeof center.id !== "string") {
      setError("Elige un centro desde el buscador para reservar una ficha.");
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const result = await getAppointmentSlots(center.id);
        setSlots(result.filter((slot) => slot.available > 0));
        setSelectedSlot(result.find((slot) => slot.available > 0) ?? null);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudieron cargar horarios.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [center.id]);
  const reserve = async () => {
    if (!session) {
      navigate("/ingresar");
      return;
    }
    if (!selectedSlot) return;
    setSaving(true);
    setError("");
    try {
      setAppointment(
        await createAppointment(selectedSlot.id, session.accessToken),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo reservar la ficha.",
      );
    } finally {
      setSaving(false);
    }
  };
  const formatSlot = (slot: AppointmentSlot) =>
    new Intl.DateTimeFormat("es-BO", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(slot.startsAt));
  return (
    <section className="booking page">
      <button className="back" onClick={() => navigate("/centros")}>
        ← Volver a centros
      </button>
      {appointment ? (
        <div className="confirmation">
          <span>✓</span>
          <h1>Tu ficha fue reservada</h1>
          <p>Presenta este código al llegar al centro de salud.</p>
          <div className="ticket">
            <small>CÓDIGO DE ATENCIÓN</small>
            <strong>{appointment.code}</strong>
            <hr />
            <p>
              {appointment.center}
              <br />
              {new Intl.DateTimeFormat("es-BO", {
                dateStyle: "full",
                timeStyle: "short",
              }).format(new Date(appointment.startsAt))}
              <br />
              {appointment.service}
            </p>
          </div>
          <button className="primary" onClick={() => navigate("/")}>
            Volver al inicio
          </button>
        </div>
      ) : (
        <div className="booking-grid">
          <div>
            <span className="eyebrow">SOLICITAR FICHA</span>
            <h1>Reserva tu atención</h1>
            <p className="muted">
              Estás solicitando una ficha en <b>{center.name}</b>.
            </p>
            <div className="booking-box">
              <h3>1. Elige un horario disponible</h3>
              {loading ? (
                <div className="api-message">
                  <span className="loading-ring" /> Cargando horarios…
                </div>
              ) : (
                <div className="slots">
                  {slots.map((item) => (
                    <button
                      className={
                        selectedSlot?.id === item.id
                          ? "slot selected-slot"
                          : "slot"
                      }
                      key={item.id}
                      onClick={() => setSelectedSlot(item)}
                    >
                      {formatSlot(item)}
                      <small>
                        {item.service} · {item.available} cupos
                      </small>
                    </button>
                  ))}
                </div>
              )}
              {!loading && !slots.length && (
                <p className="form-error">
                  No hay horarios disponibles para este centro.
                </p>
              )}
              {error && <p className="form-error">{error}</p>}
              <h3>2. Confirma tu reserva</h3>
              <p className="muted">
                {session
                  ? `Sesión: ${session.user.fullName}`
                  : "Debes iniciar sesión para reservar una ficha."}
              </p>
              <button
                className="primary full"
                onClick={reserve}
                disabled={saving || !selectedSlot}
              >
                {saving
                  ? "Reservando…"
                  : session
                    ? "Confirmar ficha"
                    : "Iniciar sesión para reservar"}
              </button>
            </div>
          </div>
          <aside className="summary">
            <span className="type">RESUMEN</span>
            <h2>{center.name}</h2>
            <p>
              <Icon>⌖</Icon>
              {center.address}
            </p>
            <hr />
            <p>
              <b>Servicio</b>
              <br />
              {selectedSlot?.service ?? "Selecciona un horario"}
            </p>
            <p>
              <b>Horario seleccionado</b>
              <br />
              {selectedSlot ? formatSlot(selectedSlot) : "Sin horario"}
            </p>
            <p>
              <b>Tiempo de espera estimado</b>
              <br />
              {center.wait}
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}

function MyAppointments({ navigate }: { navigate: (to: Route) => void }) {
  const session = getSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(Boolean(session));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    void (async () => {
      try {
        setAppointments(await getMyAppointments(session.accessToken));
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudieron cargar tus fichas.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.accessToken]);

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("es-BO", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(value));
  if (!session)
    return (
      <section className="my-appointments page">
        <div className="api-message error-message">
          <b>Inicia sesión para ver tus fichas.</b>
          <span>Tu historial de reservas estará asociado a tu cuenta.</span>
          <button className="primary" onClick={() => navigate("/ingresar")}>
            Iniciar sesión
          </button>
        </div>
      </section>
    );
  return (
    <section className="my-appointments page">
      <div className="page-intro">
        <span className="eyebrow">MI ATENCIÓN</span>
        <h1>Mis fichas</h1>
        <p>
          Consulta tus reservas y presenta el código de atención cuando llegues
          al centro de salud.
        </p>
      </div>
      {loading ? (
        <div className="api-message">
          <span className="loading-ring" /> Cargando tus fichas…
        </div>
      ) : error ? (
        <div className="api-message error-message">
          <b>No pudimos cargar tus fichas.</b>
          <span>{error}</span>
          <button className="primary" onClick={() => location.reload()}>
            Reintentar
          </button>
        </div>
      ) : !appointments.length ? (
        <div className="empty-appointments">
          <span>▣</span>
          <h2>Aún no tienes fichas reservadas</h2>
          <p>Busca un centro de salud y reserva el horario que te convenga.</p>
          <button className="primary" onClick={() => navigate("/centros")}>
            Buscar un centro
          </button>
        </div>
      ) : (
        <div className="appointment-list">
          {appointments.map((item) => (
            <article className="appointment-card" key={item.id}>
              <div className="appointment-card-top">
                <span className="type">FICHA RESERVADA</span>
                <span className="appointment-status">
                  ● {item.status === "RESERVED" ? "Reservada" : item.status}
                </span>
              </div>
              <h2>{item.center}</h2>
              <p className="appointment-address">
                <Icon>⌖</Icon>
                {item.address}
              </p>
              <div className="appointment-info">
                <p>
                  <b>Servicio</b>
                  {item.service}
                </p>
                <p>
                  <b>Fecha y hora</b>
                  {formatDate(item.startsAt)}
                </p>
              </div>
              <div className="appointment-code">
                <small>CÓDIGO DE ATENCIÓN</small>
                <strong>{item.code}</strong>
                <span>Preséntalo al llegar al establecimiento.</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Assistant({ navigate }: { navigate: (to: Route) => void }) {
  const [messages, setMessages] = useState<Array<{ from: "bot" | "user"; text: string; triage?: TriageReply; generated?: boolean; connectionError?: boolean }>>([
    {
      from: "bot",
      text: "Hola, soy tu asistente de orientación. ¿Qué tipo de atención estás buscando?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopSpeech = () => {
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    audioRef.current = null;
    setSpeaking(false);
  };

  const speakReply = async (text: string) => {
    try {
      stopSpeech();
      setSpeaking(true);
      const response = await synthesizeAssistantSpeech(text);
      if (!response.available || !response.audio) throw new Error("Voz no disponible");
      const bytes = Uint8Array.from(atob(response.audio), (character) => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: response.mimeType }));
      const player = new Audio(url);
      audioRef.current = player;
      player.onended = () => {
        URL.revokeObjectURL(url);
        setSpeaking(false);
      };
      await player.play();
    } catch {
      // Respaldo inmediato para navegadores que incluyen voz nativa. Así la
      // función sigue siendo útil si el proveedor TTS está temporalmente caído.
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "es-BO";
        utterance.rate = 1;
        const spanishVoice = window.speechSynthesis
          .getVoices()
          .find((voice) => voice.lang.toLowerCase().startsWith("es"));
        if (spanishVoice) utterance.voice = spanishVoice;
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => {
          setSpeaking(false);
          setVoiceError("No se pudo reproducir la respuesta por voz. Puedes leerla en pantalla.");
        };
        window.speechSynthesis.speak(utterance);
        return;
      }
      setSpeaking(false);
      setVoiceError("No se pudo generar la respuesta por voz. Puedes leerla en pantalla.");
    }
  };

  const startVoiceInput = async () => {
    if (sending || recording || transcribing) return;
    setVoiceError("");
    try {
      if (!window.isSecureContext && window.location.hostname !== "localhost") {
        setVoiceError("Para grabar desde el teléfono abre SaludCerca con una URL HTTPS. Con HTTP el navegador bloquea el micrófono antes de pedir permiso.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("unsupported");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const chunks: BlobPart[] = [];
      const preferredMimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
        .find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
        setTranscribing(true);
        try {
          const mimeType = recorder.mimeType || preferredMimeType || "audio/webm";
          const extension = mimeType.includes("mp4") ? "m4a" : "webm";
          const audio = new Blob(chunks, { type: mimeType });
          const response = await transcribeAssistantAudio(audio, `consulta.${extension}`);
          if (!response.available || !response.text) throw new Error("empty");
          setInput(response.text);
        } catch {
          setVoiceError("No pudimos reconocer el audio. Intenta grabar otra vez o escribe tu consulta.");
        } finally {
          setTranscribing(false);
          recorderRef.current = null;
        }
      };
      recorder.start(250);
      setRecording(true);
    } catch (error) {
      setVoiceError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Permite el uso del micrófono para dictar tu consulta."
          : "Tu navegador no permite grabar audio. Abre la página mediante HTTPS e intenta nuevamente.",
      );
    }
  };
  const stopVoiceInput = () => recorderRef.current?.stop();
  const send = async () => {
    const message = input.trim();
    if (!message || sending) return;
    const localSafety = createTriageReply(message);
    setMessages((current) => [...current, { from: "user", text: message }]);
    setInput("");
    setSending(true);

    // Las emergencias no esperan a que responda un proveedor de IA.
    if (localSafety.level === "emergency") {
      setMessages((current) => [...current, { from: "bot", text: localSafety.text, triage: localSafety }]);
      setSending(false);
      return;
    }

    try {
      const response = await chatWithAssistant(message);
      const triage: TriageReply = {
        level: response.level,
        title: response.level === "priority" ? "Busca valoración médica hoy" : "Orientación inicial",
        text: response.reply,
        action: response.action,
      };
      setMessages((current) => [...current, { from: "bot", text: response.reply, triage, generated: response.generated }]);
      if (voiceEnabled && response.generated) void speakReply(response.reply);
    } catch {
      setMessages((current) => [...current, { from: "bot", text: localSafety.text, triage: localSafety, connectionError: true }]);
    } finally {
      setSending(false);
    }
  };
  return (
    <section className="assistant-page page">
      <div className="assistant-intro">
        <span className="eyebrow">ORIENTACIÓN INICIAL</span>
        <h1>¿Cómo podemos ayudarte?</h1>
        <p>
          Describe lo que necesitas por texto. Este asistente te orienta, pero
          no reemplaza a un profesional de salud.
        </p>
        <button className="outline" onClick={() => navigate("/centros")}>
          Ver centros disponibles →
        </button>
      </div>
      <div className="assistant-chat">
        <div className="chat-head">
          <div>
            <span className="chat-icon">+</span>
            <b>Asistente SaludCerca</b>
            <small>Orientación inicial segura</small>
          </div>
          <span className="online">● En línea</span>
        </div>
        <label className="voice-toggle">
          <input type="checkbox" checked={voiceEnabled} onChange={(event) => setVoiceEnabled(event.target.checked)} />
          <span>Responder con voz</span>
        </label>
        <div className="chat-body large-chat">
          {messages.map((m, i) => (
            <div className="chat-message" key={i}>
              <p className={m.from === "bot" ? "bot" : "user"}>
                {m.triage && <strong>{m.triage.title}</strong>}
                {m.triage?.text ?? m.text}
              </p>
              {m.generated && <small className="ai-notice">Respuesta generada por IA; puede equivocarse.</small>}
              {m.connectionError && <small className="assistant-error">No se pudo conectar con la IA. Revisa que el backend y la URL del túnel estén activos.</small>}
              {m.triage?.action === "call-emergency" && (
                <a className="triage-action emergency-action" href="tel:167">Llamar a Auxilio La Paz 167</a>
              )}
              {m.triage?.action === "find-center" && (
                <button className="triage-action" onClick={() => navigate("/centros")}>Encontrar el centro más cercano</button>
              )}
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Escribe tu consulta..."
            disabled={sending || recording || transcribing}
          />
          <button
            className={`voice-button ${recording ? "listening" : ""}`}
            type="button"
            onClick={recording ? stopVoiceInput : startVoiceInput}
            disabled={sending || transcribing}
            aria-label={recording ? "Detener grabación" : "Grabar consulta por voz"}
            title={recording ? "Detener grabación" : "Grabar consulta por voz"}
          >
            {recording ? "Detener" : transcribing ? "Procesando" : "Hablar"}
          </button>
          <button className="send-button" onClick={send} disabled={sending || recording || transcribing}>{sending ? "Enviando" : "Enviar"}</button>
        </div>
        {recording && <p className="voice-status">Grabando… pulsa Detener cuando termines.</p>}
        {transcribing && <p className="voice-status">Transcribiendo tu consulta…</p>}
        {speaking && <button className="stop-speaking" onClick={stopSpeech}>■ Detener audio</button>}
        {voiceError && <p className="voice-error">{voiceError}</p>}
      </div>
    </section>
  );
}

function How({ navigate }: { navigate: (to: Route) => void }) {
  return (
    <section className="how-page page">
      <span className="eyebrow">SIMPLE, CLARO Y CERCANO</span>
      <h1>
        La atención que necesitas,
        <br />
        <em>en tres pasos.</em>
      </h1>
      <p className="lead">
        SaludCerca facilita el acceso a la información de centros municipales
        para que tomes decisiones informadas.
      </p>
      <div className="big-steps">
        <article>
          <b>01</b>
          <span>⌖</span>
          <h2>Busca</h2>
          <p>
            Indica qué atención necesitas y conoce los centros disponibles cerca
            de ti.
          </p>
        </article>
        <article>
          <b>02</b>
          <span>◷</span>
          <h2>Compara</h2>
          <p>
            Revisa los horarios, fichas, tiempo estimado de espera y
            medicamentos.
          </p>
        </article>
        <article>
          <b>03</b>
          <span>▣</span>
          <h2>Reserva</h2>
          <p>
            Solicita tu ficha y recibe un código para presentarte en el centro.
          </p>
        </article>
      </div>
      <div className="callout">
        <div>
          <span>✦</span>
          <h2>¿No sabes dónde atenderte?</h2>
          <p>El asistente puede orientarte y ayudarte a encontrar un centro.</p>
        </div>
        <button className="primary" onClick={() => navigate("/asistente")}>
          Hablar con el asistente
        </button>
      </div>
    </section>
  );
}

function LoginPage({ navigate }: { navigate: (to: Route) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      const session = isRegister
        ? await register(fullName, email, password)
        : await login(email, password);
      navigate(
        session.user.role === "OPERATOR" || session.user.role === "ADMIN"
          ? "/operador"
          : "/centros",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo procesar la solicitud.",
      );
    } finally {
      setSending(false);
    }
  };
  return (
    <section className="login-page page">
      <div className="login-card">
        <div className="login-symbol">✚</div>
        <span className="eyebrow">ACCESO SEGURO</span>
        <h1>{isRegister ? "Crea tu cuenta" : "Bienvenido de nuevo"}</h1>
        <p>
          {isRegister
            ? "Regístrate para solicitar y gestionar tus fichas de atención."
            : "Ingresa para continuar con SaludCerca."}
        </p>
        <form onSubmit={submit}>
          {isRegister && (
            <label>
              Nombre completo
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre completo"
                required
                minLength={3}
              />
            </label>
          )}
          <label>
            Correo electrónico
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@correo.com"
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary full" disabled={sending}>
            {sending
              ? "Procesando…"
              : isRegister
                ? "Crear cuenta"
                : "Iniciar sesión"}
          </button>
        </form>
        <button
          className="switch-auth"
          onClick={() => {
            setIsRegister(!isRegister);
            setError("");
          }}
        >
          {isRegister
            ? "¿Ya tienes una cuenta? Inicia sesión"
            : "¿No tienes una cuenta? Regístrate"}
        </button>
        {!isRegister && (
          <div className="demo-login">
            <b>Cuenta de operador para la demostración</b>
            <span>operador@saludcerca.bo</span>
          </div>
        )}
      </div>
    </section>
  );
}

function OperatorDashboard({ navigate }: { navigate: (to: Route) => void }) {
  const [operatorCenters, setOperatorCenters] = useState<Center[]>([]);
  const [centerId, setCenterId] = useState<Center["id"] | null>(null);
  const [capacity, setCapacity] = useState(0);
  const [wait, setWait] = useState("");
  const [stock, setStock] = useState<Center["stock"]>("Disponible");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const session = getSession();
  const current = operatorCenters.find((c) => c.id === centerId) ?? null;
  useEffect(() => {
    void (async () => {
      try {
        const result = await getCenters();
        const permittedCenters =
          session?.user.role === "OPERATOR"
            ? result.filter(
                (center) => center.id === session.user.assignedCenterId,
              )
            : result;
        setOperatorCenters(permittedCenters);
        setCenterId(permittedCenters[0]?.id ?? null);
      } catch {
        setError(
          "No se pudo conectar al backend. Inícialo antes de usar el panel.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  useEffect(() => {
    if (!centerId) return;
    void (async () => {
      setStatus("");
      try {
        const availability = await getCenterAvailability(centerId);
        setCapacity(availability.appointments.available);
        setWait(availability.appointments.estimatedWait);
        setStock(availability.medicines.status);
      } catch {
        setError(
          "No se pudo cargar la disponibilidad del centro seleccionado.",
        );
      }
    })();
  }, [centerId]);
  const save = async () => {
    if (!current || !session) return;
    setSaving(true);
    setStatus("");
    try {
      const availability = await updateCenterAvailability(
        current.id,
        { capacity, wait, stock },
        session.accessToken,
      );
      setCapacity(availability.appointments.available);
      setWait(availability.appointments.estimatedWait);
      setStock(availability.medicines.status);
      setOperatorCenters((items) =>
        items.map((center) =>
          center.id === current.id
            ? {
                ...center,
                wait: availability.appointments.estimatedWait,
                capacity: availability.appointments.available,
                stock: availability.medicines.status,
              }
            : center,
        ),
      );
      setStatus(
        `Actualizado a las ${new Date().toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}.`,
      );
    } catch {
      setStatus(
        "No se pudo guardar la actualización. Revisa tu sesión y la conexión con la API.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (
    !session ||
    (session.user.role !== "OPERATOR" && session.user.role !== "ADMIN")
  )
    return (
      <section className="operator-page page">
        <div className="api-message error-message">
          <b>Acceso restringido para operadores.</b>
          <span>
            Inicia sesión con una cuenta de operador para actualizar
            información.
          </span>
          <button className="primary" onClick={() => navigate("/ingresar")}>
            Iniciar sesión
          </button>
        </div>
      </section>
    );
  return (
    <section className="operator-page page">
      <div className="operator-title">
        <div>
          <span className="eyebrow">
            PANEL DE OPERADOR · {session.user.fullName.toUpperCase()}
          </span>
          <h1>Actualiza la disponibilidad</h1>
          <p>Estos datos se mostrarán a los ciudadanos que busquen atención.</p>
        </div>
        <span className="operator-badge">● Sesión activa</span>
      </div>
      {loading ? (
        <div className="api-message">
          <span className="loading-ring" /> Cargando centros desde PostgreSQL…
        </div>
      ) : error && !current ? (
        <div className="api-message error-message">
          <b>{error}</b>
          <span>Inicia el backend en el puerto 3000 y vuelve a cargar.</span>
        </div>
      ) : (
        current && (
          <div className="operator-layout">
            <aside className="operator-sidebar">
              <b>Centro de salud</b>
              <p>
                {session.user.role === "ADMIN"
                  ? "Selecciona el establecimiento que administras."
                  : "Centro asignado a tu cuenta."}
              </p>
              {session.user.role === "ADMIN" ? (
                <label>
                  Centro asignado
                  <select
                    value={String(centerId)}
                    onChange={(e) => setCenterId(e.target.value)}
                  >
                    {operatorCenters.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="operator-center">
                  <span>⌖</span>
                  <div>
                    <strong>{current.name}</strong>
                    <small>{current.address}</small>
                  </div>
                </div>
              )}
              <hr />
              <small>
                El acceso está restringido al centro asignado a cada operador.
              </small>
            </aside>
            <div className="operator-form">
              <div className="operator-card">
                <div className="operator-card-head">
                  <div>
                    <span className="type">ATENCIÓN DEL DÍA</span>
                    <h2>Fichas y espera</h2>
                  </div>
                  <span className="live-dot">● Datos reales</span>
                </div>
                <div className="form-row">
                  <label>
                    Fichas disponibles
                    <input
                      type="number"
                      min="0"
                      value={capacity}
                      onChange={(e) =>
                        setCapacity(Math.max(0, Number(e.target.value)))
                      }
                    />
                  </label>
                  <label>
                    Espera estimada
                    <input
                      value={wait}
                      onChange={(e) => setWait(e.target.value)}
                      placeholder="Ej. 20 min"
                    />
                  </label>
                </div>
              </div>
              <div className="operator-card">
                <div className="operator-card-head">
                  <div>
                    <span className="type">FARMACIA</span>
                    <h2>Estado general de medicamentos</h2>
                  </div>
                </div>
                <div className="stock-options">
                  {(
                    [
                      "Disponible",
                      "Stock bajo",
                      "Sin stock",
                    ] as Center["stock"][]
                  ).map((option) => (
                    <button
                      key={option}
                      className={`stock-option ${stock === option ? "selected-stock" : ""} ${option === "Disponible" ? "available" : option === "Stock bajo" ? "low" : "none"}`}
                      onClick={() => setStock(option)}
                    >
                      <span>
                        {option === "Disponible"
                          ? "✓"
                          : option === "Stock bajo"
                            ? "!"
                            : "×"}
                      </span>
                      <div>
                        <b>{option}</b>
                        <small>
                          {option === "Disponible"
                            ? "Medicamentos principales disponibles"
                            : option === "Stock bajo"
                              ? "Algunos medicamentos por agotarse"
                              : "Sin disponibilidad reportada"}
                        </small>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="save-row">
                <span
                  className={
                    status.includes("Actualizado") ? "saved" : "save-message"
                  }
                >
                  {status || error}
                </span>
                <button className="primary" onClick={save} disabled={saving}>
                  {saving ? "Guardando…" : "Guardar actualización"}
                </button>
              </div>
            </div>
          </div>
        )
      )}
    </section>
  );
}
