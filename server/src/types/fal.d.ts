declare module 'fal' {
  export interface FalConfig {
    credentials: string;
  }

  export function config(config: FalConfig): void;

  export interface FalResult<T = any> {
    data: T;
    requestId: string;
  }

  export function run<T = any>(
    modelId: string,
    args?: any
  ): Promise<T>;
}
