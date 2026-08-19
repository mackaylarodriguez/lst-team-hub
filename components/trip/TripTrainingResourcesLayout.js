import { TrainingResourceLink } from "./tripPageShared";
import {
  getWorkshopRegistrationFieldsForResource,
  listWorkshopRegistrationModuleTitles,
} from "@/lib/trainingResources";
import {
  getTrainingSessionOptionsForModuleTitle,
  resolveTrainingSessionSelectValue,
} from "@/lib/trainingSessionOptions";

function findModuleByTitle(modules, title) {
  const needle = String(title || "").trim().toLowerCase();
  if (!needle) return null;
  return (
    (modules || []).find(
      (module) => String(module?.title || "").trim().toLowerCase() === needle
    ) || null
  );
}

function formatWorkshopSessionLabel(stored, moduleTitle) {
  const options = getTrainingSessionOptionsForModuleTitle(moduleTitle) || [];
  const selected = resolveTrainingSessionSelectValue(stored, options);
  if (!selected) return "";
  const match = options.find((option) => option.value === selected);
  return match?.label || selected;
}

function WorkshopRegistrationSelect({
  module,
  trainingState,
  ownerEmail,
  fieldLabel,
  onChangeSession,
  disabled,
}) {
  if (!module?.id) return null;
  const options = getTrainingSessionOptionsForModuleTitle(module.title) || [];
  if (!options.length) return null;

  const stored = String(trainingState?.[`${module.id}Date`] || "").trim();
  const selectValue = resolveTrainingSessionSelectValue(stored, options);

  return (
    <label className="tripTrainingSignupField">
      <span className="small tripTrainingSignupLabel">{fieldLabel}</span>
      <select
        className="input"
        value={selectValue}
        disabled={disabled}
        aria-label={fieldLabel}
        onChange={(event) => onChangeSession?.(module.id, event.target.value, ownerEmail)}
      >
        <option value="">Select session…</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function RequiredTrainingResourceBlock({
  resource,
  trainingModules,
  trainingState,
  ownerEmail,
  canEditRegistration,
  onChangeSession,
}) {
  const fields = getWorkshopRegistrationFieldsForResource(resource.id);

  return (
    <div className="tripTrainingResourceStack">
      <TrainingResourceLink resource={resource} />
      {fields.length && canEditRegistration ? (
        <div className="tripTrainingSignupPanel">
          {fields.map((field) => {
            const module = findModuleByTitle(trainingModules, field.title);
            return (
              <WorkshopRegistrationSelect
                key={`${resource.id}-${field.title}`}
                module={module}
                trainingState={trainingState}
                ownerEmail={ownerEmail}
                fieldLabel={field.fieldLabel}
                onChangeSession={onChangeSession}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function WorkshopRegistrationRoster({ trainingProgress, trainingModules }) {
  const workshopTitles = listWorkshopRegistrationModuleTitles();
  const moduleByTitle = new Map(
    workshopTitles
      .map((title) => [title, findModuleByTitle(trainingModules, title)])
      .filter(([, module]) => module)
  );

  if (!moduleByTitle.size) return null;

  const rows = (trainingProgress || [])
    .map((participant) => {
      const sessions = {};
      let hasAny = false;
      for (const [title, module] of moduleByTitle.entries()) {
        const raw = String(participant?.trainingState?.[`${module.id}Date`] || "").trim();
        const label = formatWorkshopSessionLabel(raw, title);
        sessions[title] = label;
        if (label) hasAny = true;
      }
      return {
        id: participant.id || participant.email,
        name: participant.name || participant.email || "Worker",
        email: participant.email || "",
        sessions,
        hasAny,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return (
    <div className="tripTrainingWorkshopRoster">
      <div className="small tripTrainingResourcesColumnHeading">Training registration</div>
      <div className="tripTrainingWorkshopRosterScroller">
        <table className="table dataTableStriped tripTrainingWorkshopRosterTable">
          <thead>
            <tr>
              <th>Name</th>
              {workshopTitles.map((title) => (
                <th key={title}>{title === "EndMeeting" ? "End meeting" : title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{row.name}</div>
                    {row.email ? (
                      <div className="small" style={{ color: "var(--muted)" }}>
                        {row.email}
                      </div>
                    ) : null}
                  </td>
                  {workshopTitles.map((title) => (
                    <td key={`${row.id}-${title}`} className="small">
                      {row.sessions[title] || (
                        <span style={{ color: "var(--muted)" }}>Not set</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={workshopTitles.length + 1} className="small">
                  No workers on this trip yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TripTrainingResourcesLayout({
  requiredTrainingResources = [],
  optionalTrainingResources = [],
  trainingModules = [],
  trainingState = {},
  ownerEmail = "",
  canEditRegistration = false,
  canViewRegistrationRoster = false,
  trainingProgress = [],
  onChangeSession,
}) {
  return (
    <div className="tripTrainingResourcesStacked">
      <div>
        <div className="small tripTrainingResourcesColumnHeading">Required training</div>
        <div className="tripTrainingResourceGrid">
          {requiredTrainingResources.map((resource) => (
            <RequiredTrainingResourceBlock
              key={resource.id}
              resource={resource}
              trainingModules={trainingModules}
              trainingState={trainingState}
              ownerEmail={ownerEmail}
              canEditRegistration={canEditRegistration}
              onChangeSession={onChangeSession}
            />
          ))}
        </div>
        {canViewRegistrationRoster ? (
          <WorkshopRegistrationRoster
            trainingProgress={trainingProgress}
            trainingModules={trainingModules}
          />
        ) : null}
      </div>

      <div>
        <div className="small tripTrainingResourcesColumnHeading">Optional</div>
        <div className="tripTrainingOptionalGrid">
          {optionalTrainingResources.map((resource) => (
            <TrainingResourceLink key={resource.id} resource={resource} />
          ))}
        </div>
      </div>
    </div>
  );
}
