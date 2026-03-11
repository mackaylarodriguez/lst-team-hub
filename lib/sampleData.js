import { STAFF_TASK_TEMPLATE } from "./staffTaskTemplate";
export const SAMPLE = {
  users: [
    { email: "mack@lst.org", name: "Mackayla Rodriguez", role: "staff" },
    { email: "leader@utaustin.edu", name: "Jordan Lee", role: "leader" },
    { email: "participant@utaustin.edu", name: "Avery Chen", role: "participant" },
  ],
  trips: [
    {
      id: "brazil-jun-2026-uta",
      name: "UT Austin – Brazil",
      dates: "June 12–27, 2026",
      location: "Florianópolis, Brazil",
      staffLead: "Mackayla Rodriguez",
      staffEmail: "mack@lst.org",
      participants: [
        { name: "Jordan Lee", email: "leader@utaustin.edu", role: "Leader", fundraisingUrl: "https://example.com/fund/jordan", fundraisingRaised: 4200, fundraisingGoal: 5000 },
        { name: "Avery Chen", email: "participant@utaustin.edu", role: "Participant", fundraisingUrl: "https://example.com/fund/avery", fundraisingRaised: 3500, fundraisingGoal: 5000 },
        { name: "Sam Patel", email: "sam@utaustin.edu", role: "Participant", fundraisingUrl: "https://example.com/fund/sam", fundraisingRaised: 2700, fundraisingGoal: 5000 },
        { name: "Riley Martinez", email: "riley@utaustin.edu", role: "Participant", fundraisingUrl: "https://example.com/fund/riley", fundraisingRaised: 5000, fundraisingGoal: 5000 },
      ],
      quickLinks: [
        { label: "Canvas Training", url: "https://canvas.example.com/course/123" },
        { label: "Fundraising Portal", url: "https://lst.app.neoncrm.com/np/clients/lst/donation.jsp?campaign=135" },
        { label: "Travel Guidelines (PDF)", url: "https://example.com/travel-guidelines.pdf" },
      ],
      tasks: [
        { id: "t0", title: "Fill out LST application", due: "January 1, 2026"},
        { id: "t1", title: "Has access to training platform and has started training", due: "May 1, 2026" },
        { id: "t2", title: "Has passport good for 3-6 months after end of LST Project", due: "May 10, 2026" },
        { id: "t3", title: "Has visa or other entry requirements", due: "May 20, 2026" },
        { id: "t4", title: "Fundraising: $2,000 raised", due: "May 22, 2026" },
        { id: "t5", title: "Fundraising: All raised", due: "May 22, 2026" },
        { id: "t6", title: "Fundraising: Thank you to donors", due: "May 22, 2026" },
        { id: "t7", title: "Received and has reviewed Project Management Checklist (see above for link)", due: "May 22, 2026" },
        { id: "t8", title: "Our team has introduced ourselves our Host (via Zoom, WhatsApp, email, etc.)", due: "May 22, 2026" },
        { id: "t9", title: "Travel: provided info LST needs for ticketing (LST triggers this 60+ days prior to travel)", due: "May 22, 2026" },
        { id: "t10", title: "Travel: received and proofread my tickets", due: "May 22, 2026" },
        { id: "t11", title: "Signed and returned LST Waiver", due: "May 22, 2026" },
        { id: "t12", title: "Received travel insurance from LST", due: "May 22, 2026" },
        { id: "t13", title: "Received budget spreadsheet", due: "May 22, 2026" },
        { id: "t14", title: "Received statistic spreadsheet", due: "May 22, 2026" },
        { id: "t15", title: "Received project materials from LST (workbooks, etc.)", due: "May 22, 2026" },
        { id: "t16", title: "Received team budget check from LST", due: "May 22, 2026" },
        { id: "t17", title: "Signed up to STEP (US Dept. of State)", due: "May 22, 2026" },
        { id: "t18", title: "Completed all LST training (Canvas, Basic, etc.)", due: "May 22, 2026" },
      ],
      docs: [
        { name: "Packing List.pdf", date: "Mar 1, 2026", status: "Approved" },
        { name: "Team Covenant.docx", date: "Mar 1, 2026", status: "Pending" },
      ],
    },
  ].map(applyStaffTemplateIfMissing),
};

export function getUser(email) {
  return SAMPLE.users.find(u => u.email.toLowerCase() === String(email).toLowerCase()) || null;
}

export function getTrip(tripId) {
  return SAMPLE.trips.find(t => t.id === tripId) || null;
}
function applyStaffTemplateIfMissing(trip) {
  if (Array.isArray(trip.staffTasks) && trip.staffTasks.length > 0) return trip;

  const staffTasks = STAFF_TASK_TEMPLATE.map((t) => ({
    id: `${trip.id}-${t.id}`,
    workArea: t.workArea,
    sequence: t.sequence,
    taskName: t.taskName,
    assignedTo: t.assignedTo,
    progress: t.progress || "Not started",
    dueDate: t.dueDate || "",
    notes: t.notes || "",
  }));

  return { ...trip, staffTasks };
}
