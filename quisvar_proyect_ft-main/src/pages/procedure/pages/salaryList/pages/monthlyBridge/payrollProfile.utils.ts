type PayrollUserName = {
  profile?: {
    firstName: string;
    lastName: string;
  } | null;
};

export const getPayrollUserFullName = (user?: PayrollUserName | null) =>
  user?.profile ? `${user.profile.firstName} ${user.profile.lastName}` : '---';
