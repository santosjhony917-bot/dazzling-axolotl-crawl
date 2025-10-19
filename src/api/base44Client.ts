// Mock API client to simulate user profile updates.
const mockUpdateMe = async (data: { onboarding_completed: boolean }) => {
  console.log("Mock API: Updating user with", data);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true };
};

export const base44 = {
  auth: {
    updateMe: mockUpdateMe,
  },
};