import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { orderSimulatorDefaults } from './comeyaMarketData';

const round2 = (value: number) => Math.round(value * 100) / 100;

const fields: Array<{ key: keyof typeof orderSimulatorDefaults; label: string; step: number; suffix?: string }> = [
  { key: 'productPrice', label: 'Precio del producto en el local (S/)', step: 0.5 },
  { key: 'packagingCost', label: 'Costo de empaque (S/)', step: 0.5 },
  { key: 'commissionPct', label: 'Comisión de ComeYa al restaurante', step: 0.01, suffix: '%' },
  { key: 'deliveryFee', label: 'Tarifa de delivery cobrada al cliente (S/)', step: 0.5 },
  { key: 'courierPay', label: 'Pago al repartidor por entrega (S/)', step: 0.5 },
  { key: 'serviceFee', label: 'Tarifa de servicio cobrada al cliente (S/)', step: 0.5 },
  { key: 'gatewayPct', label: 'Comisión de pasarela de pago', step: 0.005, suffix: '%' },
  { key: 'gatewayFixed', label: 'Comisión fija de pasarela (S/)', step: 0.1 },
  { key: 'monthlyFixedCosts', label: 'Costos fijos mensuales de ComeYa (S/)', step: 100 },
];

export function OrderMarginSimulator() {
  const [inputs, setInputs] = useState(orderSimulatorDefaults);

  const result = useMemo(() => {
    const appProductPrice = inputs.productPrice + inputs.packagingCost;
    const customerTotal = appProductPrice + inputs.deliveryFee + inputs.serviceFee;
    const restaurantCommission = round2(inputs.productPrice * inputs.commissionPct);
    const restaurantReceives = appProductPrice - restaurantCommission;
    const courierReceives = inputs.courierPay;
    const comeyaGross = customerTotal - restaurantReceives - courierReceives;
    const gatewayCommission = round2(customerTotal * inputs.gatewayPct + inputs.gatewayFixed);
    const netMargin = round2(comeyaGross - gatewayCommission);
    const marginOverTotal = customerTotal > 0 ? netMargin / customerTotal : 0;
    const ordersMonthly = netMargin > 0 ? Math.ceil(inputs.monthlyFixedCosts / netMargin) : 0;
    const ordersDaily = ordersMonthly > 0 ? Math.ceil(ordersMonthly / 30) : 0;
    return { appProductPrice, customerTotal, restaurantCommission, restaurantReceives, courierReceives, comeyaGross, gatewayCommission, netMargin, marginOverTotal, ordersMonthly, ordersDaily };
  }, [inputs]);

  const split = [
    { name: 'Restaurante', value: round2(result.restaurantReceives), fill: '#e34b2e' },
    { name: 'Repartidor', value: round2(result.courierReceives), fill: '#f59e0b' },
    { name: 'ComeYa (neto)', value: Math.max(result.netMargin, 0), fill: '#059669' },
    { name: 'Pasarela', value: round2(result.gatewayCommission), fill: '#64748b' },
  ];

  return <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => <label key={field.key} className="text-sm font-medium">
        {field.label}
        <input
          type="number"
          step={field.step}
          value={field.suffix === '%' ? inputs[field.key] * 100 : inputs[field.key]}
          onChange={(event) => {
            const raw = Number(event.target.value);
            const value = field.suffix === '%' ? raw / 100 : raw;
            setInputs((current) => ({ ...current, [field.key]: Number.isFinite(value) ? value : 0 }));
          }}
          className="mt-2 block w-full rounded-md border px-3 py-2 font-normal"
        />
      </label>)}
    </div>
    <div className="rounded-md bg-muted/40 p-4">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Total que paga el cliente</span><b>S/ {result.customerTotal.toFixed(2)}</b></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Recibe el restaurante</span><b>S/ {result.restaurantReceives.toFixed(2)}</b></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Recibe el repartidor</span><b>S/ {result.courierReceives.toFixed(2)}</b></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Comisión de pasarela</span><b>S/ {result.gatewayCommission.toFixed(2)}</b></div>
        <div className="flex justify-between border-t pt-2 text-base"><span>Margen neto de ComeYa por pedido</span><b className={result.netMargin >= 0 ? 'text-emerald-700' : 'text-red-600'}>S/ {result.netMargin.toFixed(2)}</b></div>
        <div className="flex justify-between text-xs text-muted-foreground"><span>Margen sobre el total pagado</span><span>{(result.marginOverTotal * 100).toFixed(1)}%</span></div>
      </div>
      <div className="mt-4 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={split} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value) => `S/ ${Number(value).toFixed(2)}`} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {split.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 rounded-md bg-background p-3 text-sm">
        {result.netMargin > 0
          ? <>Con este margen, ComeYa necesita <b>{result.ordersMonthly.toLocaleString('es-PE')} pedidos/mes</b> (≈ <b>{result.ordersDaily} pedidos/día</b>) para cubrir S/ {inputs.monthlyFixedCosts.toLocaleString('es-PE')} de costos fijos.</>
          : <>Con estos supuestos el margen neto es negativo: este pedido no ayuda a cubrir costos fijos. Prueba subir la comisión o el precio del producto.</>}
      </p>
    </div>
  </div>;
}
