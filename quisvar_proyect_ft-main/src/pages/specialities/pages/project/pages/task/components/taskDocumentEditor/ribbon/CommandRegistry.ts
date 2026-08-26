import type { RibbonCommandDefinition } from './ribbonTypes';

export class CommandRegistry<TContext> {
  private readonly definitions = new Map<string, RibbonCommandDefinition<TContext, unknown>>();

  constructor(private readonly getContext: () => TContext) {}

  register<TPayload>(definition: RibbonCommandDefinition<TContext, TPayload>) {
    if (this.definitions.has(definition.id)) {
      throw new Error(`El comando de cinta "${definition.id}" ya está registrado.`);
    }
    this.definitions.set(
      definition.id,
      definition as RibbonCommandDefinition<TContext, unknown>
    );
    return this;
  }

  registerMany(definitions: RibbonCommandDefinition<TContext, unknown>[]) {
    definitions.forEach(definition => this.register(definition));
    return this;
  }

  has(id: string) {
    return this.definitions.has(id);
  }

  get(id: string) {
    return this.definitions.get(id);
  }

  canExecute(id: string, payload?: unknown) {
    const definition = this.require(id);
    return definition.canExecute?.(this.getContext(), payload) ?? true;
  }

  isActive(id: string) {
    return this.require(id).isActive?.(this.getContext()) ?? false;
  }

  isMixed(id: string) {
    return this.require(id).isMixed?.(this.getContext()) ?? false;
  }

  currentValue(id: string) {
    return this.require(id).currentValue?.(this.getContext());
  }

  disabledReason(id: string) {
    const definition = this.require(id);
    if (this.canExecute(id)) return undefined;
    return definition.disabledReason?.(this.getContext()) ?? 'Este comando no está disponible en la selección actual.';
  }

  pending(id: string) {
    return this.require(id).pending?.(this.getContext()) ?? false;
  }

  async execute(id: string, payload?: unknown) {
    const definition = this.require(id);
    const context = this.getContext();
    if (!(definition.canExecute?.(context, payload) ?? true)) return false;
    await definition.execute(context, payload);
    return true;
  }

  entries() {
    return [...this.definitions.values()];
  }

  private require(id: string) {
    const definition = this.definitions.get(id);
    if (!definition) throw new Error(`El comando de cinta "${id}" no está registrado.`);
    return definition;
  }
}

