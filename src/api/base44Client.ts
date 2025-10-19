// Mock API client to simulate user profile updates.

// Let's store a mock user in memory for this session.
let mockUser: { user_role?: 'customer' | 'restaurant', onboarding_completed?: boolean } | null = null;

const mockUpdateMe = async (data: { onboarding_completed?: boolean, user_role?: 'customer' | 'restaurant' }) => {
  console.log("Mock API: Updating user with", data);
  if (!mockUser) {
    mockUser = {};
  }
  Object.assign(mockUser, data);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true };
};

const mockMe = async () => {
    console.log("Mock API: Fetching user");
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    if (mockUser && mockUser.user_role) {
        return mockUser;
    }
    // Simulate user not being logged in or not having a role
    throw new Error("User not found or role not set.");
}

const mockSendEmail = async (data: { to: string; subject: string; body: string }) => {
  console.log(`Mock API: Sending email to ${data.to} with subject "${data.subject}"`);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
  return { success: true };
};

const mockClearRole = async () => {
  console.log("Mock API: Clearing user role");
  if (mockUser) {
    mockUser.user_role = undefined;
  }
  await new Promise(resolve => setTimeout(resolve, 100));
  return { success: true };
};

export const base44 = {
  auth: {
    updateMe: mockUpdateMe,
    me: mockMe,
    clearRole: mockClearRole,
  },
  integrations: {
    Core: {
      SendEmail: mockSendEmail,
    },
  },
};