import '@/config/env';
import KitchenServices from '@/services/kitchen.services';
import { prisma } from '@/utils/prisma.server';

const apply = process.argv.includes('--apply');

const getArgValue = (name: string) => {
  const prefix = `${name}=`;
  const arg = process.argv.find(value => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
};

const dateFrom = getArgValue('--dateFrom');
const dateTo = getArgValue('--dateTo');

async function preview() {
  const mealOrders = await prisma.mealOrder.findMany({
    where: {
      isClose: true,
      orderDate: KitchenServices.getPastDateRange({ dateFrom, dateTo }),
      mealOrderOnUsers: {
        some: {
          status: true,
          pickupStatus: {
            not: null,
          },
        },
      },
    },
    select: {
      id: true,
      mealOrderOnUsers: {
        where: {
          status: true,
          pickupStatus: null,
        },
        select: {
          userId: true,
        },
      },
    },
  });

  return {
    mealsReviewed: mealOrders.length,
    ordersUpdated: mealOrders.reduce(
      (acc, mealOrder) => acc + mealOrder.mealOrderOnUsers.length,
      0
    ),
  };
}

async function main() {
  const result = apply
    ? await KitchenServices.markPastServedPendingOrdersAsNotPickedUp({
        dateFrom,
        dateTo,
      })
    : await preview();

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        ...result,
      },
      null,
      2
    )
  );
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
