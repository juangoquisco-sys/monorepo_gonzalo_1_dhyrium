import assert from 'node:assert/strict';
import test from 'node:test';
import { MenuPoints } from '../src/models/menuPoints';
import roleMiddleware from '../src/middlewares/role.middleware';

const menus = new MenuPoints().getMenuPoints();

test('keeps movable permissions independent from their navigation placement', () => {
  const procedures = menus.find(menu => menu.route === 'tramites');
  const payroll = procedures?.menu?.find(menu => menu.route === 'planilla');
  const departures = procedures?.menu?.find(menu => menu.route === 'salidas');

  assert.equal(payroll?.permissionKey, 'payroll.access');
  assert.deepEqual(payroll?.presentation?.placements, ['user-center', 'sidebar']);
  assert.equal(departures?.permissionKey, 'departures.access');
  assert.deepEqual(departures?.presentation?.placements, ['directive-center']);
});

test('defines custom invoice as an explicit binary module permission', () => {
  const invoice = menus.find(menu => menu.route === 'factura');

  assert.ok(invoice);
  assert.deepEqual(invoice.access, ['MOD']);
  assert.equal(invoice.permissionKey, 'custom-invoice.access');
  assert.deepEqual(invoice.presentation?.placements, ['directive-center']);
});

test('orders the directive modules together without changing their legacy ids', () => {
  const directiveRoutes = menus
    .filter(menu => menu.presentation?.group === 'directive-compliance')
    .map(menu => menu.route);

  assert.deepEqual(directiveRoutes, [
    'control-asistencia',
    'factura',
    'cocina',
    'rotaciones',
    'control-puerta',
  ]);
  assert.equal(menus.find(menu => menu.route === 'control-asistencia')?.id, 4);
  assert.equal(menus.find(menu => menu.route === 'cocina')?.id, 12);
});

test('authorizes departures by its stable legacy permission, not by visual placement', () => {
  const userInfo = {
    role: {
      menuPoints: [
        {
          route: 'tramites',
          typeRol: 'MOD',
          menu: [{ route: 'salidas', typeRol: 'USER' }],
        },
      ],
    },
  } as never;

  assert.equal(
    roleMiddleware.accessMenuPoint(userInfo, ['MOD', 'USER'], 'tramites', 'salidas'),
    true
  );
  assert.equal(
    roleMiddleware.accessMenuPoint(
      userInfo,
      ['MOD', 'USER'],
      'control-asistencia',
      'salidas'
    ),
    false
  );
});

test('defines benefits as an attendance permission in the directive center', () => {
  const attendance = menus.find(menu => menu.route === 'control-asistencia');
  const benefits = attendance?.menu?.find(menu => menu.route === 'beneficios');

  assert.equal(benefits?.permissionKey, 'attendance.benefits');
  assert.deepEqual(benefits?.presentation?.placements, ['user-center']);
});

test('defines Comeya as a sidebar module with a stable permission', () => {
  const comeya = menus.find(menu => menu.route === 'comeya');

  assert.equal(comeya?.permissionKey, 'comeya.access');
  assert.deepEqual(comeya?.presentation?.placements, ['sidebar']);
});

test('defines Datos as a sidebar module with a stable permission', () => {
  const datos = menus.find(menu => menu.route === 'datos');

  assert.equal(datos?.permissionKey, 'data.access');
  assert.deepEqual(datos?.presentation?.placements, ['sidebar']);
});
