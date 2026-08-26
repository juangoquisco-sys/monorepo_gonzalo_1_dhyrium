import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { captureException } from '@/lib/frontendLogger';
import { loader$ } from '@/services/sharingSubject';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    loader$.setSubject = false;
    captureException({
      error,
      type: 'REACT_RENDER_ERROR',
      level: 'critical',
      componentStack: errorInfo.componentStack || undefined,
      context: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <Card className="w-full max-w-md">
            <CardContent className="space-y-4 p-6 text-center">
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-secondary">
                  Ocurrio un problema inesperado
                </h1>
                <p className="text-sm text-muted-foreground">
                  Ya registramos el error para que el equipo tecnico pueda
                  revisarlo.
                </p>
              </div>
              <Button type="button" onClick={this.handleReload}>
                Recargar sistema
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
