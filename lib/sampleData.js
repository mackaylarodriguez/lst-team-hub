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
      dates: "Junçe 12–27, 2026",
      location: "Florianópolis, Brazil",
      staffLead: "Mackayla Rodriguez",
      staffEmail: "mack@lst.org",
      participants: [
        { name: "Jordan Lee", email: "leader@utaustin.edu", role: "Leader", fundraisingUrl: "https://example.com/fund/jordan" },
        { name: "Avery Chen", email: "participant@utaustin.edu", role: "Participant", fundraisingUrl: "https://example.com/fund/avery" },
        { name: "Sam Patel", email: "sam@utaustin.edu", role: "Participant", fundraisingUrl: "https://example.com/fund/sam" },
        { name: "Riley Martinez", email: "riley@utaustin.edu", role: "Participant", fundraisingUrl: "https://example.com/fund/riley" },
      ],
      quickLinks: [
        { label: "Canvas Training", url: "https://canvas.example.com/course/123" },
        { label: "Fundraising Portal", url: "https://lst.app.neoncrm.com/np/clients/lst/donation.jsp?campaign=135" },
        { label: "Travel Guidelines (PDF)", url: "https://example.com/travel-guidelines.pdf" },
      ],
      tasks: [
        { id: "t1", title: "Has access to training platform and has started training", due: "May 1, 2026" },
        { id: "t2", title: "Has passport good for 3-6 months after end of LST Project", due: "May 10, 2026" },
        { id: "t3", title: "Has visa or other entry requirements", due: "May 20, 2026" },
        { id: "t4", title: "Fundraising: $2,000 raised", due: "May 22, 2026" },
        { id: "t5", title: "Fundraising: All raised", due: "May 22, 2026" },
        { id: "t6", title: "Fundraising: Thank you to donors", due: "May 22, 2026" },
        { id: "t7", title: "Received and has reviewed Project Management Checklist", due: "May 22, 2026" },
        { id: "t8", title: "Our team has introduced ourselves to our Host (via Zoom, WhatsApp, email, etc.)", due: "May 22, 2026" },
        { id: "t9", title: "Travel: Provided info LST needs for ticketing", due: "May 22, 2026" },
        { id: "t10", title: "Travel: Received my tickets", due: "May 22, 2026" },
        { id: "t11", title: "Signed LST Waiver", due: "May 22, 2026" },
        { id: "t12", title: "Signed up to STEP (U.S. Dept. of State)", due: "May 22, 2026" },
        { id: "t13", title: "Completed all LST Training", due: "May 22, 2026" },
      ],
      docs: [
        { name: "Packing List.pdf", date: "Mar 1, 2026", status: "Approved" },
        { name: "Team Covenant.docx", date: "Mar 1, 2026", status: "Pending" },
      ],
    },
  ],
};

export function getUser(email) {
  return SAMPLE.users.find(u => u.email.toLowerCase() === String(email).toLowerCase()) || null;
}

export function getTrip(tripId) {
  return SAMPLE.trips.find(t => t.id === tripId) || null;
}
