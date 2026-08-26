import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureException } from '@/lib/frontendLogger';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import CardErrorBoundary from '@/views/cardErrorBoundary/CardErrorBoundary';
import { loader$ } from '@/services/sharingSubject';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  children: ReactNode;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      children: props.children,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    loader$.setSubject = false;
    SnackbarUtilities.error('Ocurrió un error inesperado.');
    captureException({
      error,
      type: 'REACT_RENDER_ERROR',
      level: 'critical',
      componentStack: errorInfo.componentStack || undefined,
      context: {
        componentStack: errorInfo.componentStack,
      },
    });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  static getDerivedStateFromProps(nextProps: Props, nextState: State) {
    if (nextProps.children !== nextState.children) {
      return { hasError: false, children: nextProps.children }; // Reinicia el error y actualiza los children
    }
    return null;
  }

  render() {
    if (this.state.hasError) {
      return <CardErrorBoundary />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
