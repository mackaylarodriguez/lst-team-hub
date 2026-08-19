/** Staff-led / external training links shown on trip Training and staff /training demo. */

export const BASIC_TRAINING_URL =
  "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=134&";
export const GATEWAY_TRAINING_URL =
  "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=136&";
export const ADVANCED_TRAINING_URL =
  "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=135&";
export const LST_CONNECT_URL =
  "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=133&";

/** Resource card id → workshop module titles that get a “date registered” session select. */
export const WORKSHOP_REGISTRATION_MODULES_BY_RESOURCE_ID = {
  basic: [{ title: "Basic Training", fieldLabel: "Date registered" }],
  "gateway-endmeetings": [
    { title: "Gateway Training", fieldLabel: "Gateway registered" },
    { title: "EndMeeting", fieldLabel: "EndMeeting registered" },
  ],
};

export function getTrainingResources() {
  return [
    {
      id: "basic",
      group: "required",
      title: "Basic Training",
      descriptionBullets: [
        "Required for new workers",
        "Everyone is encouraged to do it",
        "Teaches you how to lead good reading sessions",
        "You can do this anytime before your trip",
      ],
      url: BASIC_TRAINING_URL,
      icon: "BT",
      accent: "#43a4d5",
    },
    {
      id: "gateway-endmeetings",
      group: "required",
      title: "Gateway Training & EndMeetings",
      descriptionBullets: [
        "Required for the whole team",
        "Try to attend as a team",
        "Gateway: do this 1-2 months before your trip",
        "EndMeeting: do this the month after you return",
      ],
      url: GATEWAY_TRAINING_URL,
      icon: "GT",
      accent: "#16a34a",
    },
    {
      id: "optional",
      group: "optional",
      title: "Advanced Training",
      description:
        "Optional workshops offered through the year, mainly for experienced Workers.",
      url: ADVANCED_TRAINING_URL,
      icon: "AT",
      accent: "#9333ea",
    },
    {
      id: "lst-connect",
      group: "optional",
      title: "LST Connect",
      description:
        "Join LST Connect to practice with an online Reader before leaving. Register as a Worker.",
      url: LST_CONNECT_URL,
      icon: "LC",
      accent: "#eab308",
    },
  ];
}

export function getRequiredTrainingResources() {
  return getTrainingResources().filter((resource) => resource.group === "required");
}

export function getOptionalTrainingResources() {
  return getTrainingResources().filter((resource) => resource.group === "optional");
}

export function getWorkshopRegistrationFieldsForResource(resourceId) {
  return WORKSHOP_REGISTRATION_MODULES_BY_RESOURCE_ID[String(resourceId || "").trim()] || [];
}

/** Canonical workshop titles used for registration tracking + meetings. */
export function listWorkshopRegistrationModuleTitles() {
  const titles = [];
  for (const fields of Object.values(WORKSHOP_REGISTRATION_MODULES_BY_RESOURCE_ID)) {
    for (const field of fields) {
      if (field?.title && !titles.includes(field.title)) titles.push(field.title);
    }
  }
  return titles;
}
