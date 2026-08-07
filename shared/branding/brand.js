/* LogID — Branding compartido.
   Doc 03: "el nombre de empresa es una variable, no un texto hardcodeado".
   Esto es lo ÚNICO que define quién protagoniza el laboratorio.
   Los módulos leen de acá; nunca hardcodean "NanoCargo". */

const LOGID = {
  name: 'LogID',
  tagline: 'Laboratorio de I+D logístico',
};

const COMPANY_DEFAULT = {
  name: 'NanoCargo',
  tagline: 'Distribución de carga homogénea',
};

const STORAGE_KEY = 'logid.company.name';

/* Nombre de empresa vigente: el editado por el usuario, o el default. */
function getCompanyName() {
  try {
    return localStorage.getItem(STORAGE_KEY) || COMPANY_DEFAULT.name;
  } catch (e) {
    return COMPANY_DEFAULT.name;
  }
}

function setCompanyName(value) {
  const name = (value || '').trim() || COMPANY_DEFAULT.name;
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch (e) {
    /* sin persistencia (modo privado): sigue funcionando en memoria */
  }
  applyCompanyName();
  return name;
}

function resetCompanyName() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  applyCompanyName();
  return COMPANY_DEFAULT.name;
}

/* Pinta el nombre en todo elemento marcado con data-brand-company. */
function applyCompanyName() {
  const name = getCompanyName();
  document.querySelectorAll('[data-brand-company]').forEach((el) => {
    if ('value' in el && el.tagName === 'INPUT') el.value = name;
    else el.textContent = name;
  });
  document.dispatchEvent(
    new CustomEvent('logid:company-change', { detail: { name } })
  );
}

window.LogIDBrand = {
  LOGID,
  COMPANY_DEFAULT,
  getCompanyName,
  setCompanyName,
  resetCompanyName,
  applyCompanyName,
};
