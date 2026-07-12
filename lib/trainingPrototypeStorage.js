import { TRAINING_CENTER_PROTOTYPE_MODULES } from "@/lib/trainingCenterPrototypeMock";

export const TRAINING_PROTOTYPE_MODULES_STORAGE_KEY = "lst-training-prototype-modules-v2";

export function clonePrototypeModules(modules = TRAINING_CENTER_PROTOTYPE_MODULES) {
  return JSON.parse(JSON.stringify(modules));
}

export function loadPrototypeModules() {
  if (typeof window === "undefined") {
    return clonePrototypeModules();
  }

  try {
    const saved = window.localStorage.getItem(TRAINING_PROTOTYPE_MODULES_STORAGE_KEY);
    if (!saved) return clonePrototypeModules();
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? parsed : clonePrototypeModules();
  } catch {
    return clonePrototypeModules();
  }
}

export function savePrototypeModules(modules) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRAINING_PROTOTYPE_MODULES_STORAGE_KEY, JSON.stringify(modules));
}

export function findPrototypeModuleById(modules, moduleId) {
  return modules.find((module) => module.id === moduleId) || null;
}

export function findPrototypeSectionById(modules, sectionId) {
  for (const module of modules) {
    const section = module.sections.find((item) => item.id === sectionId);
    if (section) return { ...section, moduleId: module.id };
  }
  return null;
}

export function getNextPrototypeSectionIdFromModules(modules, sectionId, moduleId) {
  const module = findPrototypeModuleById(modules, moduleId);
  if (!module) return null;
  const index = module.sections.findIndex((section) => section.id === sectionId);
  if (index < 0) return null;
  return module.sections[index + 1]?.id || null;
}

export function getPreviousPrototypeSectionIdFromModules(modules, sectionId, moduleId) {
  const module = findPrototypeModuleById(modules, moduleId);
  if (!module) return null;
  const index = module.sections.findIndex((section) => section.id === sectionId);
  if (index <= 0) return null;
  return module.sections[index - 1]?.id || null;
}
