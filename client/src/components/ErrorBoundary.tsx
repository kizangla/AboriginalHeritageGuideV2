import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
          <AlertTriangle className="h-12 w-12 text-earth-terracotta" />
          <h2 className="text-heading-3 font-semibold text-foreground">Something went wrong</h2>
          <p className="text-body-sm text-muted-foreground max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button onClick={this.handleReset} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function MapErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-muted/50 gap-4">
      <AlertTriangle className="h-16 w-16 text-earth-terracotta" />
      <h2 className="text-heading-2 font-semibold">Map failed to load</h2>
      <p className="text-muted-foreground">Please refresh the page to try again</p>
      <Button onClick={() => window.location.reload()} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Refresh page
      </Button>
    </div>
  );
}
