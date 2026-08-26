import { Prisma } from '@prisma/client';
import AppError from '@/utils/appError';

export default Prisma.defineExtension(client => {
  return client.$extends({
    query: {
      mealOrderOnUsers: {
        async create({ args, query }) {
          const mealOrderId = args.data?.mealOrderId;

          if (mealOrderId) {
            const mealOrder = await client.mealOrder.findUnique({
              where: { id: mealOrderId },
              select: { isClose: true },
            });

            if (mealOrder?.isClose) {
              throw new AppError(
                'La orden está cerrada y no se puede modificar.',
                409
              );
            }
          }

          return query(args);
        },
        async update({ args, query }) {
          const mealOrderId = args.data?.mealOrderId;
          console.log('entre aqui');

          if (mealOrderId) {
            if (typeof mealOrderId !== 'number')
              throw new AppError('mealOrderId debe ser un número.', 400);
            const mealOrder = await client.mealOrder.findUnique({
              where: { id: mealOrderId },
              select: { isClose: true },
            });

            if (mealOrder?.isClose) {
              throw new AppError(
                'La orden está cerrada y no se puede modificar.',
                409
              );
            }
          }

          return query(args);
        },
        async upsert({ args, query }) {
          const mealOrderId =
            args.create?.mealOrderId || args.update?.mealOrderId;

          if (mealOrderId) {
            if (typeof mealOrderId !== 'number')
              throw new AppError('mealOrderId debe ser un número.', 400);
            const mealOrder = await client.mealOrder.findUnique({
              where: { id: mealOrderId },
              select: { isClose: true },
            });

            if (mealOrder?.isClose) {
              throw new AppError(
                'La orden está cerrada y no se puede modificar.',
                409
              );
            }
          }

          return query(args);
        },
      },
    },
  });
});

// export const mealOrderOnUsersExtension;
