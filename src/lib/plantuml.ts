import plantumlEncoder from "plantuml-encoder";

export function isPlantUmlSource(code: string): boolean {
  return /^\s*@start(?:uml|mindmap|wbs|gantt|json|yaml)\b/i.test(code);
}

export function cleanPlantUml(code: string): string {
  const value = code.replace(/\r\n?/g, "\n").trim();
  return isPlantUmlSource(value) ? value : `@startuml\n${value}\n@enduml`;
}

/**
 * Hash PlantUML source using 32-bit FNV-1a, compatible with system-design-notes.
 */
export function plantUmlSlug(code: string): string {
  const source = cleanPlantUml(code);
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    hash = Math.imul(hash ^ source.charCodeAt(i), 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function getPlantUmlServerUrl(): string {
  return (
    (import.meta.env?.VITE_PLANTUML_SERVER as string | undefined) ||
    "https://www.plantuml.com/plantuml"
  ).replace(/\/$/, "");
}

export function getPlantUmlSvgUrl(code: string, serverUrl?: string): string {
  const cleanCode = cleanPlantUml(code);
  const encoded = plantumlEncoder.encode(cleanCode);
  const server = (serverUrl || getPlantUmlServerUrl()).replace(/\/$/, "");
  return `${server}/svg/${encoded}`;
}
