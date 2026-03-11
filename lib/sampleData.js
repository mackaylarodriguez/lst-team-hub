export const SAMPLE = {
  users: [
    { email: "mack@lst.org", name: "Mackayla Rodriguez", role: "staff" },
    { email: "leader@utaustin.edu", name: "Jordan Lee", role: "leader" },
    { email: "participant@utaustin.edu", name: "Avery Chen", role: "participant" },
  ],
};

export function getUser(email) {
  return (
    SAMPLE.users.find(
      (user) => user.email.toLowerCase() === String(email).toLowerCase()
    ) || null
  );
}
