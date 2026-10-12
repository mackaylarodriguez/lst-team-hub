import { supabase } from "@/lib/supabase";
import {
  TRAINING_CENTER_PROTOTYPE_MODULES,
  TRAINING_PROTOTYPE_SAMPLE_TRIP_START,
} from "@/lib/trainingCenterPrototypeMock";
import { getTrainingModuleDeadline } from "@/lib/training";
import {
  TRAINING_TIMELINE_COLLEGE,
  normalizeTrainingTimelineType,
} from "@/lib/workerTaskTemplate";

const TRAINING_MODULE_CONTENT_TABLE = "training_module_content";

export function clonePrototypeModules(modules = TRAINING_CENTER_PROTOTYPE_MODULES) {
  return JSON.parse(JSON.stringify(modules));
}

function describeDeadlineRule(moduleTitle, trainingTimelineType) {
  const normalizedTimeline = normalizeTrainingTimelineType(trainingTimelineType);
  if (normalizedTimeline === TRAINING_TIMELINE_COLLEGE) {
    if (/Module [12]|Welcome|Fundraising/i.test(moduleTitle)) {
      return "College timeline: October 15 (year before trip)";
    }
    if (/Team Dynamics|Culture/i.test(moduleTitle)) {
      return "College timeline: February 15";
    }
    if (/Making LST Work Onsite/i.test(moduleTitle) && !/Tools/i.test(moduleTitle)) {
      return "College timeline: March 15";
    }
    if (/Onsite Tools/i.test(moduleTitle)) {
      return "College timeline: March 15";
    }
    if (/Debriefing|Reentry/i.test(moduleTitle)) {
      return "College timeline: April 15";
    }
    return "College timeline rule";
  }
  if (/Module [12]|Welcome|Fundraising/i.test(moduleTitle)) {
    return "90 days before trip start";
  }
  if (/Team Dynamics|Culture|Making LST Work Onsite/i.test(moduleTitle) && !/Tools/i.test(moduleTitle)) {
    return "60 days before trip start";
  }
  if (/Onsite Tools|Debriefing/i.test(moduleTitle)) {
    return "30 days before trip start";
  }
  return "Training deadline rule";
}

/** Stamp module + section due dates from trip start using Hub training deadline rules. */
export function applyPrototypeTrainingDeadlines(
  modules,
  { startDate, endDate, trainingTimelineType } = {}
) {
  const tripStart = startDate || TRAINING_PROTOTYPE_SAMPLE_TRIP_START;
  return (modules || []).map((module) => {
    const dueDate =
      getTrainingModuleDeadline(module.title, {
        startDate: tripStart,
        endDate,
        trainingTimelineType,
      }) || module.dueDate;
    const dueDateRule = describeDeadlineRule(module.title, trainingTimelineType);
    return {
      ...module,
      dueDate,
      dueDateRule,
      sections: (module.sections || []).map((section) => ({
        ...section,
        dueDate,
      })),
    };
  });
}

/** Built-in default modules (no staff edits). Use as initial state before shared content loads. */
export function loadPrototypeModules(tripContext) {
  return applyPrototypeTrainingDeadlines(clonePrototypeModules(), tripContext);
}

/** Built-in modules with staff edits from Supabase applied, shared by every user. */
export async function loadSharedPrototypeModules(tripContext) {
  const modules = clonePrototypeModules();

  const { data, error } = await supabase
    .from(TRAINING_MODULE_CONTENT_TABLE)
    .select("module_id, module");

  if (error) {
    console.error("Unable to load shared training content", error);
    return applyPrototypeTrainingDeadlines(modules, tripContext);
  }

  const savedById = new Map();
  for (const row of data || []) {
    if (row?.module_id && row.module && Array.isArray(row.module.sections)) {
      savedById.set(row.module_id, row.module);
    }
  }

  return applyPrototypeTrainingDeadlines(
    modules.map((module) => savedById.get(module.id) || module),
    tripContext
  );
}

export async function saveSharedPrototypeModule(module, { updatedByEmail } = {}) {
  if (!module?.id) throw new Error("Missing training module to save.");

  const { error } = await supabase.from(TRAINING_MODULE_CONTENT_TABLE).upsert(
    {
      module_id: module.id,
      module,
      updated_by_email: String(updatedByEmail || "").trim().toLowerCase() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "module_id" }
  );

  if (error) {
    console.error("Unable to save shared training content", error);
    throw new Error(error.message || "Unable to save training changes.");
  }
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
