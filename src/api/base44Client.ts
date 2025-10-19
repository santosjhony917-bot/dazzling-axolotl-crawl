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

export const base44 = {
  auth: {
    updateMe: mockUpdateMe,
    me: mockMe,
  },
};