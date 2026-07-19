function isLocalNetworkHttp() {
  const { protocol, hostname } = window.location;
  return protocol === "http:" && (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

// En la misma red Wi-Fi, la API vive en el mismo equipo que sirve Vite.
// Así una URL antigua de un túnel no rompe las pruebas locales por HTTP.
export const API_URL = isLocalNetworkHttp()
  ? `${window.location.protocol}//${window.location.hostname}:3000/api`
  // En Render, NestJS entrega también el build de React y ambos comparten dominio HTTPS.
  : import.meta.env.VITE_API_URL ?? "/api";
