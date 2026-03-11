export const SAMPLE = {
  users: [
    { email: "mackayla.rodriguez", name: "Mackayla Rodriguez", role: "admin" },
    { email: "mack@lst.org", name: "Mackayla Rodriguez", role: "staff" },
    { email: "worker@utaustin.edu", name: "Avery Chen", role: "worker" },
  ],
};

export function getUser(email) {
  return (
    SAMPLE.users.find(
      (user) => user.email.toLowerCase() === String(email).toLowerCase()
    ) || null
  );
}

