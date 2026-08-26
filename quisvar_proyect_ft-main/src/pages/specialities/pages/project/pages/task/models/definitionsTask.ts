interface StatusBody {
  [category: string]: {
    [role: string]: {
      [state: string]: {
        status: string;
      };
    };
  };
}
export const STATUS_BODY: StatusBody = {
  ASIG: {
    EMPLOYEE: {
      UNRESOLVED: {
        status: 'PROCESS',
      },
      PROCESS: {
        status: 'INREVIEW',
      },
      DENIED: {
        status: 'INREVIEW',
      },
    },
    SUPERADMIN: {
      INREVIEW: {
        status: 'DONE',
      },
      DONE: {
        status: 'LIQUIDATION',
      },
    },
  },
  DENY: {
    EMPLOYEE: {
      PROCESS: {
        status: 'UNRESOLVED',
      },
    },
    SUPERADMIN: {
      INREVIEW: {
        status: 'DENIED',
      },
      PROCESS: {
        status: 'UNRESOLVED',
      },
    },
  },
};
