/** Staff-led / external training links shown on trip Training and staff /training demo. */

export const TRAINING_ACCESS_URL =
  "https://lst365.sharepoint.com/:w:/g/IQAgtqt1ku4YT7cr5lj-_hO-ATU5X5ep2OOZAJFUnQDhtpE?e=z8Slfm";
export const BASIC_TRAINING_URL =
  "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=134&";
export const GATEWAY_TRAINING_URL =
  "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=136&";
export const ADVANCED_TRAINING_URL =
  "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=135&";
export const LST_CONNECT_URL =
  "https://lst.app.neoncrm.com/np/clients/lst/survey.jsp?surveyId=133&";

export function getTrainingResources() {
  return [
    {
      id: "canvas",
      group: "required",
      title: "On-Demand Training",
      description:
        "Video-based training you can complete on your own schedule via Google Classroom.",
      url: TRAINING_ACCESS_URL,
      icon: "OD",
      accent: "#2563eb",
    },
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
