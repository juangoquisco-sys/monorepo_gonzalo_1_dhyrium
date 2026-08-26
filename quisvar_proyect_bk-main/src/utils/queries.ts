import { FeedbackType, Files, Mail, Prisma } from '@prisma/client';
import { ProfileByRoleType } from '@/types/types';

class Queries {
  static selectProfileUser = {
    select: {
      id: true,
      ruc: true,
      address: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          dni: true,
          phone: true,
          degree: true,
          description: true,
          job: true,
        },
      },
    },
  };
  static selectProfileUserForStage = {
    select: {
      id: true,
      role: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          dni: true,
          phone: true,
          job: true,
          degree: true,
          description: true,
        },
      },
    },
  };
  static selectProfileShort = {
    select: {
      id: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          dni: true,
          description: true,
          degree: true,
        },
      },
    },
  };

  static includeSubtask = {
    Levels: {
      select: {
        id: true,
        levelList: true,
        stages: {
          select: {
            group: { select: { groups: { where: { mod: true }, take: 1 } } },
          },
        },
      },
    },
    mods: this.selectProfileShort,
    users: {
      select: {
        id: true,
        percentage: true,
        assignedAt: true,
        finishedAt: true,
        groupId: true,
        status: true,
        statusPayment: true,
        user: { select: { status: true, ...this.selectProfileShort.select } },
      },
    },
    feedBacks: {
      take: 1,
      orderBy: { createdAt: 'desc' as 'asc' | 'desc' },
      include: {
        files: {
          select: {
            id: true,
            dir: true,
            name: true,
            type: true,
            originalname: true,
          },
        },
      },
    },
    files: {
      where: { type: { not: 'REVIEW' as Files['type'] } },
      select: {
        id: true,
        dir: true,
        name: true,
        type: true,
        originalname: true,
      },
    },
  };

  static selectedFeedbacks<T>(name: T, type?: FeedbackType) {
    // const type: FeedbackType = 'ACCEPTED';
    const feedback = type ? { type } : undefined;
    const createdAt: Prisma.SortOrder = 'desc';
    return {
      feedBacks: {
        select: { files: { where: { name, feedback } } },
        take: 1,
        orderBy: { createdAt },
      },
    };
  }

  static includeBasictask = {
    Levels: {
      select: {
        id: true,
        levelList: true,
        stages: {
          select: {
            group: { select: { groups: { where: { mod: true }, take: 1 } } },
          },
        },
      },
    },
    mods: this.selectProfileShort,
    users: {
      where: { user: { status: true } },
      select: {
        id: true,
        percentage: true,
        assignedAt: true,
        groupId: true,
        status: true,
        user: {
          select: {
            id: true,
            status: true,
            profile: {
              select: { firstName: true, lastName: true, dni: true },
            },
          },
        },
      },
    },
    files: {
      where: { type: { not: 'REVIEW' as Files['type'] } },
      select: {
        id: true,
        dir: true,
        name: true,
        type: true,
        originalname: true,
      },
    },
    feedBacks: {
      take: 1,
      orderBy: { createdAt: 'desc' as 'asc' | 'desc' },
      include: {
        files: {
          select: {
            id: true,
            dir: true,
            name: true,
            type: true,
            originalname: true,
          },
        },
      },
    },
  };

  static selectSpecialist = {
    select: {
      career: true,
      name: true,
      phone: true,
      cip: true,
      dni: true,
      pdf: true,
    },
  };

  static selectCompany = {
    select: {
      // id: true,
      name: true,
      manager: true,
      percentage: true,
      ruc: true,
    },
  };

  static selectConsortium = {
    select: {
      // id: true,
      manager: true,
      name: true,
      companies: this.selectCompany,
    },
  };

  static selectSubtaskDetails = {
    select: {
      id: true,
      item: true,
      name: true,
      description: true,
      price: true,
      status: true,
      users: {
        select: {
          percentage: true,
          user: this.selectProfileUser,
        },
      },
    },
  };

  static selectDuplicateLevelSubtasks = {
    select: {
      id: true,
      hours: true,
      item: true,
      name: true,
      price: true,
      files: {
        where: { type: 'MATERIAL' },
      },
    },
  };

  static selectContractStage = {
    select: {
      createdAt: true,
      cui: true,
      department: true,
      details: true,
      difficulty: true,
      district: true,
      id: true,
      name: true,
      projectId: true,
      projectName: true,
      province: true,
      projectShortName: true,
    },
  };

  static selectContract = {
    select: {
      createdAt: true,
      cui: true,
      amount: true,
      department: true,
      municipality: true,
      difficulty: true,
      district: true,
      id: true,
      name: true,
      indexContract: true,
      projectId: true,
      projectName: true,
      type: true,
      province: true,
      projectShortName: true,
      consortiumId: true,
      companyId: true,
      contractNumber: true,
      phases: true,
    },
  };

  static selectFiles = {
    select: { id: true, name: true, dir: true, originalname: true },
  };
  static PayMail(): PayMailQueries {
    return new PayMailQueries();
  }

  static selectProfileByRole({
    subMenuId: id,
    menuId,
    typeRol,
  }: ProfileByRoleType) {
    return {
      select: {
        id: true,
        ruc: true,
        address: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            dni: true,
            phone: true,
            degree: true,
            description: true,
            job: true,
          },
        },
        role: {
          select: {
            menuPoints: {
              select: {
                subMenuPoints: { where: { id, typeRol, menuId } },
              },
            },
          },
        },
      },
    };
  }

  static includeRole = {
    include: {
      menuPoints: {
        select: {
          id: true,
          menuId: true,
          typeRol: true,
          subMenuPoints: {
            select: {
              id: true,
              menuId: true,
              typeRol: true,
            },
          },
        },
      },
    },
  };
}

class PayMailQueries {
  /**
   * @deprecated
   */
  public selectMessage(role?: Mail['role'], type?: Mail['type']) {
    return {
      select: {
        id: true,
        header: true,
        status: true,
        type: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        onHolding: true,
        historyOfficesIds: true,
        office: true,
        beforeOffice: true,
        onHoldingDate: true,
        comment: true,
        // report: {
        //   select: {
        //     id: true,
        //   },
        // },
        users: {
          where: { type, role },
          select: {
            type: true,
            role: true,
            status: true,
            userInit: true,
            user: Queries.selectProfileUser,
          },
        },
      },
    };
  }

  public _selectMessage() {
    return {
      include: {
        report: {
          select: {
            id: true,
            payrollId: true,
          },
        },
        office: true,
        users: {
          select: {
            type: true,
            role: true,
            status: true,
            userInit: true,
            user: Queries.selectProfileUser,
          },
        },
      },
    };
  }

  public selectMessageByMail(role: Mail['role'], type?: Mail['type']) {
    return {
      select: {
        id: true,
        header: true,
        status: true,
        type: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        onHolding: true,
        onHoldingDate: true,
        users: {
          where: { type, role },
          select: {
            type: true,
            role: true,
            status: true,
            userInit: true,
            user: Queries.selectProfileUser,
          },
        },
      },
    };
  }
}

export default Queries;
