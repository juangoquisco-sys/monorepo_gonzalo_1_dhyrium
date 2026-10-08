import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import { comeyaCatalogSeed as catalogSeed } from './comeyaCatalogSeed';

const defaultProducts = [
  ['Carta principal', 'Pollo a la brasa familiar', 'Pollo a la brasa', 58.9, true],
  ['Carta principal', 'Lomo saltado', 'Segundos criollos', 32.5, true],
  ['Carta principal', 'Inca Kola 500 ml', 'Bebidas frías', 5, false],
] as const;

class ComeyaMenuService {
  static async ensureCatalog() {
    const categoryNames: string[] = [...new Set(catalogSeed.map(([category]) => category as string))];
    await prisma.comeyaMenuCategory.createMany({ data: categoryNames.map(name => ({ name })), skipDuplicates: true });
    const categories = await prisma.comeyaMenuCategory.findMany({ select: { id: true, name: true } });
    const categoryIds = new Map(categories.map(category => [category.name, category.id]));
    const seedKeys = new Set<string>();
    await Promise.all(catalogSeed.map(async ([category, name, minimumPrice, maximumPrice, suggestedPrice]) => {
      const categoryId = categoryIds.get(category);
      if (!categoryId) throw new AppError('No se encontró la categoría del catálogo.', 500, 'COMEYA_CATEGORY_MISSING');
      seedKeys.add(`${categoryId}::${name}`);
      await prisma.comeyaMenuReference.upsert({
        where: { name_categoryId: { name, categoryId } },
        create: { name, categoryId, minimumPrice, maximumPrice, suggestedPrice },
        update: { minimumPrice, maximumPrice, suggestedPrice },
      });
    }));

    const staleReferences = await prisma.comeyaMenuReference.findMany({ where: { categoryId: { in: [...categoryIds.values()] } }, select: { id: true, name: true, categoryId: true } });
    const staleReferenceIds = staleReferences.filter(reference => !seedKeys.has(`${reference.categoryId}::${reference.name}`)).map(reference => reference.id);
    if (staleReferenceIds.length) await prisma.comeyaMenuReference.deleteMany({ where: { id: { in: staleReferenceIds } } });

    const obsoleteCategories = categories.filter(category => !categoryNames.includes(category.name));
    if (obsoleteCategories.length) {
      await prisma.comeyaMenuCategory.deleteMany({
        where: { id: { in: obsoleteCategories.map(category => category.id) }, references: { none: {} }, products: { none: {} } },
      });
    }

    return categories.filter(category => categoryNames.includes(category.name));
  }

  static async catalog() {
    await this.ensureCatalog();
    return prisma.comeyaMenuCategory.findMany({
      include: { references: { orderBy: [{ name: 'asc' }] } },
      orderBy: { name: 'asc' },
    });
  }

  static async listProducts(restaurantKey: string) {
    const categories = await this.ensureCatalog();
    const count = await prisma.comeyaMenuProduct.count({ where: { restaurantKey } });
    if (!count) {
      const categoryIds = new Map(categories.map(category => [category.name, category.id]));
      await prisma.comeyaMenuProduct.createMany({ data: defaultProducts.map(([menuName, name, category, price, available]) => ({ menuName, name, restaurantKey, categoryId: categoryIds.get(category)!, price, available })), skipDuplicates: true });
    }
    return prisma.comeyaMenuProduct.findMany({ where: { restaurantKey }, include: { category: { select: { id: true, name: true } } }, orderBy: { name: 'asc' } });
  }

  static async createProduct(restaurantKey: string, input: { menuName?: string; name: string; description?: string; categoryId: string; price: number; available?: boolean }) {
    await this.ensureCatalog();
    const category = await prisma.comeyaMenuCategory.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new AppError('La categoría seleccionada no existe.', 400, 'COMEYA_CATEGORY_INVALID');
    return prisma.comeyaMenuProduct.create({ data: { restaurantKey, ...input }, include: { category: { select: { id: true, name: true } } } });
  }

  static async updateProduct(restaurantKey: string, productId: string, input: { menuName?: string; name?: string; description?: string; categoryId?: string; price?: number; available?: boolean }) {
    const existing = await prisma.comeyaMenuProduct.findFirst({ where: { id: productId, restaurantKey } });
    if (!existing) throw new AppError('Producto no encontrado.', 404, 'COMEYA_PRODUCT_NOT_FOUND');
    if (input.categoryId) {
      const category = await prisma.comeyaMenuCategory.findUnique({ where: { id: input.categoryId } });
      if (!category) throw new AppError('La categoría seleccionada no existe.', 400, 'COMEYA_CATEGORY_INVALID');
    }
    return prisma.comeyaMenuProduct.update({ where: { id: productId }, data: input, include: { category: { select: { id: true, name: true } } } });
  }

  static async deleteProduct(restaurantKey: string, productId: string) {
    const existing = await prisma.comeyaMenuProduct.findFirst({ where: { id: productId, restaurantKey } });
    if (!existing) throw new AppError('Producto no encontrado.', 404, 'COMEYA_PRODUCT_NOT_FOUND');
    await prisma.comeyaMenuProduct.delete({ where: { id: productId } });
  }
}

export default ComeyaMenuService;
