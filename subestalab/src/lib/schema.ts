/* ==========================================================================
   Datos estructurados Schema.org (JSON-LD) de cada página.
   ========================================================================== */
import type { ConfigDef } from './scenario';
import { AUTHOR, COURSE, SITE_NAME, TEACHER, UNIVERSITY } from './brand';

const abs = (site: URL, path: string) => new URL(path, site).href;

const author = { '@type': 'Person', name: AUTHOR };
const teacher = { '@type': 'Person', name: TEACHER, jobTitle: 'Profesor' };
const university = { '@type': 'CollegeOrUniversity', name: UNIVERSITY };

export function websiteNode(site: URL) {
  return {
    '@type': 'WebSite',
    '@id': abs(site, '/#website'),
    name: SITE_NAME,
    url: abs(site, '/'),
    inLanguage: 'es',
    description: 'Aplicación educativa para estudiar, paso a paso, las maniobras de mantenimiento de interruptores y barras en 10 configuraciones de barraje de subestaciones eléctricas.',
    creator: author,
  };
}

/** Página de inicio: el sitio y el recurso educativo completo. */
export function homeSchema(site: URL) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      websiteNode(site),
      {
        '@type': 'LearningResource',
        '@id': abs(site, '/#recurso'),
        name: 'SubestaLab — Maniobras en subestaciones eléctricas',
        url: abs(site, '/'),
        inLanguage: 'es',
        learningResourceType: ['Simulación interactiva', 'Tutorial paso a paso', 'Ejercicio de práctica'],
        educationalLevel: 'Pregrado — Ingeniería eléctrica',
        isAccessibleForFree: true,
        about: ['Subestaciones eléctricas', 'Configuraciones de barraje', 'Maniobras de mantenimiento', 'Seguridad eléctrica'],
        teaches: 'Secuencias de maniobra para el mantenimiento de barras e interruptores en 10 configuraciones de barraje, actuación de protecciones ante fallas y las cinco reglas de oro.',
        author,
        contributor: teacher,
        provider: university,
        isPartOf: { '@type': 'Course', name: COURSE, provider: university },
      },
    ],
  };
}

export function breadcrumb(site: URL, items: [name: string, path: string][]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(site, path) })),
  };
}

/** Panel de configuraciones: colección con la lista de las 10. */
export function collectionSchema(site: URL, configs: ConfigDef[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': abs(site, '/configuraciones/#pagina'),
        name: 'Configuraciones de barraje',
        url: abs(site, '/configuraciones/'),
        inLanguage: 'es',
        isPartOf: { '@id': abs(site, '/#website') },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: configs.length,
          itemListElement: configs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, url: abs(site, `/configuraciones/${c.slug}/`) })),
        },
      },
      breadcrumb(site, [['Inicio', '/'], ['Configuraciones', '/configuraciones/']]),
    ],
  };
}

/** Tablero de una configuración: recurso educativo con sus tres escenarios. */
export function configSchema(site: URL, c: ConfigDef) {
  const url = abs(site, `/configuraciones/${c.slug}/`);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LearningResource',
        '@id': `${url}#recurso`,
        name: `${c.name}: maniobras de mantenimiento paso a paso`,
        description: c.summary,
        url,
        inLanguage: 'es',
        learningResourceType: ['Simulación interactiva', 'Tutorial paso a paso', 'Ejercicio de práctica'],
        educationalLevel: c.level,
        isAccessibleForFree: true,
        about: [c.name, c.trend, 'Subestaciones eléctricas'],
        teaches: c.scenarios.map(s => s.title),
        hasPart: c.scenarios.map(s => ({ '@type': 'LearningResource', name: s.title, description: s.goal })),
        author,
        isPartOf: { '@id': abs(site, '/#website') },
      },
      breadcrumb(site, [['Inicio', '/'], ['Configuraciones', '/configuraciones/'], [c.name, `/configuraciones/${c.slug}/`]]),
    ],
  };
}

/** Modo interactivo: aplicación web educativa. */
export function labSchema(site: URL) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': abs(site, '/laboratorio/#app'),
        name: 'SubestaLab — Modo interactivo',
        url: abs(site, '/laboratorio/'),
        inLanguage: 'es',
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        browserRequirements: 'Requiere JavaScript',
        description: 'Diseña tu propia configuración de subestación con barras, interruptores, seccionadores y puestas a tierra, y simula maniobras y fallas.',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'COP' },
        author,
        isPartOf: { '@id': abs(site, '/#website') },
      },
      breadcrumb(site, [['Inicio', '/'], ['Modo interactivo', '/laboratorio/']]),
    ],
  };
}
